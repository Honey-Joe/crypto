/**
 * Block-cipher modes of operation (NIST SP 800-38A) built on the common cipher interface
 * { blockSize, encryptBlock(src, srcOffset, dst, dstOffset), decryptBlock(...) }.
 *
 * Ciphertext layout produced here:
 *   CBC : IV || C   (random IV of one block, PKCS#7 padding)
 *   CTR : IV || C   (random initial counter block, no padding; counter is incremented as a
 *                    big-endian integer over the whole block)
 *   ECB : C         (PKCS#7 padding, no IV) - insecure, offered only for demonstration
 *
 * None of these modes provides integrity or authenticity.
 */
import { DecryptionError, ValidationError } from '../utils/errors.js';
import { paddedLength, pkcs7Unpad } from './padding.js';

export const MODES = Object.freeze({
  CBC: Object.freeze({
    id: 'CBC',
    name: 'Cipher Block Chaining',
    usesIv: true,
    padding: 'PKCS#7',
    layout: 'IV || ciphertext',
    description:
      'Each plaintext block is XORed with the previous ciphertext block before encryption. A fresh random IV makes identical messages encrypt differently.',
    warning: 'CBC provides confidentiality only. It does not detect modification of the ciphertext.',
  }),
  CTR: Object.freeze({
    id: 'CTR',
    name: 'Counter',
    usesIv: true,
    padding: 'none',
    layout: 'IV (initial counter block) || ciphertext',
    description:
      'The cipher encrypts successive counter values to produce a keystream that is XORed with the plaintext. No padding is needed, so the ciphertext is the same length as the plaintext.',
    warning:
      'CTR provides confidentiality only, and flipping a ciphertext bit flips the same plaintext bit. A counter block must never repeat under the same key; with 32- or 64-bit blocks a random starting counter makes repeats far more likely than with 128-bit blocks.',
  }),
  ECB: Object.freeze({
    id: 'ECB',
    name: 'Electronic Codebook',
    usesIv: false,
    padding: 'PKCS#7',
    layout: 'ciphertext (no IV)',
    description: 'Every block is encrypted independently with the same key.',
    warning:
      'ECB is insecure for almost all uses: identical plaintext blocks produce identical ciphertext blocks, revealing patterns. It is included only to demonstrate this weakness.',
  }),
});

export const MODE_IDS = Object.freeze(Object.keys(MODES));
export const DEFAULT_MODE = 'CBC';

export function findMode(modeId) {
  if (modeId === undefined || modeId === null || modeId === '') return MODES[DEFAULT_MODE];
  const mode = typeof modeId === 'string' ? MODES[modeId.trim().toUpperCase()] : undefined;
  if (!mode) {
    throw new ValidationError(`mode must be one of: ${MODE_IDS.join(', ')}.`, { field: 'mode', allowed: MODE_IDS });
  }
  return mode;
}

/** Length in bytes of the full output (including IV) for a plaintext of the given length. */
export function outputLength(modeId, plaintextLength, blockSize) {
  switch (modeId) {
    case 'CBC':
      return blockSize + paddedLength(plaintextLength, blockSize);
    case 'CTR':
      return blockSize + plaintextLength;
    case 'ECB':
      return paddedLength(plaintextLength, blockSize);
    default:
      throw new RangeError(`Unknown mode ${modeId}`);
  }
}

function incrementCounter(counter) {
  for (let i = counter.length - 1; i >= 0; i--) {
    counter[i] = (counter[i] + 1) & 0xff;
    if (counter[i] !== 0) break;
  }
}

function assertIv(iv, blockSize) {
  if (!(iv instanceof Uint8Array) || iv.length !== blockSize) {
    throw new RangeError(`IV must be exactly ${blockSize} bytes`);
  }
}

// ---- Encryption ------------------------------------------------------------------------

function encryptEcb(cipher, plaintext) {
  const bs = cipher.blockSize;
  const total = paddedLength(plaintext.length, bs);
  const out = Buffer.allocUnsafe(total);
  out.set(plaintext, 0);
  out.fill(total - plaintext.length, plaintext.length);
  for (let offset = 0; offset < total; offset += bs) {
    cipher.encryptBlock(out, offset, out, offset);
  }
  return out;
}

