/**
 * Encryption, decryption and key generation for the /api/encrypt, /api/decrypt and
 * /api/keys endpoints. Keys and plaintext are never logged.
 */
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import config from '../config.js';
import * as blockModes from '../modes/blockModes.js';
import { paddedLength } from '../modes/padding.js';
import { assertByteFormat, decodeBytes, decodeUtf8, encodeBytes, parseHex } from '../utils/encoding.js';
import { ValidationError } from '../utils/errors.js';
import { throughputBytesPerSecond } from '../utils/stats.js';
import { resolveTarget } from './algorithmService.js';

const SINGLE_OPERATION_NOTE =
  'Single operation timed on the server with performance.now(), excluding HTTP and JSON handling. Single measurements are noisy; use the Benchmark page for repeated, statistically summarised measurements.';

export function parseKey(keyHex, variant) {
  if (keyHex === undefined || keyHex === null || (typeof keyHex === 'string' && keyHex.trim() === '')) {
    throw new ValidationError(`key is required: ${variant.name} uses a ${variant.keyBits}-bit key (${variant.keyBits / 4} hex characters).`, {
      field: 'key',
    });
  }
  const key = parseHex(keyHex, 'key');
  if (key.length * 8 !== variant.keyBits) {
    throw new ValidationError(
      `Invalid key length for ${variant.name}: expected ${variant.keyBits} bits (${variant.keyBits / 4} hex characters), received ${key.length * 8} bits (${key.length * 2} hex characters).`,
      { field: 'key', expectedHexLength: variant.keyBits / 4 },
    );
  }
  return key;
}

function resolveIv(ivHex, mode, blockSize) {
  const provided = ivHex !== undefined && ivHex !== null && ivHex !== '';
  if (!mode.usesIv) {
    if (provided) throw new ValidationError(`${mode.id} mode does not use an IV; remove the iv field.`, { field: 'iv' });
    return null;
  }
  if (!provided) return randomBytes(blockSize);
  const iv = parseHex(ivHex, 'iv');
  if (iv.length !== blockSize) {
    throw new ValidationError(`iv must be exactly ${blockSize} bytes (${blockSize * 2} hex characters) for this cipher.`, { field: 'iv' });
  }
  return iv;
}

export function blockSizeWarnings(variant) {
  if (variant.blockBits <= 32) {
    return [
      `${variant.name} has a ${variant.blockBits}-bit block. Block collisions become likely after about 2^16 blocks (256 KiB) under one key, so it is unsuitable for encrypting large amounts of data.`,
    ];
  }
  return [];
}

function assertPlaintext(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new ValidationError('plaintext must be a string.', { field: 'plaintext' });
  }
  if (plaintext.length === 0) {
    throw new ValidationError('plaintext must not be empty.', { field: 'plaintext' });
  }
  const bytes = Buffer.from(plaintext, 'utf8');
  if (bytes.length > config.limits.maxPlaintextBytes) {
    throw new ValidationError(
      `plaintext is too large: ${bytes.length} bytes (maximum ${config.limits.maxPlaintextBytes} bytes).`,
      { field: 'plaintext', maxBytes: config.limits.maxPlaintextBytes },
    );
  }
  return bytes;
}

export function generateKey({ algorithm: algorithmName, variant: variantId } = {}) {
  const { algorithm, variant } = resolveTarget(algorithmName, variantId);
  const key = randomBytes(variant.keyBits / 8);
  return {
    success: true,
    algorithm: algorithm.id,
    variant: variant.id,
    displayName: variant.name,
    keyBits: variant.keyBits,
    key: key.toString('hex'),
    format: 'hex',
    note: 'Generated with crypto.randomBytes on the server. Keep the key secret; anyone holding it can decrypt the ciphertext.',
  };
}

