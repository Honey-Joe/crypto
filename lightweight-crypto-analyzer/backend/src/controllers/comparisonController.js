import { compareResults } from '../services/comparisonService.js';
import { normalizeCompareRequest } from '../validators/compareValidator.js';

export function postCompare(req, res) {
  res.json(compareResults(normalizeCompareRequest(req.body)));
}
