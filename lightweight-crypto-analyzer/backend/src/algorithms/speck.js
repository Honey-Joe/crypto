/**
 * SPECK lightweight block cipher family
 * R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks and L. Wingers (NSA),
 * "The SIMON and SPECK Families of Lightweight Block Ciphers", IACR ePrint 2013/404.
 *
 * Supported variants (block bits / key bits):
 *   SPECK-32/64  : 16-bit words, m = 4 key words, 22 rounds, alpha = 7, beta = 2
 *   SPECK-64/96  : 32-bit words, m = 3 key words, 26 rounds, alpha = 8, beta = 3
 *   SPECK-64/128 : 32-bit words, m = 4 key words, 27 rounds, alpha = 8, beta = 3
 * The 48-, 96- and 128-bit block variants are not implemented in this project.
 *
 * Structure: ARX (modular Addition, Rotation, XOR), block = (x, y) words.
 *   Round:  x = ((x >>> alpha) + y) XOR k_i ;  y = (y <<< beta) XOR x
 * Key schedule reuses the round function with the round index as the "key":
 *   l[i+m-1] = (k_i + (l_i >>> alpha)) XOR i ;  k_{i+1} = (k_i <<< beta) XOR l[i+m-1]
 *
 * Byte order (SIMON and SPECK Implementation Guide, NSA 2019): little-endian.
 *   Block bytes = y (LSB first) followed by x (LSB first).
 *   Key bytes   = k0, l0, l1, ..., each LSB first.
 */
import { readU16LE, readU32LE, writeU16LE, writeU32LE, paperWordsToLittleEndianBytes } from '../utils/bytes.js';

export const VARIANTS = Object.freeze({
  '32/64': Object.freeze({ id: '32/64', name: 'SPECK-32/64', blockBits: 32, keyBits: 64, wordBits: 16, keyWords: 4, rounds: 22, alpha: 7, beta: 2 }),
  '64/96': Object.freeze({ id: '64/96', name: 'SPECK-64/96', blockBits: 64, keyBits: 96, wordBits: 32, keyWords: 3, rounds: 26, alpha: 8, beta: 3 }),
  '64/128': Object.freeze({ id: '64/128', name: 'SPECK-64/128', blockBits: 64, keyBits: 128, wordBits: 32, keyWords: 4, rounds: 27, alpha: 8, beta: 3 }),
});

export const DEFAULT_VARIANT = '64/128';

/** Key expansion (Section 4 of the SIMON/SPECK paper). Returns the T round keys. */
export function expandKey(variant, key) {
  const { wordBits: n, keyWords: m, rounds: T, alpha, beta } = variant;
  if (!(key instanceof Uint8Array) || key.length * 8 !== variant.keyBits) {
    throw new RangeError(`${variant.name} requires a ${variant.keyBits / 8}-byte key`);
  }
  const wordBytes = n / 8;
  const mask = n === 16 ? 0xffff : 0xffffffff;
  const rotl = (value, r) => (((value << r) | (value >>> (n - r))) & mask) >>> 0;
  const rotr = (value, r) => (((value >>> r) | (value << (n - r))) & mask) >>> 0;
  const add = (a, b) => ((a + b) & mask) >>> 0;
  const readWord = n === 16 ? readU16LE : readU32LE;

  const k = n === 16 ? new Uint16Array(T) : new Uint32Array(T);
  const l = new Array(T + m - 2);
  k[0] = readWord(key, 0);
  for (let i = 0; i < m - 1; i++) l[i] = readWord(key, (i + 1) * wordBytes);
  for (let i = 0; i < T - 1; i++) {
    l[i + m - 1] = (add(k[i], rotr(l[i], alpha)) ^ i) >>> 0;
    k[i + 1] = (rotl(k[i], beta) ^ l[i + m - 1]) >>> 0;
  }
  return k;
}

// ---- 32-bit word variants (alpha = 8, beta = 3) --------------------------------------

function encrypt32(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU32LE(src, srcOffset);
  let x = readU32LE(src, srcOffset + 4);
  for (let i = 0; i < roundKeys.length; i++) {
    x = ((((x >>> 8) | (x << 24)) + y) ^ roundKeys[i]) >>> 0;
    y = (((y << 3) | (y >>> 29)) ^ x) >>> 0;
  }
  writeU32LE(dst, dstOffset, y);
  writeU32LE(dst, dstOffset + 4, x);
}

