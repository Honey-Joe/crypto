/**
 * Runs every known-answer test vector and a round-trip check in each block mode when the
 * server starts. A variant is only offered by the API when all of its checks pass, so the
 * "implemented" status shown in the UI is derived from real test results.
 */
import { randomBytes } from 'node:crypto';
import { ALGORITHMS } from '../algorithms/index.js';
import * as blockModes from '../modes/blockModes.js';

let cachedReport = null;

function runVector(algorithm, vector) {
  try {
    const cipher = algorithm.createCipher(vector.variant, Buffer.from(vector.key, 'hex'));
    const encrypted = Buffer.alloc(cipher.blockSize);
    const decrypted = Buffer.alloc(cipher.blockSize);
    cipher.encryptBlock(Buffer.from(vector.plaintext, 'hex'), 0, encrypted, 0);
    cipher.decryptBlock(Buffer.from(vector.ciphertext, 'hex'), 0, decrypted, 0);
    const encryptOk = encrypted.toString('hex') === vector.ciphertext;
    const decryptOk = decrypted.toString('hex') === vector.plaintext;
    return {
      variant: vector.variant,
      key: vector.key,
      plaintext: vector.plaintext,
      expectedCiphertext: vector.ciphertext,
      actualCiphertext: encrypted.toString('hex'),
      encryptOk,
      decryptOk,
      passed: encryptOk && decryptOk,
      source: vector.source,
      paperNotation: vector.paperNotation,
    };
  } catch (error) {
    return { variant: vector.variant, passed: false, error: error.message, source: vector.source };
  }
}

function runRoundTrips(algorithm, variant) {
  const results = [];
  for (const modeId of blockModes.MODE_IDS) {
    // Lengths cover empty-tail, aligned and unaligned messages.
    for (const length of [1, 7, 8, 16, 37]) {
      try {
        const key = randomBytes(variant.keyBits / 8);
        const cipher = algorithm.createCipher(variant.id, key);
        const plaintext = randomBytes(length);
        const iv = blockModes.MODES[modeId].usesIv ? randomBytes(cipher.blockSize) : undefined;
        const ciphertext = blockModes.encrypt(modeId, cipher, plaintext, iv);
        const recovered = blockModes.decrypt(modeId, cipher, ciphertext);
        results.push({ mode: modeId, length, passed: recovered.equals(plaintext) });
      } catch (error) {
        results.push({ mode: modeId, length, passed: false, error: error.message });
      }
    }
  }
  return results;
}

export function runSelfTests() {
  const checkedAt = new Date().toISOString();
  const algorithms = {};
  for (const algorithm of Object.values(ALGORITHMS)) {
    const vectors = algorithm.testVectors.map((vector) => runVector(algorithm, vector));
    const variants = {};
    for (const variant of Object.values(algorithm.variants)) {
      const variantVectors = vectors.filter((result) => result.variant === variant.id);
      const roundTrips = runRoundTrips(algorithm, variant);
      const vectorsPassed = variantVectors.filter((result) => result.passed).length;
      const roundTripsPassed = roundTrips.filter((result) => result.passed).length;
      variants[variant.id] = {
        vectorsTotal: variantVectors.length,
        vectorsPassed,
        roundTripsTotal: roundTrips.length,
        roundTripsPassed,
        // A variant without any known-answer vector cannot be verified.
        verified: variantVectors.length > 0 && vectorsPassed === variantVectors.length && roundTripsPassed === roundTrips.length,
      };
    }
    const variantStatus = Object.values(variants);
    algorithms[algorithm.id] = {
      checkedAt,
      vectors,
      variants,
      vectorsTotal: vectors.length,
      vectorsPassed: vectors.filter((result) => result.passed).length,
      allVariantsVerified: variantStatus.every((status) => status.verified),
      anyVariantVerified: variantStatus.some((status) => status.verified),
    };
  }
  cachedReport = { checkedAt, algorithms };
  return cachedReport;
}

export function getSelfTestReport() {
  return cachedReport ?? runSelfTests();
}

export function isVariantVerified(algorithmId, variantId) {
  return Boolean(getSelfTestReport().algorithms[algorithmId]?.variants[variantId]?.verified);
}
