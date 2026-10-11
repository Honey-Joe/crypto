// Client-side checks that mirror the API's rules, so users get feedback before submitting.
// The server validates everything again; these checks are a convenience only.

export const MAX_PLAINTEXT_BYTES = 65536;

const encoder = new TextEncoder();

export function utf8Length(text) {
  return encoder.encode(text).length;
}

/** Returns an error message for a hex key, or null when it is valid. */
export function validateHexKey(value, expectedHexLength) {
  const key = value.replace(/\s+/g, '');
  if (!key) return 'A key is required.';
  if (!/^[0-9a-fA-F]*$/.test(key)) return 'The key may only contain hexadecimal characters (0-9, a-f).';
  if (key.length !== expectedHexLength) {
    return `Expected ${expectedHexLength} hex characters (${expectedHexLength * 4} bits); currently ${key.length}.`;
  }
  return null;
}

export function validatePlaintext(text) {
  if (!text) return 'Enter a message to encrypt.';
  const bytes = utf8Length(text);
  if (bytes > MAX_PLAINTEXT_BYTES) return `The message is ${bytes} bytes; the maximum is ${MAX_PLAINTEXT_BYTES} bytes.`;
  return null;
}

export function validateCiphertext(text, format) {
  const value = text.replace(/\s+/g, '');
  if (!value) return 'Paste the ciphertext to decrypt.';
  if (format === 'hex' && !/^[0-9a-fA-F]*$/.test(value)) return 'Hex ciphertext may only contain 0-9 and a-f.';
  if (format === 'hex' && value.length % 2 !== 0) return 'Hex ciphertext must have an even number of characters.';
  if (format === 'base64' && !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return 'Base64 ciphertext may only contain A-Z, a-z, 0-9, +, / and = padding.';
  return null;
}
