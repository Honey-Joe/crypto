import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';
import SIMON from '../src/algorithms/simon.js';
import SPECK from '../src/algorithms/speck.js';
import { paperWordsToLittleEndianBytes } from '../src/utils/bytes.js';
import { assertBlockRoundTrips, assertKnownAnswer } from './helpers.js';

describe('paper notation to byte conversion', () => {
  test('follows the SIMON and SPECK Implementation Guide byte order', () => {
    // Key 1b1a1918 13121110 0b0a0908 03020100 is the byte string 00 01 02 03 08 09 ...
    assert.equal(
      paperWordsToLittleEndianBytes(['1b1a1918', '13121110', '0b0a0908', '03020100']).toString('hex'),
      '0001020308090a0b1011121318191a1b',
    );
  });

  test('SIMON-64/128 and SPECK-64/128 plaintexts decode to the ASCII strings in the guide', () => {
    const simon = SIMON.testVectors.find((vector) => vector.variant === '64/128');
    const speck = SPECK.testVectors.find((vector) => vector.variant === '64/128');
    assert.equal(Buffer.from(simon.plaintext, 'hex').toString('latin1'), 'und like');
    assert.equal(Buffer.from(speck.plaintext, 'hex').toString('latin1'), '-Cutter;');
  });
});

for (const [name, algorithm] of [
  ['SIMON', SIMON],
  ['SPECK', SPECK],
]) {
  describe(name, () => {
    test('has a known-answer vector for every supported variant', () => {
      for (const variantId of Object.keys(algorithm.variants)) {
        assert.ok(algorithm.testVectors.some((vector) => vector.variant === variantId), `${name} ${variantId}`);
      }
    });

    for (const vector of algorithm.testVectors) {
      test(`matches the paper vector for ${name}-${vector.variant}`, () => {
        assertKnownAnswer(algorithm, vector);
      });
    }

    test('decrypt inverts encrypt for random keys and blocks (all variants)', () => {
      for (const variant of Object.values(algorithm.variants)) {
        assertBlockRoundTrips(algorithm, variant.id, variant.keyBits / 8, randomBytes);
      }
    });

    test('uses the documented round counts', () => {
      const expected = name === 'SIMON' ? { '32/64': 32, '64/96': 42, '64/128': 44 } : { '32/64': 22, '64/96': 26, '64/128': 27 };
      for (const [variantId, rounds] of Object.entries(expected)) {
        assert.equal(algorithm.variants[variantId].rounds, rounds);
        const wordBytes = algorithm.variants[variantId].wordBits / 8;
        const cipher = algorithm.createCipher(variantId, new Uint8Array(algorithm.variants[variantId].keyBits / 8));
        assert.equal(cipher.roundKeyBytes, rounds * wordBytes);
      }
    });

    test('rejects keys of the wrong length and unknown variants', () => {
      assert.throws(() => algorithm.createCipher('64/128', new Uint8Array(12)), RangeError);
      assert.throws(() => algorithm.createCipher('32/64', new Uint8Array(16)), RangeError);
      assert.throws(() => algorithm.createCipher('128/128', new Uint8Array(16)), RangeError);
    });
  });
}
