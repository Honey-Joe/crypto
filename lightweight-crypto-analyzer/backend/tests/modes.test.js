import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';
import { ALGORITHMS } from '../src/algorithms/index.js';
import XTEA from '../src/algorithms/xtea.js';
import * as blockModes from '../src/modes/blockModes.js';
import { paddedLength, pkcs7Pad, pkcs7Unpad } from '../src/modes/padding.js';
import { DecryptionError, ValidationError } from '../src/utils/errors.js';

const allVariants = Object.values(ALGORITHMS).flatMap((algorithm) =>
  Object.values(algorithm.variants).map((variant) => ({ algorithm, variant })),
);

describe('PKCS#7 padding', () => {
  test('always adds 1..blockSize bytes', () => {
    assert.equal(paddedLength(0, 8), 8);
    assert.equal(paddedLength(7, 8), 8);
    assert.equal(paddedLength(8, 8), 16);
    assert.equal(paddedLength(9, 8), 16);
    assert.equal(paddedLength(3, 4), 4);
  });

  test('pads with the pad length value and unpads back', () => {
    const padded = pkcs7Pad(Buffer.from('abc'), 8);
    assert.equal(padded.toString('hex'), '6162630505050505');
    assert.equal(pkcs7Unpad(padded, 8).toString(), 'abc');
    const full = pkcs7Pad(Buffer.alloc(8, 1), 8);
    assert.equal(full.length, 16);
    assert.deepEqual([...full.subarray(8)], Array(8).fill(8));
  });

  test('rejects malformed padding', () => {
    for (const hex of ['6162630505050504', '6162636465666700', '6162636465666709', '61626364656667']) {
      assert.throws(() => pkcs7Unpad(Buffer.from(hex, 'hex'), 8), DecryptionError, hex);
    }
  });
});

describe('modes of operation', () => {
  test('round-trip every variant in every mode for many message lengths', () => {
    for (const { algorithm, variant } of allVariants) {
      for (const modeId of blockModes.MODE_IDS) {
        for (let length = 1; length <= 40; length++) {
          const cipher = algorithm.createCipher(variant.id, randomBytes(variant.keyBits / 8));
          const plaintext = randomBytes(length);
          const iv = blockModes.MODES[modeId].usesIv ? randomBytes(cipher.blockSize) : undefined;
          const ciphertext = blockModes.encrypt(modeId, cipher, plaintext, iv);
          assert.equal(ciphertext.length, blockModes.outputLength(modeId, length, cipher.blockSize));
          assert.deepEqual(blockModes.decrypt(modeId, cipher, ciphertext), plaintext, `${variant.name} ${modeId} len=${length}`);
        }
      }
    }
  });

  test('CBC with a zero IV reproduces the known-answer vector in its first block', () => {
    const vector = XTEA.testVectors[0];
    const cipher = XTEA.createCipher(vector.variant, Buffer.from(vector.key, 'hex'));
    const output = blockModes.encrypt('CBC', cipher, Buffer.from(vector.plaintext, 'hex'), Buffer.alloc(8));
    assert.equal(output.subarray(8, 16).toString('hex'), vector.ciphertext);
  });

  test('CTR keystream equals ECB encryption of the counter blocks', () => {
    const cipher = XTEA.createCipher('64/128', randomBytes(16));
    const iv = Buffer.from('00000000000000ff', 'hex');
    const zeros = Buffer.alloc(16);
    const ctr = blockModes.encrypt('CTR', cipher, zeros, iv).subarray(8);
    const expected = Buffer.alloc(16);
    cipher.encryptBlock(Buffer.from('00000000000000ff', 'hex'), 0, expected, 0);
    cipher.encryptBlock(Buffer.from('0000000000000100', 'hex'), 0, expected, 8); // carry into the next byte
    assert.deepEqual(ctr, expected);
  });

  test('ECB leaks repeated blocks while CBC hides them', () => {
    const cipher = XTEA.createCipher('64/128', randomBytes(16));
    const plaintext = Buffer.from('SAMEBLOKSAMEBLOK');
    const ecb = blockModes.encrypt('ECB', cipher, plaintext);
    assert.deepEqual(ecb.subarray(0, 8), ecb.subarray(8, 16));
    const cbc = blockModes.encrypt('CBC', cipher, plaintext, randomBytes(8));
    assert.notDeepEqual(cbc.subarray(8, 16), cbc.subarray(16, 24));
  });

  test('random IVs make identical messages encrypt differently', () => {
    const cipher = XTEA.createCipher('64/128', randomBytes(16));
    const plaintext = Buffer.from('Temperature=32C');
    const first = blockModes.encrypt('CBC', cipher, plaintext, randomBytes(8));
    const second = blockModes.encrypt('CBC', cipher, plaintext, randomBytes(8));
    assert.notDeepEqual(first, second);
  });

  test('rejects ciphertexts with invalid lengths', () => {
    const cipher = XTEA.createCipher('64/128', randomBytes(16));
    assert.throws(() => blockModes.decrypt('CBC', cipher, randomBytes(8)), DecryptionError); // IV only
    assert.throws(() => blockModes.decrypt('CBC', cipher, randomBytes(20)), DecryptionError); // not a multiple
    assert.throws(() => blockModes.decrypt('ECB', cipher, randomBytes(0)), DecryptionError);
    assert.throws(() => blockModes.decrypt('CTR', cipher, randomBytes(8)), DecryptionError); // no data after IV
  });

  test('wrong key in CBC is detected by the padding check in almost all cases', () => {
    let detected = 0;
    for (let i = 0; i < 200; i++) {
      const plaintext = Buffer.from('sensor reading 42');
      const ciphertext = blockModes.encrypt('CBC', XTEA.createCipher('64/128', randomBytes(16)), plaintext, randomBytes(8));
      try {
        blockModes.decrypt('CBC', XTEA.createCipher('64/128', randomBytes(16)), ciphertext);
      } catch (error) {
        if (error instanceof DecryptionError) detected++;
      }
    }
    // Random final blocks have valid padding with probability about 1/256 + ...; allow a few.
    assert.ok(detected >= 190, `detected ${detected}/200`);
  });

  test('findMode defaults to CBC and validates input', () => {
    assert.equal(blockModes.findMode(undefined).id, 'CBC');
    assert.equal(blockModes.findMode('ctr').id, 'CTR');
    assert.throws(() => blockModes.findMode('GCM'), ValidationError);
  });
});