function decrypt32(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU32LE(src, srcOffset);
  let x = readU32LE(src, srcOffset + 4);
  for (let i = roundKeys.length - 1; i >= 0; i--) {
    y = (y ^ x) >>> 0;
    y = ((y >>> 3) | (y << 29)) >>> 0;
    x = (((x ^ roundKeys[i]) >>> 0) - y) >>> 0;
    x = ((x << 8) | (x >>> 24)) >>> 0;
  }
  writeU32LE(dst, dstOffset, y);
  writeU32LE(dst, dstOffset + 4, x);
}

// ---- 16-bit word variant (alpha = 7, beta = 2) ---------------------------------------

function encrypt16(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU16LE(src, srcOffset);
  let x = readU16LE(src, srcOffset + 2);
  for (let i = 0; i < roundKeys.length; i++) {
    x = ((((((x >>> 7) | (x << 9)) & 0xffff) + y) & 0xffff) ^ roundKeys[i]);
    y = (((y << 2) | (y >>> 14)) & 0xffff) ^ x;
  }
  writeU16LE(dst, dstOffset, y);
  writeU16LE(dst, dstOffset + 2, x);
}

function decrypt16(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU16LE(src, srcOffset);
  let x = readU16LE(src, srcOffset + 2);
  for (let i = roundKeys.length - 1; i >= 0; i--) {
    y ^= x;
    y = ((y >>> 2) | (y << 14)) & 0xffff;
    x = ((x ^ roundKeys[i]) - y) & 0xffff;
    x = ((x << 7) | (x >>> 9)) & 0xffff;
  }
  writeU16LE(dst, dstOffset, y);
  writeU16LE(dst, dstOffset + 2, x);
}

export function createCipher(variantId, key) {
  const variant = VARIANTS[variantId];
  if (!variant) throw new RangeError(`Unknown SPECK variant: ${variantId}`);
  const roundKeys = expandKey(variant, key);
  const encrypt = variant.wordBits === 16 ? encrypt16 : encrypt32;
  const decrypt = variant.wordBits === 16 ? decrypt16 : decrypt32;
  return {
    blockSize: variant.blockBits / 8,
    roundKeyBytes: roundKeys.byteLength,
    encryptBlock: (src, srcOffset, dst, dstOffset) => encrypt(roundKeys, src, srcOffset, dst, dstOffset),
    decryptBlock: (src, srcOffset, dst, dstOffset) => decrypt(roundKeys, src, srcOffset, dst, dstOffset),
  };
}

/**
 * Known-answer test vectors from Appendix C of the SIMON/SPECK paper (ePrint 2013/404),
 * written as in the paper (most significant word first) and converted to bytes.
 */
const PAPER_VECTORS = [
  { variant: '32/64', key: ['1918', '1110', '0908', '0100'], plaintext: ['6574', '694c'], ciphertext: ['a868', '42f2'] },
  { variant: '64/96', key: ['13121110', '0b0a0908', '03020100'], plaintext: ['74614620', '736e6165'], ciphertext: ['9f7952ec', '4175946c'] },
  { variant: '64/128', key: ['1b1a1918', '13121110', '0b0a0908', '03020100'], plaintext: ['3b726574', '7475432d'], ciphertext: ['8c6fa548', '454e028b'] },
];

export const TEST_VECTORS = Object.freeze(
  PAPER_VECTORS.map((vector) =>
    Object.freeze({
      variant: vector.variant,
      key: paperWordsToLittleEndianBytes(vector.key).toString('hex'),
      plaintext: paperWordsToLittleEndianBytes(vector.plaintext).toString('hex'),
      ciphertext: paperWordsToLittleEndianBytes(vector.ciphertext).toString('hex'),
      paperNotation: Object.freeze({ key: vector.key.join(' '), plaintext: vector.plaintext.join(' '), ciphertext: vector.ciphertext.join(' ') }),
      source: 'Beaulieu et al., ePrint 2013/404, Appendix C (bytes per the 2019 Implementation Guide)',
    }),
  ),
);

export default Object.freeze({
  id: 'SPECK',
  name: 'SPECK',
  variants: VARIANTS,
  defaultVariant: DEFAULT_VARIANT,
  byteOrder: 'Little-endian words (block bytes = y then x; key bytes = k0, l0, l1, ...), per the SIMON and SPECK Implementation Guide',
  createCipher,
  testVectors: TEST_VECTORS,
});
