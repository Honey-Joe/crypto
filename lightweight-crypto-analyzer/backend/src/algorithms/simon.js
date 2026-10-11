/**
 * SIMON lightweight block cipher family
 * R. Beaulieu, D. Shors, J. Smith, S. Treatman-Clark, B. Weeks and L. Wingers (NSA),
 * "The SIMON and SPECK Families of Lightweight Block Ciphers", IACR ePrint 2013/404.
 *
 * Supported variants (block bits / key bits):
 *   SIMON-32/64  : 16-bit words, m = 4 key words, 32 rounds, constant sequence z0
 *   SIMON-64/96  : 32-bit words, m = 3 key words, 42 rounds, constant sequence z2
 *   SIMON-64/128 : 32-bit words, m = 4 key words, 44 rounds, constant sequence z3
 * The 48-, 96- and 128-bit block variants are not implemented in this project.
 *
 * Structure: balanced Feistel network, block = (x, y) words.
 *   Round:  (x, y) -> (y XOR f(x) XOR k_i, x)   with   f(x) = (x<<<1 AND x<<<8) XOR (x<<<2)
 *
 * Byte order (SIMON and SPECK Implementation Guide, NSA 2019): little-endian.
 *   Block bytes = y (LSB first) followed by x (LSB first).
 *   Key bytes   = k0, k1, ..., k(m-1), each LSB first.
 * The paper writes test vectors as words with the most significant word first; the
 * test-vector table below keeps that notation and converts it to bytes explicitly.
 */
import { readU16LE, readU32LE, writeU16LE, writeU32LE, paperWordsToLittleEndianBytes } from '../utils/bytes.js';

// Constant sequences z0..z4 from the SIMON specification (bit i is character i).
const Z_SEQUENCES = [
  '11111010001001010110000111001101111101000100101011000011100110',
  '10001110111110010011000010110101000111011111001001100001011010',
  '10101111011100000011010010011000101000010001111110010110110011',
  '11011011101011000110010111100000010010001010011100110100001111',
  '11010001111001101011011000100000010111000011001010010011101111',
].map((bits) => Uint8Array.from(bits, (bit) => (bit === '1' ? 1 : 0)));

export const VARIANTS = Object.freeze({
  '32/64': Object.freeze({ id: '32/64', name: 'SIMON-32/64', blockBits: 32, keyBits: 64, wordBits: 16, keyWords: 4, rounds: 32, zIndex: 0 }),
  '64/96': Object.freeze({ id: '64/96', name: 'SIMON-64/96', blockBits: 64, keyBits: 96, wordBits: 32, keyWords: 3, rounds: 42, zIndex: 2 }),
  '64/128': Object.freeze({ id: '64/128', name: 'SIMON-64/128', blockBits: 64, keyBits: 128, wordBits: 32, keyWords: 4, rounds: 44, zIndex: 3 }),
});

export const DEFAULT_VARIANT = '64/128';

/** Key expansion (Section 3 of the SIMON/SPECK paper). Returns the T round keys. */
export function expandKey(variant, key) {
  const { wordBits: n, keyWords: m, rounds: T, zIndex } = variant;
  if (!(key instanceof Uint8Array) || key.length * 8 !== variant.keyBits) {
    throw new RangeError(`${variant.name} requires a ${variant.keyBits / 8}-byte key`);
  }
  const wordBytes = n / 8;
  const mask = n === 16 ? 0xffff : 0xffffffff;
  const rotr = (value, r) => (((value >>> r) | (value << (n - r))) & mask) >>> 0;
  const readWord = n === 16 ? readU16LE : readU32LE;
  const z = Z_SEQUENCES[zIndex];
  const c = (mask ^ 3) >>> 0; // 2^n - 4

  const k = n === 16 ? new Uint16Array(T) : new Uint32Array(T);
  for (let i = 0; i < m; i++) k[i] = readWord(key, i * wordBytes);
  for (let i = m; i < T; i++) {
    let tmp = rotr(k[i - 1], 3);
    if (m === 4) tmp = (tmp ^ k[i - 3]) >>> 0;
    tmp = (tmp ^ rotr(tmp, 1)) >>> 0;
    k[i] = (c ^ z[(i - m) % 62] ^ k[i - m] ^ tmp) & mask;
  }
  return k;
}

// ---- 32-bit word variants (SIMON-64/*) ----------------------------------------------

