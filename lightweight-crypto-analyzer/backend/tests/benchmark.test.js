import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildPlaintext, runBenchmark } from '../src/services/benchmarkService.js';
import { compareResults } from '../src/services/comparisonService.js';
import { ValidationError } from '../src/utils/errors.js';
import { normalizeBenchmarkRequest } from '../src/validators/benchmarkValidator.js';

describe('benchmark request validation', () => {
  test('applies defaults (all algorithms, default variants)', () => {
    const config = normalizeBenchmarkRequest({});
    assert.deepEqual(
      config.targets.map(({ variant }) => variant.name),
      ['PRESENT-80', 'SIMON-64/128', 'SPECK-64/128', 'XTEA-64/128'],
    );
    assert.deepEqual(config.messageSizes, [1024]);
    assert.equal(config.mode.id, 'CBC');
  });

  test('deduplicates and sorts message sizes and targets', () => {
    const config = normalizeBenchmarkRequest({
      targets: [{ algorithm: 'xtea' }, { algorithm: 'XTEA', variant: '64/128' }],
      messageSizes: [1024, 16, 1024],
    });
    assert.equal(config.targets.length, 1);
    assert.deepEqual(config.messageSizes, [16, 1024]);
  });

  test('rejects invalid input', () => {
    const invalid = [
      { iterations: 0 },
      { iterations: 2001 },
      { iterations: 1.5 },
      { warmupIterations: -1 },
      { messageSizes: [] },
      { messageSizes: [0] },
      { messageSizes: [300000] },
      { messageSizes: [1, 2, 3, 4, 5, 6, 7] },
      { messageSizes: [262144], iterations: 100 }, // exceeds the per-algorithm data budget
      { targets: [] },
      { targets: [{ algorithm: 'AES' }] },
      { targets: [{ algorithm: 'SIMON', variant: '128/256' }] },
      { mode: 'GCM' },
      { dataset: 'images' },
      { dataset: 'custom' },
      { dataset: 'custom', customText: 'x'.repeat(5000) },
    ];
    for (const body of invalid) {
      assert.throws(() => normalizeBenchmarkRequest(body), ValidationError, JSON.stringify(body).slice(0, 80));
    }
  });
});

describe('plaintext datasets', () => {
  test('produce exactly the requested size', () => {
    for (const dataset of ['random', 'text', 'sensor', 'custom']) {
      for (const size of [1, 17, 1000]) {
        assert.equal(buildPlaintext(dataset, size, 'abc').length, size);
      }
    }
    assert.equal(buildPlaintext('custom', 7, 'ab').toString(), 'abababa');
  });
});

describe('runBenchmark', () => {
  const report = runBenchmark(
    normalizeBenchmarkRequest({
      targets: [{ algorithm: 'XTEA' }, { algorithm: 'SPECK', variant: '32/64' }, { algorithm: 'PRESENT', variant: '128' }],
      messageSizes: [64, 512],
      iterations: 25,
      warmupIterations: 5,
      mode: 'CBC',
      dataset: 'text',
    }),
  );

  test('returns one verified result per algorithm and message size', () => {
    assert.equal(report.results.length, 6);
    for (const result of report.results) {
      assert.equal(result.status, 'passed', result.error);
      assert.equal(result.roundTrip.passed, true);
      assert.equal(result.roundTrip.verifiedIterations, 25);
      assert.equal(result.encrypt.samples, 25);
      assert.equal(result.decrypt.samples, 25);
    }
  });

  test('reports consistent timing statistics', () => {
    for (const { encrypt, decrypt, keySetup } of report.results) {
      for (const stats of [encrypt, decrypt, keySetup]) {
        assert.ok(stats.minMs > 0 && stats.minMs <= stats.medianMs && stats.medianMs <= stats.maxMs);
        assert.ok(stats.minMs <= stats.meanMs && stats.meanMs <= stats.maxMs);
      }
    }
  });

  test('computes throughput from the mean time and the plaintext size', () => {
    for (const result of report.results) {
      const expected = result.messageSize / (result.encrypt.meanMs / 1000);
      assert.ok(Math.abs(result.throughput.encryptBytesPerSec - expected) < 1e-6 * expected);
    }
  });

  test('reports raw ciphertext size including IV and padding', () => {
    const xtea64 = report.results.find((result) => result.algorithm === 'XTEA' && result.messageSize === 64);
    assert.deepEqual(
      { raw: xtea64.ciphertext.rawBytes, iv: xtea64.ciphertext.ivBytes, pad: xtea64.ciphertext.paddingBytes },
      { raw: 8 + 72, iv: 8, pad: 8 },
    );
    const speck64 = report.results.find((result) => result.algorithm === 'SPECK' && result.messageSize === 64);
    assert.equal(speck64.ciphertext.rawBytes, 4 + 68); // 32-bit block
    assert.equal(xtea64.ciphertext.hexChars, 160);
  });

  test('records the conditions and environment needed to judge comparability', () => {
    assert.equal(report.config.iterations, 25);
    assert.ok(report.environment.nodeVersion.startsWith('v'));
    assert.ok(report.timer.resolutionMs > 0);
    for (const result of report.results) {
      assert.equal(result.conditions.runId, report.runId);
      assert.equal(result.conditions.mode, 'CBC');
    }
  });

  test('summary rankings are computed per message size', () => {
    assert.deepEqual(report.summary.bySize.map((group) => group.messageSize), [64, 512]);
    assert.equal(report.summary.passed, 6);
  });

  test('a failed round trip is excluded from comparisons', () => {
    const tampered = structuredClone(report.results);
    tampered[0].status = 'failed';
    tampered[0].roundTrip.passed = false;
    tampered[0].error = 'Round-trip verification failed';
    const comparison = compareResults({ results: tampered });
    assert.equal(comparison.excluded.length, 1);
    const names = comparison.groups.flatMap((group) => group.rows.map((row) => `${row.displayName}@${row.messageSize}`));
    assert.ok(!names.includes(`${tampered[0].displayName}@${tampered[0].messageSize}`));
  });
});
