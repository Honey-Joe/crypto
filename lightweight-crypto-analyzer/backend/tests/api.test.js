import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { runSelfTests } from '../src/services/selfTestService.js';

let server;
let baseUrl;

before(async () => {
  runSelfTests();
  server = createApp({ logRequests: false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

async function post(path, body, { raw = false, contentType = 'application/json' } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: raw ? body : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const KEYS = {
  XTEA: { '64/128': '000102030405060708090a0b0c0d0e0f' },
  PRESENT: { 80: '00112233445566778899', 128: '00112233445566778899aabbccddeeff' },
  SIMON: { '32/64': '0001080910111819', '64/96': '0001020308090a0b10111213', '64/128': '0001020308090a0b1011121318191a1b' },
  SPECK: { '32/64': '0001080910111819', '64/96': '0001020308090a0b10111213', '64/128': '0001020308090a0b1011121318191a1b' },
};

function assertError(response, status, code) {
  assert.equal(response.status, status, JSON.stringify(response.body));
  assert.equal(response.body.success, false);
  if (code) assert.equal(response.body.error.code, code);
  assert.equal(typeof response.body.error.message, 'string');
  const serialized = JSON.stringify(response.body);
  assert.ok(!/\bat \S+ \(|file:\/\/|\.js:\d+/.test(serialized), `no stack trace in response: ${serialized}`);
}

describe('system endpoints', () => {
  test('GET /health reports ok', async () => {
    const { status, body } = await get('/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });

  test('GET /algorithms lists four verified algorithms with nine variants', async () => {
    const { status, body } = await get('/algorithms');
    assert.equal(status, 200);
    assert.deepEqual(body.algorithms.map((algorithm) => algorithm.id).sort(), ['PRESENT', 'SIMON', 'SPECK', 'XTEA']);
    const variants = body.algorithms.flatMap((algorithm) => algorithm.variants);
    assert.equal(variants.length, 9);
    assert.ok(variants.every((variant) => variant.verified));
    assert.ok(body.algorithms.every((algorithm) => algorithm.implementationStatus === 'verified'));
    assert.deepEqual(body.modes.map((mode) => mode.id), ['CBC', 'CTR', 'ECB']);
  });

  test('GET /algorithms/:id returns details and the self-test vectors', async () => {
    const { status, body } = await get('/algorithms/present');
    assert.equal(status, 200);
    assert.equal(body.algorithm.id, 'PRESENT');
    assert.ok(body.algorithm.testVectors.every((vector) => vector.passed));
    assert.ok(body.algorithm.literature.reviewTable3.hardware.areaGE > 0);
    assertError(await get('/algorithms/aes'), 404, 'NOT_FOUND');
  });

  test('GET /references includes the reference paper', async () => {
    const { body } = await get('/references');
    const primary = body.references.find((reference) => reference.primary);
    assert.equal(primary.doi, '10.1109/ACCESS.2021.3052867');
  });

  test('GET /iot/reading returns a simulated reading', async () => {
    const { status, body } = await get('/iot/reading?deviceId=SENSOR-001');
    assert.equal(status, 200);
    assert.equal(body.simulated, true);
    assert.equal(body.reading.deviceId, 'SENSOR-001');
    assert.equal(JSON.parse(body.messages.json).temperature, body.reading.temperature);
    assertError(await get('/iot/reading?deviceId=bad%20id!'), 400, 'VALIDATION_ERROR');
  });

  test('unknown routes return a JSON 404', async () => {
    assertError(await get('/does-not-exist'), 404, 'NOT_FOUND');
  });
});

describe('POST /encrypt and /decrypt', () => {
  test('round-trips every variant, mode and format', async () => {
    const plaintext = 'Temperature=32.5C; humidity=68% — ünïcödé ✓';
    for (const [algorithm, variants] of Object.entries(KEYS)) {
      for (const [variant, key] of Object.entries(variants)) {
        for (const mode of ['CBC', 'CTR', 'ECB']) {
          for (const format of ['hex', 'base64']) {
            const encrypted = await post('/encrypt', { algorithm, variant, key, plaintext, mode, outputFormat: format });
            assert.equal(encrypted.status, 200, JSON.stringify(encrypted.body));
            assert.notEqual(encrypted.body.ciphertext, Buffer.from(plaintext).toString(format));
            const decrypted = await post('/decrypt', {
              algorithm,
              variant,
              key,
              mode,
              inputFormat: format,
              ciphertext: encrypted.body.ciphertext,
              expectedPlaintext: plaintext,
            });
            assert.equal(decrypted.status, 200, JSON.stringify(decrypted.body));
            assert.equal(decrypted.body.plaintext, plaintext);
            assert.equal(decrypted.body.verification.matches, true);
          }
        }
      }
    }
  });

  test('reports sizes, IV and timing for an encryption', async () => {
    const { body } = await post('/encrypt', { algorithm: 'XTEA', plaintext: 'Temperature=32C', key: KEYS.XTEA['64/128'], outputFormat: 'hex' });
    assert.equal(body.mode, 'CBC');
    assert.equal(body.sizes.plaintextBytes, 15);
    assert.equal(body.sizes.paddingBytes, 1);
    assert.equal(body.sizes.rawCiphertextBytes, 24);
    assert.equal(body.ciphertext.slice(0, 16), body.iv);
    assert.ok(body.timing.encryptionMs > 0);
    assert.ok(body.warnings.some((warning) => warning.includes('does not detect modification')));
  });

  test('accepts a caller-supplied IV, producing deterministic output', async () => {
    const request = { algorithm: 'SPECK', variant: '64/128', plaintext: 'abc', key: KEYS.SPECK['64/128'], iv: '0011223344556677' };
    const first = await post('/encrypt', request);
    const second = await post('/encrypt', request);
    assert.equal(first.body.ciphertext, second.body.ciphertext);
    assertError(await post('/encrypt', { ...request, iv: '00' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...request, mode: 'ECB' }), 400, 'VALIDATION_ERROR');
  });

  test('a wrong key is reported as a decryption failure, not success', async () => {
    const { body } = await post('/encrypt', { algorithm: 'PRESENT', variant: '80', plaintext: 'secret reading', key: KEYS.PRESENT[80] });
    const response = await post('/decrypt', { algorithm: 'PRESENT', variant: '80', ciphertext: body.ciphertext, key: 'ffffffffffffffffffff' });
    // CBC padding check catches a wrong key with probability ~255/256.
    if (response.status === 200) {
      assert.notEqual(response.body.plaintext, 'secret reading');
    } else {
      assertError(response, 422, 'INVALID_PADDING');
    }
  });

  test('flags a mismatch against the expected plaintext', async () => {
    const { body } = await post('/encrypt', { algorithm: 'SIMON', variant: '64/128', mode: 'CTR', plaintext: 'hello', key: KEYS.SIMON['64/128'] });
    const response = await post('/decrypt', { algorithm: 'SIMON', variant: '64/128', mode: 'CTR', ciphertext: body.ciphertext, key: KEYS.SIMON['64/128'], expectedPlaintext: 'HELLO' });
    assert.equal(response.status, 200);
    assert.equal(response.body.verification.matches, false);
  });

  test('validates inputs', async () => {
    const valid = { algorithm: 'XTEA', plaintext: 'hi', key: KEYS.XTEA['64/128'] };
    assertError(await post('/encrypt', { ...valid, algorithm: 'AES' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, algorithm: undefined }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, variant: '128/128' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, plaintext: '' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, plaintext: 42 }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, key: '' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, key: '0011' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, key: 'zz0102030405060708090a0b0c0d0e0f' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, outputFormat: 'binary' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, mode: 'GCM' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', { ...valid, plaintext: 'x'.repeat(65537) }), 400, 'VALIDATION_ERROR');
  });

  test('rejects malformed ciphertext', async () => {
    const base = { algorithm: 'XTEA', key: KEYS.XTEA['64/128'] };
    assertError(await post('/decrypt', { ...base, ciphertext: '' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/decrypt', { ...base, ciphertext: 'xyz1' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/decrypt', { ...base, ciphertext: 'abc' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/decrypt', { ...base, ciphertext: 'not base64!', inputFormat: 'base64' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/decrypt', { ...base, ciphertext: '00112233445566778899' }), 422, 'INVALID_CIPHERTEXT_LENGTH');
    assertError(await post('/decrypt', { ...base, ciphertext: '0011223344556677' }), 422, 'INVALID_CIPHERTEXT_LENGTH');
    assertError(await post('/decrypt', { ...base, ciphertext: '00', inputFormat: 'base32' }), 400, 'VALIDATION_ERROR');
  });

  test('rejects invalid JSON, non-JSON bodies and non-object bodies', async () => {
    assertError(await post('/encrypt', '{bad', { raw: true }), 400, 'INVALID_JSON');
    assertError(await post('/encrypt', 'algorithm=XTEA', { raw: true, contentType: 'text/plain' }), 400, 'VALIDATION_ERROR');
    assertError(await post('/encrypt', [1, 2]), 400, 'VALIDATION_ERROR');
  });

  test('POST /keys generates keys of the right length', async () => {
    for (const [algorithm, variants] of Object.entries(KEYS)) {
      for (const [variant, sample] of Object.entries(variants)) {
        const { status, body } = await post('/keys', { algorithm, variant });
        assert.equal(status, 200);
        assert.equal(body.key.length, sample.length);
        assert.match(body.key, /^[0-9a-f]+$/);
      }
    }
    assertError(await post('/keys', { algorithm: 'DES' }), 400, 'VALIDATION_ERROR');
  });
});

describe('POST /benchmark and /compare', () => {
  test('runs a small benchmark and compares the results', async () => {
    const benchmark = await post('/benchmark', {
      targets: [{ algorithm: 'XTEA' }, { algorithm: 'SPECK', variant: '64/128' }],
      messageSizes: [128],
      iterations: 20,
      warmupIterations: 5,
      dataset: 'sensor',
    });
    assert.equal(benchmark.status, 200, JSON.stringify(benchmark.body));
    assert.equal(benchmark.body.results.length, 2);
    assert.ok(benchmark.body.results.every((result) => result.status === 'passed'));

    const comparison = await post('/compare', { results: benchmark.body.results, statistic: 'median' });
    assert.equal(comparison.status, 200, JSON.stringify(comparison.body));
    assert.equal(comparison.body.groups.length, 1);
    assert.equal(comparison.body.groups[0].messageSize, 128);
    assert.ok(comparison.body.groups[0].recommendation.best.length >= 1);
    assert.match(comparison.body.disclaimer, /not mean more secure/);
  });

  test('enforces benchmark limits', async () => {
    assertError(await post('/benchmark', { iterations: 5000 }), 400, 'VALIDATION_ERROR');
    assertError(await post('/benchmark', { messageSizes: [262144], iterations: 100 }), 400, 'VALIDATION_ERROR');
    assertError(await post('/benchmark', { targets: [{ algorithm: 'RC4' }] }), 400, 'VALIDATION_ERROR');
  });

  test('GET /benchmark/options exposes defaults and limits', async () => {
    const { body } = await get('/benchmark/options');
    assert.equal(body.limits.maxMessageSize, 262144);
    assert.ok(body.datasets.some((dataset) => dataset.id === 'sensor'));
  });

  test('POST /compare validates its input', async () => {
    assertError(await post('/compare', { results: [] }), 400, 'VALIDATION_ERROR');
    assertError(await post('/compare', { results: [{ displayName: 'x' }] }), 400, 'VALIDATION_ERROR');
  });
});
