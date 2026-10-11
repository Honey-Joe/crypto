// Helpers for reading and writing fixed-width words from byte arrays.
// Each cipher module documents which byte order it uses.

export function readU32BE(bytes, offset) {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

export function writeU32BE(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

export function readU32LE(bytes, offset) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

export function writeU32LE(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

export function readU16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function writeU16LE(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

/** Converts a hex string (no validation beyond what Buffer does) to a Buffer. */
export function hexToBytes(hex) {
  return Buffer.from(hex.replace(/\s+/g, ''), 'hex');
}

export function bytesToHex(bytes) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('hex');
}

/**
 * Converts words written most-significant-word first (the notation used in the
 * SIMON/SPECK paper, e.g. key "1b1a1918 13121110 0b0a0908 03020100") into the
 * little-endian byte string defined by the SIMON and SPECK Implementation Guide:
 * the last word comes first and every word is stored least-significant byte first.
 */
export function paperWordsToLittleEndianBytes(words) {
  const parts = [...words].reverse().map((word) => Buffer.from(word, 'hex').reverse());
  return Buffer.concat(parts);
}
