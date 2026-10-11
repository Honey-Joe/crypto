/**
 * PRESENT: An Ultra-Lightweight Block Cipher
 * A. Bogdanov, L. R. Knudsen, G. Leander, C. Paar, A. Poschmann, M. J. B. Robshaw,
 * Y. Seurin and C. Vikkelsoe, CHES 2007, LNCS 4727, pp. 450-466. ISO/IEC 29192-2.
 *
 *   Block size : 64 bits
 *   Key size   : 80 bits (PRESENT-80) or 128 bits (PRESENT-128)
 *   Rounds     : 31 rounds + a final key addition (32 round keys)
 *   Structure  : substitution-permutation network (SPN)
 *                addRoundKey -> sBoxLayer (16 x 4-bit S-box) -> pLayer (bit permutation)
 *   Byte order : big-endian. The 64-bit state is b63..b0 and block byte 0 holds b63..b56,
 *                exactly as the hex values in the PRESENT paper are written. The key is
 *                k79..k0 (or k127..k0) with key byte 0 holding the most significant bits.
 *
 * Implementation notes
 *   - The state is kept as two unsigned 32-bit numbers: hi = b63..b32, lo = b31..b0.
 *   - sBoxLayer() and pLayer() below follow the specification bit by bit. They are used to
 *     build lookup tables and are compared against the fast path in the unit tests.
 *   - The fast path combines the S-box and the bit permutation into eight 256-entry tables
 *     (one per state byte). This is a standard software optimisation for PRESENT because the
 *     bit permutation is very cheap in hardware (wiring) but expensive in software.
 *   - Table lookups indexed by secret data are not constant-time; see the security notes.
 *   - The key schedule uses BigInt for readability (80/128-bit rotations). Key setup is
 *     timed separately from encryption by the benchmark service.
 */
import { readU32BE, writeU32BE } from '../utils/bytes.js';

export const SBOX = Uint8Array.from([0xc, 0x5, 0x6, 0xb, 0x9, 0x0, 0xa, 0xd, 0x3, 0xe, 0xf, 0x8, 0x4, 0x7, 0x1, 0x2]);
export const INV_SBOX = (() => {
  const inverse = new Uint8Array(16);
  SBOX.forEach((value, index) => {
    inverse[value] = index;
  });
  return inverse;
})();

export const ROUNDS = 31;

export const VARIANTS = Object.freeze({
  80: Object.freeze({ id: '80', name: 'PRESENT-80', blockBits: 64, keyBits: 80, rounds: 31, roundsNote: '31 rounds + final key addition' }),
  128: Object.freeze({ id: '128', name: 'PRESENT-128', blockBits: 64, keyBits: 128, rounds: 31, roundsNote: '31 rounds + final key addition' }),
});

export const DEFAULT_VARIANT = '80';

/** pLayer: bit i of the state moves to position P(i) = 16*i mod 63 (and P(63) = 63). */
export function permutationIndex(i) {
  return i === 63 ? 63 : (16 * i) % 63;
}

function getBit(hi, lo, position) {
  return position < 32 ? (lo >>> position) & 1 : (hi >>> (position - 32)) & 1;
}

// ---------------------------------------------------------------------------
// Reference (specification-level) layers. Inputs/outputs are [hi, lo] pairs.
// ---------------------------------------------------------------------------

export function sBoxLayer(hi, lo) {
  let outHi = 0;
  let outLo = 0;
  for (let nibble = 0; nibble < 8; nibble++) {
    const shift = 4 * nibble;
    outLo |= SBOX[(lo >>> shift) & 0xf] << shift;
    outHi |= SBOX[(hi >>> shift) & 0xf] << shift;
  }
  return [outHi >>> 0, outLo >>> 0];
}

export function invSBoxLayer(hi, lo) {
  let outHi = 0;
  let outLo = 0;
  for (let nibble = 0; nibble < 8; nibble++) {
    const shift = 4 * nibble;
    outLo |= INV_SBOX[(lo >>> shift) & 0xf] << shift;
    outHi |= INV_SBOX[(hi >>> shift) & 0xf] << shift;
  }
  return [outHi >>> 0, outLo >>> 0];
}