function encryptCbc(cipher, plaintext, iv) {
  const bs = cipher.blockSize;
  assertIv(iv, bs);
  const total = paddedLength(plaintext.length, bs);
  const out = Buffer.allocUnsafe(bs + total);
  out.set(iv, 0);
  out.set(plaintext, bs);
  out.fill(total - plaintext.length, bs + plaintext.length);
  for (let offset = bs; offset < out.length; offset += bs) {
    // XOR with the previous ciphertext block (the IV for the first block), then encrypt in place.
    for (let i = 0; i < bs; i++) out[offset + i] ^= out[offset - bs + i];
    cipher.encryptBlock(out, offset, out, offset);
  }
  return out;
}

function ctrTransform(cipher, input, inputOffset, length, initialCounter, out, outOffset) {
  const bs = cipher.blockSize;
  const counter = Buffer.from(initialCounter);
  const keystream = Buffer.allocUnsafe(bs);
  for (let position = 0; position < length; position += bs) {
    cipher.encryptBlock(counter, 0, keystream, 0);
    const chunk = Math.min(bs, length - position);
    for (let i = 0; i < chunk; i++) {
      out[outOffset + position + i] = input[inputOffset + position + i] ^ keystream[i];
    }
    incrementCounter(counter);
  }
}

function encryptCtr(cipher, plaintext, iv) {
  const bs = cipher.blockSize;
  assertIv(iv, bs);
  const out = Buffer.allocUnsafe(bs + plaintext.length);
  out.set(iv, 0);
  ctrTransform(cipher, plaintext, 0, plaintext.length, iv, out, bs);
  return out;
}

/** Encrypts `plaintext` (Uint8Array) and returns the full output buffer described above. */
export function encrypt(modeId, cipher, plaintext, iv) {
  switch (modeId) {
    case 'CBC':
      return encryptCbc(cipher, plaintext, iv);
    case 'CTR':
      return encryptCtr(cipher, plaintext, iv);
    case 'ECB':
      return encryptEcb(cipher, plaintext);
    default:
      throw new RangeError(`Unknown mode ${modeId}`);
  }
}

// ---- Decryption ------------------------------------------------------------------------

function blockMultipleError(bs, minimumBlocks, what) {
  return new DecryptionError(
    `Ciphertext length is invalid: it must be a non-zero multiple of ${bs} bytes and contain at least ${minimumBlocks} block(s) (${what}).`,
    'INVALID_CIPHERTEXT_LENGTH',
  );
}

function decryptEcb(cipher, data) {
  const bs = cipher.blockSize;
  if (data.length === 0 || data.length % bs !== 0) throw blockMultipleError(bs, 1, 'ECB ciphertext');
  const out = Buffer.allocUnsafe(data.length);
  for (let offset = 0; offset < data.length; offset += bs) {
    cipher.decryptBlock(data, offset, out, offset);
  }
  return pkcs7Unpad(out, bs);
}

function decryptCbc(cipher, data) {
  const bs = cipher.blockSize;
  if (data.length < 2 * bs || data.length % bs !== 0) throw blockMultipleError(bs, 2, 'IV + at least one ciphertext block');
  const out = Buffer.allocUnsafe(data.length - bs);
  for (let offset = bs; offset < data.length; offset += bs) {
    cipher.decryptBlock(data, offset, out, offset - bs);
    for (let i = 0; i < bs; i++) out[offset - bs + i] ^= data[offset - bs + i];
  }
  return pkcs7Unpad(out, bs);
}

function decryptCtr(cipher, data) {
  const bs = cipher.blockSize;
  if (data.length <= bs) {
    throw new DecryptionError(
      `Ciphertext is too short: CTR output must contain the ${bs}-byte initial counter block followed by at least one byte.`,
      'INVALID_CIPHERTEXT_LENGTH',
    );
  }
  const length = data.length - bs;
  const out = Buffer.allocUnsafe(length);
  ctrTransform(cipher, data, bs, length, data.subarray(0, bs), out, 0);
  return out;
}

/** Decrypts the full output produced by encrypt(); throws DecryptionError on bad input. */
export function decrypt(modeId, cipher, data) {
  switch (modeId) {
    case 'CBC':
      return decryptCbc(cipher, data);
    case 'CTR':
      return decryptCtr(cipher, data);
    case 'ECB':
      return decryptEcb(cipher, data);
    default:
      throw new RangeError(`Unknown mode ${modeId}`);
  }
}
