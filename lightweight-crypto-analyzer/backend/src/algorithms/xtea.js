/**
 * XTEA (eXtended Tiny Encryption Algorithm)
 * D. J. Wheeler and R. M. Needham, "Tea extensions", Cambridge Computer Laboratory, 1997.
 *
 *   Block size : 64 bits (two 32-bit halves v0, v1)
 *   Key size   : 128 bits (four 32-bit words k[0..3])
 *   Rounds     : 64 Feistel rounds = 32 cycles
 *   Byte order : big-endian 32-bit words. Block bytes 0..3 form v0 and bytes 4..7 form v1;
 *                key bytes 0..3 form k[0], and so on. This matches the published test
 *                vectors used by Botan and libtomcrypt.
 *
 * Reference round (one cycle = two Feistel rounds):
 *   v0 += (((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]);
 *   sum += DELTA;
 *   v1 += (((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3]);
 *
 * Key setup: the 64 values (sum + k[...]) depend only on the key, so they are
 * precomputed once per key. This keeps key setup out of the timed encryption loop.
 */
import { readU32BE, writeU32BE } from '../utils/bytes.js';

export const DELTA = 0x9e3779b9;
export const CYCLES = 32;

export const VARIANTS = Object.freeze({
  '64/128': Object.freeze({
    id: '64/128',
    name: 'XTEA-64/128',
    blockBits: 64,
    keyBits: 128,
    wordBits: 32,
    rounds: 64,
    roundsNote: '64 Feistel rounds (32 cycles)',
  }),
});

export const DEFAULT_VARIANT = '64/128';

/** Expands a 16-byte key into 64 round values (sum + key word) for each Feistel round. */
export function expandKey(key) {
  if (!(key instanceof Uint8Array) || key.length !== 16) {
    throw new RangeError('XTEA requires a 16-byte (128-bit) key');
  }
  const k = [readU32BE(key, 0), readU32BE(key, 4), readU32BE(key, 8), readU32BE(key, 12)];
  const roundKeys = new Uint32Array(2 * CYCLES);
  let sum = 0;
  for (let i = 0; i < CYCLES; i++) {
    roundKeys[2 * i] = (sum + k[sum & 3]) >>> 0;
    sum = (sum + DELTA) >>> 0;
    roundKeys[2 * i + 1] = (sum + k[(sum >>> 11) & 3]) >>> 0;
  }
  return roundKeys;
}

export function encryptBlock(roundKeys, src, srcOffset, dst, dstOffset) {
  let v0 = readU32BE(src, srcOffset);
  let v1 = readU32BE(src, srcOffset + 4);
  for (let i = 0; i < 2 * CYCLES; i += 2) {
    v0 = (v0 + ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ roundKeys[i])) >>> 0;
    v1 = (v1 + ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ roundKeys[i + 1])) >>> 0;
  }
  writeU32BE(dst, dstOffset, v0);
  writeU32BE(dst, dstOffset + 4, v1);
}

export function decryptBlock(roundKeys, src, srcOffset, dst, dstOffset) {
  let v0 = readU32BE(src, srcOffset);
  let v1 = readU32BE(src, srcOffset + 4);
  for (let i = 2 * CYCLES - 2; i >= 0; i -= 2) {
    v1 = (v1 - ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ roundKeys[i + 1])) >>> 0;
    v0 = (v0 - ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ roundKeys[i])) >>> 0;
  }
  writeU32BE(dst, dstOffset, v0);
  writeU32BE(dst, dstOffset + 4, v1);
}

/** Creates a keyed block-cipher object used by the block-mode layer. */
export function createCipher(variantId, key) {
  if (!VARIANTS[variantId]) throw new RangeError(`Unknown XTEA variant: ${variantId}`);
  const roundKeys = expandKey(key);
  return {
    blockSize: 8,
    roundKeyBytes: roundKeys.byteLength,
    encryptBlock: (src, srcOffset, dst, dstOffset) => encryptBlock(roundKeys, src, srcOffset, dst, dstOffset),
    decryptBlock: (src, srcOffset, dst, dstOffset) => decryptBlock(roundKeys, src, srcOffset, dst, dstOffset),
  };
}

/**
 * Known-answer test vectors (hex byte strings in the byte order documented above).
 * Source: the XTEA test vectors distributed with the Botan library (xtea.vec),
 * which use big-endian words; the all-zero vector also appears in libtomcrypt.
 */
export const TEST_VECTORS = Object.freeze([
  { variant: '64/128', key: '000102030405060708090a0b0c0d0e0f', plaintext: '4142434445464748', ciphertext: '497df3d072612cb5' },
  { variant: '64/128', key: '000102030405060708090a0b0c0d0e0f', plaintext: '4141414141414141', ciphertext: 'e78f2d13744341d8' },
  { variant: '64/128', key: '000102030405060708090a0b0c0d0e0f', plaintext: '5a5b6e278948d77f', ciphertext: '4141414141414141' },
  { variant: '64/128', key: '00000000000000000000000000000000', plaintext: '4142434445464748', ciphertext: 'a0390589f8b8efa5' },
  { variant: '64/128', key: '00000000000000000000000000000000', plaintext: '4141414141414141', ciphertext: 'ed23375a821a8c2d' },
  { variant: '64/128', key: '00000000000000000000000000000000', plaintext: '70e1225d6e4e7655', ciphertext: '4141414141414141' },
  { variant: '64/128', key: '00000000000000000000000000000000', plaintext: '0000000000000000', ciphertext: 'dee9d4d8f7131ed9' },
].map((vector) => Object.freeze({ ...vector, source: 'Botan xtea.vec / libtomcrypt (big-endian words)' })));

export default Object.freeze({
  id: 'XTEA',
  name: 'XTEA',
  variants: VARIANTS,
  defaultVariant: DEFAULT_VARIANT,
  byteOrder: 'Big-endian 32-bit words (block bytes 0-3 = v0, 4-7 = v1; key bytes 0-3 = k[0])',
  createCipher,
  testVectors: TEST_VECTORS,
});