function encrypt32(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU32LE(src, srcOffset);
  let x = readU32LE(src, srcOffset + 4);
  for (let i = 0; i < roundKeys.length; i++) {
    const f = (((x << 1) | (x >>> 31)) & ((x << 8) | (x >>> 24))) ^ ((x << 2) | (x >>> 30));
    const previousX = x;
    x = (y ^ f ^ roundKeys[i]) >>> 0;
    y = previousX;
  }
  writeU32LE(dst, dstOffset, y);
  writeU32LE(dst, dstOffset + 4, x);
}

function decrypt32(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU32LE(src, srcOffset);
  let x = readU32LE(src, srcOffset + 4);
  for (let i = roundKeys.length - 1; i >= 0; i--) {
    const f = (((y << 1) | (y >>> 31)) & ((y << 8) | (y >>> 24))) ^ ((y << 2) | (y >>> 30));
    const previousY = y;
    y = (x ^ f ^ roundKeys[i]) >>> 0;
    x = previousY;
  }
  writeU32LE(dst, dstOffset, y);
  writeU32LE(dst, dstOffset + 4, x);
}

// ---- 16-bit word variant (SIMON-32/64) ----------------------------------------------

function encrypt16(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU16LE(src, srcOffset);
  let x = readU16LE(src, srcOffset + 2);
  for (let i = 0; i < roundKeys.length; i++) {
    const f = ((((x << 1) | (x >>> 15)) & ((x << 8) | (x >>> 8))) ^ ((x << 2) | (x >>> 14))) & 0xffff;
    const previousX = x;
    x = y ^ f ^ roundKeys[i];
    y = previousX;
  }
  writeU16LE(dst, dstOffset, y);
  writeU16LE(dst, dstOffset + 2, x);
}

function decrypt16(roundKeys, src, srcOffset, dst, dstOffset) {
  let y = readU16LE(src, srcOffset);
  let x = readU16LE(src, srcOffset + 2);
  for (let i = roundKeys.length - 1; i >= 0; i--) {
    const f = ((((y << 1) | (y >>> 15)) & ((y << 8) | (y >>> 8))) ^ ((y << 2) | (y >>> 14))) & 0xffff;
    const previousY = y;
    y = x ^ f ^ roundKeys[i];
    x = previousY;
  }
  writeU16LE(dst, dstOffset, y);
  writeU16LE(dst, dstOffset + 2, x);
}

export function createCipher(variantId, key) {
  const variant = VARIANTS[variantId];
  if (!variant) throw new RangeError(`Unknown SIMON variant: ${variantId}`);
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
 * Known-answer test vectors from Appendix B of the SIMON/SPECK paper (ePrint 2013/404),
 * written as in the paper (most significant word first) and converted to bytes.
 */
const PAPER_VECTORS = [
  { variant: '32/64', key: ['1918', '1110', '0908', '0100'], plaintext: ['6565', '6877'], ciphertext: ['c69b', 'e9bb'] },
  { variant: '64/96', key: ['13121110', '0b0a0908', '03020100'], plaintext: ['6f722067', '6e696c63'], ciphertext: ['5ca2e27f', '111a8fc8'] },
  { variant: '64/128', key: ['1b1a1918', '13121110', '0b0a0908', '03020100'], plaintext: ['656b696c', '20646e75'], ciphertext: ['44c8fc20', 'b9dfa07a'] },
];

export const TEST_VECTORS = Object.freeze(
  PAPER_VECTORS.map((vector) =>
    Object.freeze({
      variant: vector.variant,
      key: paperWordsToLittleEndianBytes(vector.key).toString('hex'),
      plaintext: paperWordsToLittleEndianBytes(vector.plaintext).toString('hex'),
      ciphertext: paperWordsToLittleEndianBytes(vector.ciphertext).toString('hex'),
      paperNotation: Object.freeze({ key: vector.key.join(' '), plaintext: vector.plaintext.join(' '), ciphertext: vector.ciphertext.join(' ') }),
      source: 'Beaulieu et al., ePrint 2013/404, Appendix B (bytes per the 2019 Implementation Guide)',
    }),
  ),
);

export default Object.freeze({
  id: 'SIMON',
  name: 'SIMON',
  variants: VARIANTS,
  defaultVariant: DEFAULT_VARIANT,
  byteOrder: 'Little-endian words (block bytes = y then x; key bytes = k0, k1, ...), per the SIMON and SPECK Implementation Guide',
  createCipher,
  testVectors: TEST_VECTORS,
});
