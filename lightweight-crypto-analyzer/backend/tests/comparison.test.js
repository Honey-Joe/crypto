import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compareResults } from '../src/services/comparisonService.js';
import { ValidationError } from '../src/utils/errors.js';
import { normalizeCompareRequest } from '../src/validators/compareValidator.js';

function timing(ms) {
  return { meanMs: ms, medianMs: ms * 0.9, minMs: ms * 0.8, maxMs: ms * 1.5, stdDevMs: ms * 0.1, samples: 10 };
}

function result({ name, algorithm, enc, dec, ks = 0.01, raw = 1040, roundKeys = 256, size = 1024, blockBits = 64, keyBits = 128, conditions = {} }) {
  return {
    id: `${name}-${size}`,
    algorithm,
    variant: 'x',
    displayName: name,
    blockBits,
    keyBits,
    messageSize: size,
    status: 'passed',
    encrypt: timing(enc),
    decrypt: timing(dec),
    keySetup: timing(ks),
    ciphertext: { rawBytes: raw },
    memory: { roundKeyBytes: roundKeys },
    roundTrip: { passed: true },
    conditions: { runId: 'run-1', iterations: 100, warmupIterations: 10, mode: 'CBC', dataset: 'random', nodeVersion: 'v24', cpuModel: 'cpu', platform: 'win32', ...conditions },
  };
}

const fast = result({ name: 'FAST', algorithm: 'SPECK', enc: 0.01, dec: 0.02, roundKeys: 108 });
const slow = result({ name: 'SLOW', algorithm: 'PRESENT', enc: 0.04, dec: 0.05, keyBits: 80 });
const tiny = result({ name: 'TINY', algorithm: 'SIMON', enc: 0.02, dec: 0.01, raw: 1032, roundKeys: 64, blockBits: 32, keyBits: 64 });

describe('comparison service', () => {
  test('identifies the fastest encryption, decryption and highest throughput', () => {
    const [group] = compareResults({ results: [fast, slow, tiny] }).groups;
    assert.deepEqual(group.winners.encryption.winners, ['FAST']);
    assert.deepEqual(group.winners.decryption.winners, ['TINY']);
    assert.deepEqual(group.winners.throughput.winners, ['FAST']);
    assert.deepEqual(group.winners.ciphertextSize.winners, ['TINY']);
    assert.deepEqual(group.winners.roundKeyMemory.winners, ['TINY']);
  });

  test('reports ties instead of picking an arbitrary winner', () => {
    const [group] = compareResults({ results: [fast, slow] }).groups;
    assert.equal(group.winners.ciphertextSize.tie, true);
    assert.deepEqual(group.winners.ciphertextSize.winners.sort(), ['FAST', 'SLOW']);
  });

  test('uses the selected statistic', () => {
    const [mean] = compareResults({ results: [fast], statistic: 'mean' }).groups;
    const [min] = compareResults({ results: [fast], statistic: 'min' }).groups;
    assert.equal(mean.rows[0].encryption, 0.01);
    assert.equal(min.rows[0].encryption, 0.008);
    assert.ok(Math.abs(min.rows[0].throughput - 1024 / (0.008 / 1000)) < 1e-6);
  });

  test('weights change the overall recommendation', () => {
    const speed = compareResults({ results: [fast, tiny], weights: { encryption: 1, decryption: 0, keySetup: 0, ciphertextSize: 0, roundKeyMemory: 0 } });
    const memory = compareResults({ results: [fast, tiny], weights: { encryption: 0, decryption: 0, keySetup: 0, ciphertextSize: 0, roundKeyMemory: 1 } });
    assert.deepEqual(speed.groups[0].recommendation.best, ['FAST']);
    assert.deepEqual(memory.groups[0].recommendation.best, ['TINY']);
    assert.equal(speed.groups[0].recommendation.score, 100);
  });

  test('flags small blocks and short keys in the security context', () => {
    const [group] = compareResults({ results: [fast, slow, tiny] }).groups;
    assert.ok(group.securityContext.some((note) => note.includes('TINY uses a 32-bit block')));
    assert.ok(group.securityContext.some((note) => note.includes('SLOW uses a 80-bit key')));
    assert.match(compareResults({ results: [fast] }).disclaimer, /not mean more secure/);
  });

  test('groups by message size and warns when conditions differ', () => {
    const other = result({ name: 'FAST', algorithm: 'SPECK', enc: 0.1, dec: 0.1, size: 4096, conditions: { runId: 'run-2', iterations: 50 } });
    const comparison = compareResults({ results: [fast, slow, other] });
    assert.deepEqual(comparison.groups.map((group) => group.messageSize), [1024, 4096]);

    const mixed = result({ name: 'MIXED', algorithm: 'XTEA', enc: 0.03, dec: 0.03, conditions: { runId: 'run-2', iterations: 50, mode: 'CTR' } });
    const [group] = compareResults({ results: [fast, mixed] }).groups;
    assert.ok(group.warnings.some((warning) => warning.includes('iteration counts')));
    assert.ok(group.warnings.some((warning) => warning.includes('modes of operation')));
    assert.ok(group.warnings.some((warning) => warning.includes('separate benchmark runs')));
  });

  test('flags close calls within 5%', () => {
    const near = result({ name: 'NEAR', algorithm: 'SIMON', enc: 0.0102, dec: 0.03 });
    const [group] = compareResults({ results: [fast, near] }).groups;
    assert.ok(group.winners.encryption.closeCall);
  });
});

describe('compare request validation', () => {
  test('accepts well-formed results', () => {
    assert.doesNotThrow(() => normalizeCompareRequest({ results: [fast, slow], statistic: 'median' }));
  });

  test('rejects malformed requests', () => {
    const invalid = [
      {},
      { results: [] },
      { results: 'x' },
      { results: [fast], statistic: 'p99' },
      { results: [{ ...fast, encrypt: { meanMs: -1 } }] },
      { results: [{ ...fast, messageSize: 0 }] },
      { results: [fast], weights: { speed: 1 } },
      { results: [fast], weights: { encryption: -1 } },
      { results: [fast], weights: { encryption: 0, decryption: 0, keySetup: 0, ciphertextSize: 0, roundKeyMemory: 0 } },
      { results: Array(61).fill(fast) },
    ];
    for (const body of invalid) {
      assert.throws(() => normalizeCompareRequest(body), ValidationError, JSON.stringify(body).slice(0, 60));
    }
  });
});
