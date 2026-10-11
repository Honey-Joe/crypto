import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';
import PRESENT, {
  INV_SBOX,
  SBOX,
  encryptBlockReference,
  expandKey,
  invPLayer,
  invSBoxLayer,
  pLayer,
  permutationIndex,
  sBoxLayer,
} from '../src/algorithms/present.js';
import { assertBlockRoundTrips, assertKnownAnswer } from './helpers.js';

function randomWord() {
  return randomBytes(4).readUInt32BE(0);
}

describe('PRESENT', () => {
  test('matches the PRESENT-80 vectors from the original paper', () => {
    const vectors = PRESENT.testVectors.filter((vector) => vector.variant === '80');
    assert.equal(vectors.length, 4);
    for (const vector of vectors) assertKnownAnswer(PRESENT, vector);
  });

  test('matches the PRESENT-128 reference vectors', () => {
    const vectors = PRESENT.testVectors.filter((vector) => vector.variant === '128');
    assert.equal(vectors.length, 4);
    for (const vector of vectors) assertKnownAnswer(PRESENT, vector);
  });

  test('S-box and inverse S-box are inverse permutations of 0..15', () => {
    assert.deepEqual([...SBOX].sort((a, b) => a - b), [...Array(16).keys()]);
    for (let x = 0; x < 16; x++) assert.equal(INV_SBOX[SBOX[x]], x);
  });

  test('bit permutation follows P(i) = 16i mod 63 and is a bijection', () => {
    assert.equal(permutationIndex(0), 0);
    assert.equal(permutationIndex(1), 16);
    assert.equal(permutationIndex(4), 1);
    assert.equal(permutationIndex(62), 47);
    assert.equal(permutationIndex(63), 63);
    const targets = new Set(Array.from({ length: 64 }, (_, i) => permutationIndex(i)));
    assert.equal(targets.size, 64);
  });

  test('reference layers invert correctly', () => {
    for (let i = 0; i < 200; i++) {
      const hi = randomWord();
      const lo = randomWord();
      assert.deepEqual(invPLayer(...pLayer(hi, lo)), [hi, lo]);
      assert.deepEqual(invSBoxLayer(...sBoxLayer(hi, lo)), [hi, lo]);
    }
  });

  test('table-based fast path equals the bit-level reference implementation', () => {
    for (const variant of ['80', '128']) {
      for (let i = 0; i < 100; i++) {
        const key = randomBytes(variant === '80' ? 10 : 16);
        const block = randomBytes(8);
        const fast = Buffer.alloc(8);
        PRESENT.createCipher(variant, key).encryptBlock(block, 0, fast, 0);
        const [hi, lo] = encryptBlockReference(expandKey(key), block.readUInt32BE(0), block.readUInt32BE(4));
        const reference = Buffer.alloc(8);
        reference.writeUInt32BE(hi, 0);
        reference.writeUInt32BE(lo, 4);
        assert.deepEqual(fast, reference);
      }
    }
  });

  test('decrypt inverts encrypt for random keys and blocks', () => {
    assertBlockRoundTrips(PRESENT, '80', 10, randomBytes);
    assertBlockRoundTrips(PRESENT, '128', 16, randomBytes);
  });

  test('derives 32 round keys and the first equals the leftmost 64 key bits', () => {
    const key = Buffer.from('0123456789abcdef0123', 'hex');
    const roundKeys = expandKey(key);
    assert.equal(roundKeys.hi.length, 32);
    assert.equal(roundKeys.hi[0], 0x01234567);
    assert.equal(roundKeys.lo[0], 0x89abcdef);
  });

  test('rejects keys of the wrong length for the variant', () => {
    assert.throws(() => PRESENT.createCipher('80', new Uint8Array(16)), RangeError);
    assert.throws(() => PRESENT.createCipher('128', new Uint8Array(10)), RangeError);
    assert.throws(() => PRESENT.createCipher('96', new Uint8Array(12)), RangeError);
  });
});
