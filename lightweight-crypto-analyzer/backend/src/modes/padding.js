/**
 * PKCS#7 padding (RFC 5652, section 6.3).
 * Appends N bytes of value N (1 <= N <= blockSize) so the length becomes a multiple of
 * the block size. A full block of padding is added when the input is already aligned,
 * so the padding can always be removed unambiguously.
 */
import { DecryptionError } from '../utils/errors.js';

export function paddedLength(length, blockSize) {
  return length + (blockSize - (length % blockSize));
}

export function pkcs7Pad(data, blockSize) {
  const total = paddedLength(data.length, blockSize);
  const out = Buffer.alloc(total, total - data.length);
  out.set(data, 0);
  return out;
}

export function pkcs7Unpad(data, blockSize) {
  if (data.length === 0 || data.length % blockSize !== 0) {
    throw new DecryptionError('Padded data length is not a multiple of the block size.', 'INVALID_PADDING');
  }
  const padLength = data[data.length - 1];
  let valid = padLength >= 1 && padLength <= blockSize;
  for (let i = 1; valid && i <= padLength; i++) {
    if (data[data.length - i] !== padLength) valid = false;
  }
  if (!valid) {
    throw new DecryptionError(
      'Invalid PKCS#7 padding after decryption. The key, algorithm, variant or mode probably does not match the one used for encryption, or the ciphertext was modified.',
      'INVALID_PADDING',
    );
  }
  return data.subarray(0, data.length - padLength);
}
