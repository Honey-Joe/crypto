import config from '../config.js';
import { CRITERIA, STATISTICS } from '../services/comparisonService.js';
import { ValidationError } from '../utils/errors.js';

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validateTiming(timing, path) {
  if (!timing || typeof timing !== 'object') {
    throw new ValidationError(`${path} is missing.`, { field: path });
  }
  for (const statistic of STATISTICS) {
    if (!isPositiveNumber(timing[`${statistic}Ms`])) {
      throw new ValidationError(`${path}.${statistic}Ms must be a positive number.`, { field: `${path}.${statistic}Ms` });
    }
  }
}

function validateResult(result, index) {
  const path = `results[${index}]`;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new ValidationError(`${path} must be a benchmark result object.`, { field: path });
  }
  if (typeof result.displayName !== 'string' || typeof result.algorithm !== 'string') {
    throw new ValidationError(`${path} must include algorithm and displayName.`, { field: path });
  }
  if (!Number.isInteger(result.messageSize) || result.messageSize <= 0) {
    throw new ValidationError(`${path}.messageSize must be a positive integer.`, { field: `${path}.messageSize` });
  }
  if (result.status !== 'passed') return; // Failed results are reported as excluded.

  validateTiming(result.encrypt, `${path}.encrypt`);
  validateTiming(result.decrypt, `${path}.decrypt`);
  if (result.keySetup !== undefined) validateTiming(result.keySetup, `${path}.keySetup`);
  if (!Number.isInteger(result.ciphertext?.rawBytes) || result.ciphertext.rawBytes <= 0) {
    throw new ValidationError(`${path}.ciphertext.rawBytes must be a positive integer.`, { field: `${path}.ciphertext.rawBytes` });
  }
  if (typeof result.roundTrip?.passed !== 'boolean') {
    throw new ValidationError(`${path}.roundTrip.passed must be true or false.`, { field: `${path}.roundTrip.passed` });
  }
}

/** Validates a /api/compare request body. */
export function normalizeCompareRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }
  const { results, weights } = body;
  const statistic = body.statistic ?? 'mean';

  if (!Array.isArray(results) || results.length === 0) {
    throw new ValidationError('results must be a non-empty array of benchmark results (as returned by /api/benchmark).', { field: 'results' });
  }
  if (results.length > config.limits.maxCompareResults) {
    throw new ValidationError(`At most ${config.limits.maxCompareResults} results can be compared at once.`, { field: 'results' });
  }
  if (!STATISTICS.includes(statistic)) {
    throw new ValidationError(`statistic must be one of: ${STATISTICS.join(', ')}.`, { field: 'statistic' });
  }
  results.forEach(validateResult);

  if (weights !== undefined) {
    if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
      throw new ValidationError('weights must be an object.', { field: 'weights' });
    }
    let total = 0;
    for (const [criterion, value] of Object.entries(weights)) {
      if (!CRITERIA[criterion]) {
        throw new ValidationError(`Unknown weight "${criterion}". Allowed: ${Object.keys(CRITERIA).join(', ')}.`, { field: 'weights' });
      }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
        throw new ValidationError(`weights.${criterion} must be a number between 0 and 100.`, { field: `weights.${criterion}` });
      }
      total += value;
    }
    if (Object.keys(weights).length === Object.keys(CRITERIA).length && total === 0) {
      throw new ValidationError('At least one weight must be greater than zero.', { field: 'weights' });
    }
  }

  return { results, statistic, weights };
}