export function encryptMessage(input = {}) {
  const { algorithm, variant } = resolveTarget(input.algorithm, input.variant);
  const mode = blockModes.findMode(input.mode);
  const outputFormat = input.outputFormat ?? 'hex';
  assertByteFormat(outputFormat, 'outputFormat');
  const plaintext = assertPlaintext(input.plaintext);
  const key = parseKey(input.key, variant);

  const keySetupStart = performance.now();
  const cipher = algorithm.createCipher(variant.id, key);
  const keySetupMs = performance.now() - keySetupStart;

  const iv = resolveIv(input.iv, mode, cipher.blockSize);

  const encryptStart = performance.now();
  const output = blockModes.encrypt(mode.id, cipher, plaintext, iv);
  const encryptionMs = performance.now() - encryptStart;

  const ciphertext = encodeBytes(output, outputFormat);
  const paddingBytes = mode.padding === 'none' ? 0 : paddedLength(plaintext.length, cipher.blockSize) - plaintext.length;

  return {
    success: true,
    algorithm: algorithm.id,
    variant: variant.id,
    displayName: variant.name,
    mode: mode.id,
    padding: mode.padding,
    layout: mode.layout,
    outputFormat,
    ciphertext,
    iv: iv ? iv.toString('hex') : null,
    sizes: {
      blockBytes: cipher.blockSize,
      plaintextBytes: plaintext.length,
      paddingBytes,
      ivBytes: iv ? iv.length : 0,
      rawCiphertextBytes: output.length,
      encodedCiphertextChars: ciphertext.length,
    },
    timing: {
      keySetupMs,
      encryptionMs,
      throughputBytesPerSec: throughputBytesPerSecond(plaintext.length, encryptionMs),
      note: SINGLE_OPERATION_NOTE,
    },
    warnings: [mode.warning, ...blockSizeWarnings(variant)],
  };
}

export function decryptMessage(input = {}) {
  const { algorithm, variant } = resolveTarget(input.algorithm, input.variant);
  const mode = blockModes.findMode(input.mode);
  const inputFormat = input.inputFormat ?? 'hex';
  assertByteFormat(inputFormat, 'inputFormat');

  if (typeof input.ciphertext !== 'string' || input.ciphertext.trim() === '') {
    throw new ValidationError('ciphertext is required and must be a non-empty string.', { field: 'ciphertext' });
  }
  const data = decodeBytes(input.ciphertext, inputFormat, 'ciphertext');
  const maxCiphertextBytes = config.limits.maxPlaintextBytes + 2 * (variant.blockBits / 8);
  if (data.length > maxCiphertextBytes) {
    throw new ValidationError(`ciphertext is too large: ${data.length} bytes (maximum ${maxCiphertextBytes} bytes).`, { field: 'ciphertext' });
  }
  const key = parseKey(input.key, variant);

  const keySetupStart = performance.now();
  const cipher = algorithm.createCipher(variant.id, key);
  const keySetupMs = performance.now() - keySetupStart;

  const decryptStart = performance.now();
  const plaintext = blockModes.decrypt(mode.id, cipher, data);
  const decryptionMs = performance.now() - decryptStart;

  const { text, valid } = decodeUtf8(plaintext);
  const warnings = [mode.warning, ...blockSizeWarnings(variant)];
  if (!valid) {
    warnings.unshift(
      'The recovered bytes are not valid UTF-8 text. The key, variant or mode may not match the ones used for encryption; without authentication the cipher cannot detect this reliably.',
    );
  }

  let verification = null;
  if (typeof input.expectedPlaintext === 'string') {
    const matches = Buffer.from(input.expectedPlaintext, 'utf8').equals(plaintext);
    verification = {
      matches,
      message: matches
        ? 'Recovered plaintext is byte-for-byte identical to the original.'
        : 'Recovered plaintext does NOT match the original.',
    };
  }

  return {
    success: true,
    algorithm: algorithm.id,
    variant: variant.id,
    displayName: variant.name,
    mode: mode.id,
    inputFormat,
    plaintext: text,
    plaintextHex: plaintext.toString('hex'),
    validUtf8: valid,
    verification,
    sizes: {
      blockBytes: cipher.blockSize,
      ciphertextBytes: data.length,
      ivBytes: mode.usesIv ? cipher.blockSize : 0,
      plaintextBytes: plaintext.length,
    },
    timing: {
      keySetupMs,
      decryptionMs,
      throughputBytesPerSec: throughputBytesPerSecond(plaintext.length, decryptionMs),
      note: SINGLE_OPERATION_NOTE,
    },
    warnings,
  };
}
