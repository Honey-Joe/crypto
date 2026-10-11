import api from './api';
import { decryptText, encryptText } from './encryptionService';

/** Fetches the next simulated reading for a (virtual) sensor device. */
export async function getSensorReading(deviceId = 'SENSOR-001') {
  const { data } = await api.get('/iot/reading', { params: { deviceId } });
  return data;
}

/** "Device" side: encrypts a serialised sensor message. */
export function encryptSensorMessage({ message, algorithm, variant, mode, key }) {
  return encryptText({ algorithm, variant, mode, key, plaintext: message, outputFormat: 'base64' });
}

/** "Gateway" side: decrypts the received ciphertext and checks it against the original. */
export function decryptSensorMessage({ ciphertext, algorithm, variant, mode, key, expectedMessage }) {
  return decryptText({ algorithm, variant, mode, key, ciphertext, inputFormat: 'base64', expectedPlaintext: expectedMessage });
}
