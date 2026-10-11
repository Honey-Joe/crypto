import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';
import XTEA, { DELTA, expandKey } from '../src/algorithms/xtea.js';
import { readU32BE } from '../src/utils/bytes.js';
import { assertBlockRoundTrips, assertKnownAnswer } from './helpers.js';

/** Straight transcription of Wheeler & Needham's reference code (no precomputation). */
function referenceEncrypt(block, key) {
  const k = [0, 4, 8, 12].map((offset) => readU32BE(key, offset));
  let v0 = readU32BE(block, 0);
  let v1 = readU32BE(block, 4);
  let sum = 0;
  for (let i = 0; i < 32; i++) {
    v0 = (v0 + ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]))) >>> 0;
    sum = (sum + DELTA) >>> 0;
    v1 = (v1 + ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3]))) >>> 0;
  }
  const out = Buffer.alloc(8);
  out.writeUInt32BE(v0, 0);
  out.writeUInt32BE(v1, 4);
  return out;
}

describe('XTEA', () => {
  test('matches every published known-answer vector', () => {
    assert.ok(XTEA.testVectors.length >= 6);
    for (const vector of XTEA.testVectors) assertKnownAnswer(XTEA, vector);
  });

  test('precomputed key schedule matches the reference round formula', () => {
    for (let i = 0; i < 100; i++) {
      const key = randomBytes(16);
      const block = randomBytes(8);
      const cipher = XTEA.createCipher('64/128', key);
      const out = Buffer.alloc(8);
      cipher.encryptBlock(block, 0, out, 0);
      assert.deepEqual(out, referenceEncrypt(block, key));
    }
  });

  test('decrypt inverts encrypt for random keys and blocks', () => {
    assertBlockRoundTrips(XTEA, '64/128', 16, randomBytes);
  });

  test('stores 64 round values (256 bytes)', () => {
    assert.equal(expandKey(new Uint8Array(16)).byteLength, 256);
  });

  test('rejects keys that are not 128 bits', () => {
    assert.throws(() => XTEA.createCipher('64/128', new Uint8Array(15)), RangeError);
    assert.throws(() => XTEA.createCipher('64/128', new Uint8Array(17)), RangeError);
  });

  test('rejects unknown variants', () => {
    assert.throws(() => XTEA.createCipher('64/64', new Uint8Array(16)), RangeError);
  });
});
