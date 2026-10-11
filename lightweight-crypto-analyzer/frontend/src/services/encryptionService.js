import api from './api';

/**
 * Encrypts UTF-8 plaintext.
 * @param {{algorithm: string, variant?: string, mode?: string, key: string, plaintext: string, outputFormat?: 'hex'|'base64'}} request
 */
export async function encryptText(request) {
  const { data } = await api.post('/encrypt', request);
  return data;
}

/**
 * Decrypts ciphertext produced by encryptText().
 * @param {{algorithm: string, variant?: string, mode?: string, key: string, ciphertext: string, inputFormat?: 'hex'|'base64', expectedPlaintext?: string}} request
 */
export async function decryptText(request) {
  const { data } = await api.post('/decrypt', request);
  return data;
}

/** Generates a random key of the right length on the server (hex). */
export async function generateKey(algorithm, variant) {
  const { data } = await api.post('/keys', { algorithm, variant });
  return data.key;
}