export function pLayer(hi, lo) {
  let outHi = 0;
  let outLo = 0;
  for (let i = 0; i < 64; i++) {
    if (getBit(hi, lo, i)) {
      const p = permutationIndex(i);
      if (p < 32) outLo |= 1 << p;
      else outHi |= 1 << (p - 32);
    }
  }
  return [outHi >>> 0, outLo >>> 0];
}

export function invPLayer(hi, lo) {
  let outHi = 0;
  let outLo = 0;
  for (let i = 0; i < 64; i++) {
    // Output bit i is the bit that pLayer moved to position P(i).
    if (getBit(hi, lo, permutationIndex(i))) {
      if (i < 32) outLo |= 1 << i;
      else outHi |= 1 << (i - 32);
    }
  }
  return [outHi >>> 0, outLo >>> 0];
}

// ---------------------------------------------------------------------------
// Lookup tables for the fast path, built from the reference layers above.
// Table index = bytePosition * 256 + byteValue, where bytePosition 0 is b7..b0.
// ---------------------------------------------------------------------------

function placeByte(value, bytePosition) {
  return bytePosition < 4 ? [0, (value << (8 * bytePosition)) >>> 0] : [(value << (8 * (bytePosition - 4))) >>> 0, 0];
}

const SP_HI = new Uint32Array(8 * 256);
const SP_LO = new Uint32Array(8 * 256);
const IP_HI = new Uint32Array(8 * 256);
const IP_LO = new Uint32Array(8 * 256);
const INV_SBOX_BYTE = new Uint8Array(256);

for (let value = 0; value < 256; value++) {
  const substituted = (SBOX[value >>> 4] << 4) | SBOX[value & 0xf];
  INV_SBOX_BYTE[value] = (INV_SBOX[value >>> 4] << 4) | INV_SBOX[value & 0xf];
  for (let position = 0; position < 8; position++) {
    const index = position * 256 + value;
    const [spHi, spLo] = pLayer(...placeByte(substituted, position));
    SP_HI[index] = spHi;
    SP_LO[index] = spLo;
    const [ipHi, ipLo] = invPLayer(...placeByte(value, position));
    IP_HI[index] = ipHi;
    IP_LO[index] = ipLo;
  }
}

/** Bytes of lookup tables used by the fast path (reported as implementation memory). */
export const TABLE_BYTES = SP_HI.byteLength + SP_LO.byteLength + IP_HI.byteLength + IP_LO.byteLength + INV_SBOX_BYTE.byteLength;

// ---------------------------------------------------------------------------
// Key schedule (Section 3 of the PRESENT paper).
// ---------------------------------------------------------------------------

const MASK_64 = (1n << 64n) - 1n;

