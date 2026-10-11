import assert from 'node:assert/strict';

/** Encrypts and decrypts one block with a fresh cipher and checks a known-answer vector. */
export function assertKnownAnswer(algorithm, vector) {
  const cipher = algorithm.createCipher(vector.variant, Buffer.from(vector.key, 'hex'));
  const encrypted = Buffer.alloc(cipher.blockSize);
  cipher.encryptBlock(Buffer.from(vector.plaintext, 'hex'), 0, encrypted, 0);
  assert.equal(encrypted.toString('hex'), vector.ciphertext, `encrypt ${vector.variant} key=${vector.key}`);

  const decrypted = Buffer.alloc(cipher.blockSize);
  cipher.decryptBlock(Buffer.from(vector.ciphertext, 'hex'), 0, decrypted, 0);
  assert.equal(decrypted.toString('hex'), vector.plaintext, `decrypt ${vector.variant} key=${vector.key}`);
}

/** Checks decrypt(encrypt(block)) === block for random keys and blocks. */
export function assertBlockRoundTrips(algorithm, variantId, keyBytes, randomBytes, count = 200) {
  for (let i = 0; i < count; i++) {
    const cipher = algorithm.createCipher(variantId, randomBytes(keyBytes));
    const block = randomBytes(cipher.blockSize);
    const encrypted = Buffer.alloc(cipher.blockSize);
    const decrypted = Buffer.alloc(cipher.blockSize);
    cipher.encryptBlock(block, 0, encrypted, 0);
    cipher.decryptBlock(encrypted, 0, decrypted, 0);
    assert.deepEqual(decrypted, block);
  }
}
