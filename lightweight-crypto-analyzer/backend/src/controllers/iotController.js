import { generateReading } from '../services/iotService.js';

export function getReading(req, res) {
  res.json(generateReading(req.query.deviceId));
}
