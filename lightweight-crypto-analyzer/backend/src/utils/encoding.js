import { ValidationError } from './errors.js';

export const BYTE_FORMATS = Object.freeze(['hex', 'base64']);

const HEX_PATTERN = /^[0-9a-fA-F]*$/;
// Standard (RFC 4648 section 4) Base64 with mandatory padding.
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function assertByteFormat(format, fieldName = 'format') {
  if (!BYTE_FORMATS.includes(format)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${BYTE_FORMATS.join(', ')}.`,
      { field: fieldName, allowed: BYTE_FORMATS },
    );
  }
}

/** Strictly parses a hex string. Whitespace and an optional 0x prefix are ignored. */
export function parseHex(value, fieldName = 'value') {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a hexadecimal string.`, { field: fieldName });
  }
  let hex = value.replace(/\s+/g, '');
  if (hex.startsWith('0x') || hex.startsWith('0X')) hex = hex.slice(2);
  if (!HEX_PATTERN.test(hex)) {
    throw new ValidationError(`${fieldName} contains characters that are not hexadecimal (0-9, a-f).`, {
      field: fieldName,
    });
  }
  if (hex.length % 2 !== 0) {
    throw new ValidationError(`${fieldName} must contain an even number of hex digits (two per byte).`, {
      field: fieldName,
    });
  }
  return Buffer.from(hex, 'hex');
}

/** Strictly parses standard padded Base64. Whitespace is ignored. */
export function parseBase64(value, fieldName = 'value') {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a Base64 string.`, { field: fieldName });
  }
  const b64 = value.replace(/\s+/g, '');
  if (b64.length % 4 !== 0 || !BASE64_PATTERN.test(b64)) {
    throw new ValidationError(
      `${fieldName} is not valid Base64 (expected characters A-Z, a-z, 0-9, +, / with = padding).`,
      { field: fieldName },
    );
  }
  return Buffer.from(b64, 'base64');
}

export function decodeBytes(value, format, fieldName = 'value') {
  assertByteFormat(format, `${fieldName} format`);
  return format === 'hex' ? parseHex(value, fieldName) : parseBase64(value, fieldName);
}

export function encodeBytes(bytes, format) {
  assertByteFormat(format);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(format);
}

/** Number of characters needed to encode `byteLength` bytes in the given format. */
export function encodedLength(byteLength, format) {
  return format === 'hex' ? byteLength * 2 : 4 * Math.ceil(byteLength / 3);
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

/** Decodes UTF-8, reporting whether the bytes were valid (invalid bytes become U+FFFD). */
export function decodeUtf8(bytes) {
  try {
    return { text: strictUtf8.decode(bytes), valid: true };
  } catch {
    return { text: Buffer.from(bytes).toString('utf8'), valid: false };
  }
}
