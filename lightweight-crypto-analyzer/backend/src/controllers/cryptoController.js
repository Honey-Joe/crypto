import { decryptMessage, encryptMessage, generateKey } from '../services/encryptionService.js';

export function encrypt(req, res) {
  res.json(encryptMessage(req.body));
}

export function decrypt(req, res) {
  res.json(decryptMessage(req.body));
}

export function createKey(req, res) {
  res.json(generateKey(req.body));
}