function bytesToBigInt(bytes) {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

/** Returns { hi, lo } Uint32Arrays holding the 32 round keys K1..K32. */
export function expandKey(key) {
  if (!(key instanceof Uint8Array) || (key.length !== 10 && key.length !== 16)) {
    throw new RangeError('PRESENT requires a 10-byte (80-bit) or 16-byte (128-bit) key');
  }
  const keyBits = BigInt(key.length * 8);
  const mask = (1n << keyBits) - 1n;
  let register = bytesToBigInt(key);
  const hi = new Uint32Array(ROUNDS + 1);
  const lo = new Uint32Array(ROUNDS + 1);

  for (let round = 1; round <= ROUNDS + 1; round++) {
    // Round key K_i = the leftmost 64 bits of the key register.
    const roundKey = (register >> (keyBits - 64n)) & MASK_64;
    hi[round - 1] = Number(roundKey >> 32n);
    lo[round - 1] = Number(roundKey & 0xffffffffn);
    if (round === ROUNDS + 1) break;

    // 1. Rotate the register 61 bit positions to the left.
    register = ((register << 61n) | (register >> (keyBits - 61n))) & mask;
    if (keyBits === 80n) {
      // 2. S-box on the leftmost nibble [k79..k76].
      const top = Number(register >> 76n);
      register = (register & ((1n << 76n) - 1n)) | (BigInt(SBOX[top]) << 76n);
      // 3. XOR the round counter into bits [k19..k15].
      register ^= BigInt(round) << 15n;
    } else {
      // 2. S-box on the two leftmost nibbles [k127..k124] and [k123..k120].
      const first = Number(register >> 124n);
      const second = Number((register >> 120n) & 0xfn);
      register = (register & ((1n << 120n) - 1n)) | (BigInt(SBOX[first]) << 124n) | (BigInt(SBOX[second]) << 120n);
      // 3. XOR the round counter into bits [k66..k62].
      register ^= BigInt(round) << 62n;
    }
  }
  return { hi, lo };
}

// ---------------------------------------------------------------------------
// Block encryption / decryption (fast, table-based).
// ---------------------------------------------------------------------------

export function encryptBlock(roundKeys, src, srcOffset, dst, dstOffset) {
  const rkHi = roundKeys.hi;
  const rkLo = roundKeys.lo;
  let hi = readU32BE(src, srcOffset);
  let lo = readU32BE(src, srcOffset + 4);
  for (let round = 0; round < ROUNDS; round++) {
    const a = (hi ^ rkHi[round]) >>> 0;
    const b = (lo ^ rkLo[round]) >>> 0;
    hi =
      SP_HI[b & 0xff] ^ SP_HI[256 + ((b >>> 8) & 0xff)] ^ SP_HI[512 + ((b >>> 16) & 0xff)] ^ SP_HI[768 + (b >>> 24)] ^
      SP_HI[1024 + (a & 0xff)] ^ SP_HI[1280 + ((a >>> 8) & 0xff)] ^ SP_HI[1536 + ((a >>> 16) & 0xff)] ^ SP_HI[1792 + (a >>> 24)];
    lo =
      SP_LO[b & 0xff] ^ SP_LO[256 + ((b >>> 8) & 0xff)] ^ SP_LO[512 + ((b >>> 16) & 0xff)] ^ SP_LO[768 + (b >>> 24)] ^
      SP_LO[1024 + (a & 0xff)] ^ SP_LO[1280 + ((a >>> 8) & 0xff)] ^ SP_LO[1536 + ((a >>> 16) & 0xff)] ^ SP_LO[1792 + (a >>> 24)];
  }
  writeU32BE(dst, dstOffset, (hi ^ rkHi[ROUNDS]) >>> 0);
  writeU32BE(dst, dstOffset + 4, (lo ^ rkLo[ROUNDS]) >>> 0);
}

function invSBoxWord(word) {
  return (
    ((INV_SBOX_BYTE[word >>> 24] << 24) |
      (INV_SBOX_BYTE[(word >>> 16) & 0xff] << 16) |
      (INV_SBOX_BYTE[(word >>> 8) & 0xff] << 8) |
      INV_SBOX_BYTE[word & 0xff]) >>>
    0
  );
}

export function decryptBlock(roundKeys, src, srcOffset, dst, dstOffset) {
  const rkHi = roundKeys.hi;
  const rkLo = roundKeys.lo;
  let hi = (readU32BE(src, srcOffset) ^ rkHi[ROUNDS]) >>> 0;
  let lo = (readU32BE(src, srcOffset + 4) ^ rkLo[ROUNDS]) >>> 0;
  for (let round = ROUNDS - 1; round >= 0; round--) {
    const a = hi;
    const b = lo;
    const pHi =
      IP_HI[b & 0xff] ^ IP_HI[256 + ((b >>> 8) & 0xff)] ^ IP_HI[512 + ((b >>> 16) & 0xff)] ^ IP_HI[768 + (b >>> 24)] ^
      IP_HI[1024 + (a & 0xff)] ^ IP_HI[1280 + ((a >>> 8) & 0xff)] ^ IP_HI[1536 + ((a >>> 16) & 0xff)] ^ IP_HI[1792 + (a >>> 24)];
    const pLo =
      IP_LO[b & 0xff] ^ IP_LO[256 + ((b >>> 8) & 0xff)] ^ IP_LO[512 + ((b >>> 16) & 0xff)] ^ IP_LO[768 + (b >>> 24)] ^
      IP_LO[1024 + (a & 0xff)] ^ IP_LO[1280 + ((a >>> 8) & 0xff)] ^ IP_LO[1536 + ((a >>> 16) & 0xff)] ^ IP_LO[1792 + (a >>> 24)];
    hi = (invSBoxWord(pHi >>> 0) ^ rkHi[round]) >>> 0;
    lo = (invSBoxWord(pLo >>> 0) ^ rkLo[round]) >>> 0;
  }
  writeU32BE(dst, dstOffset, hi);
  writeU32BE(dst, dstOffset + 4, lo);
}

/** Specification-level encryption of one block given as [hi, lo]; used by the tests. */
export function encryptBlockReference(roundKeys, hi, lo) {
  let state = [hi, lo];
  for (let round = 0; round < ROUNDS; round++) {
    state = [(state[0] ^ roundKeys.hi[round]) >>> 0, (state[1] ^ roundKeys.lo[round]) >>> 0];
    state = sBoxLayer(...state);
    state = pLayer(...state);
  }
  return [(state[0] ^ roundKeys.hi[ROUNDS]) >>> 0, (state[1] ^ roundKeys.lo[ROUNDS]) >>> 0];
}

export function createCipher(variantId, key) {
  const variant = VARIANTS[variantId];
  if (!variant) throw new RangeError(`Unknown PRESENT variant: ${variantId}`);
  if (!(key instanceof Uint8Array) || key.length * 8 !== variant.keyBits) {
    throw new RangeError(`${variant.name} requires a ${variant.keyBits / 8}-byte key`);
  }
  const roundKeys = expandKey(key);
  return {
    blockSize: 8,
    roundKeyBytes: roundKeys.hi.byteLength + roundKeys.lo.byteLength,
    tableBytes: TABLE_BYTES,
    encryptBlock: (src, srcOffset, dst, dstOffset) => encryptBlock(roundKeys, src, srcOffset, dst, dstOffset),
    decryptBlock: (src, srcOffset, dst, dstOffset) => decryptBlock(roundKeys, src, srcOffset, dst, dstOffset),
  };
}

/**
 * Known-answer test vectors (big-endian hex).
 * PRESENT-80: Appendix I of the PRESENT paper (CHES 2007).
 * PRESENT-128: not printed in the original paper; these are the vectors used by the
 * OpenTitan project's PRESENT implementation tests (opentitanlib util/present.rs), which
 * cite the Ruhr-Universitaet Bochum reference test-vector archive.
 */
const PAPER = 'Bogdanov et al., CHES 2007, Appendix I';
const OPENTITAN = 'OpenTitan opentitanlib present.rs tests (RUB reference vectors)';

export const TEST_VECTORS = Object.freeze([
  { variant: '80', key: '00000000000000000000', plaintext: '0000000000000000', ciphertext: '5579c1387b228445', source: PAPER },
  { variant: '80', key: 'ffffffffffffffffffff', plaintext: '0000000000000000', ciphertext: 'e72c46c0f5945049', source: PAPER },
  { variant: '80', key: '00000000000000000000', plaintext: 'ffffffffffffffff', ciphertext: 'a112ffc72f68417b', source: PAPER },
  { variant: '80', key: 'ffffffffffffffffffff', plaintext: 'ffffffffffffffff', ciphertext: '3333dcd3213210d2', source: PAPER },
  { variant: '128', key: '00000000000000000000000000000000', plaintext: '0000000000000000', ciphertext: '96db702a2e6900af', source: OPENTITAN },
  { variant: '128', key: 'ffffffffffffffffffffffffffffffff', plaintext: '0000000000000000', ciphertext: '13238c710272a5d8', source: OPENTITAN },
  { variant: '128', key: '00000000000000000000000000000000', plaintext: 'ffffffffffffffff', ciphertext: '3c6019e5e5edd563', source: OPENTITAN },
  { variant: '128', key: 'ffffffffffffffffffffffffffffffff', plaintext: 'ffffffffffffffff', ciphertext: '628d9fbd4218e5b4', source: OPENTITAN },
].map(Object.freeze));

export default Object.freeze({
  id: 'PRESENT',
  name: 'PRESENT',
  variants: VARIANTS,
  defaultVariant: DEFAULT_VARIANT,
  byteOrder: 'Big-endian (block byte 0 = state bits 63..56; key byte 0 = most significant key bits)',
  createCipher,
  testVectors: TEST_VECTORS,
});
