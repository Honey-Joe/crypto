import { getAlgorithmDetail, listAlgorithms, listModes } from '../services/algorithmService.js';

export function getAlgorithms(req, res) {
  res.json({ success: true, algorithms: listAlgorithms(), modes: listModes() });
}

export function getAlgorithm(req, res) {
  res.json({ success: true, algorithm: getAlgorithmDetail(req.params.id) });
}
