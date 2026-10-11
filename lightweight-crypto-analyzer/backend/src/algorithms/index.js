/**
 * Registry of implemented block ciphers. Every module exposes the same interface:
 *   { id, name, variants, defaultVariant, byteOrder, createCipher(variantId, keyBytes), testVectors }
 * createCipher() returns { blockSize, roundKeyBytes, encryptBlock(), decryptBlock() }.
 */
import PRESENT from './present.js';
import SIMON from './simon.js';
import SPECK from './speck.js';
import XTEA from './xtea.js';

export const ALGORITHMS = Object.freeze({
  PRESENT,
  SIMON,
  SPECK,
  XTEA,
});

export const ALGORITHM_IDS = Object.freeze(Object.keys(ALGORITHMS));

/** Case-insensitive lookup; returns undefined for unknown names. */
export function findAlgorithm(name) {
  if (typeof name !== 'string') return undefined;
  return ALGORITHMS[name.trim().toUpperCase()];
}
