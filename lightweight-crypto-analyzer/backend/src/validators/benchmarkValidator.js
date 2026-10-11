import config from '../config.js';
import { ALGORITHMS } from '../algorithms/index.js';
import { findMode } from '../modes/blockModes.js';
import { ValidationError } from '../utils/errors.js';
import { resolveTarget } from '../services/algorithmService.js';

export const DATASETS = Object.freeze({
  random: Object.freeze({ id: 'random', name: 'Random bytes', description: 'Cryptographically random bytes (crypto.randomBytes), generated once per message size and shared by every algorithm.' }),
  text: Object.freeze({ id: 'text', name: 'English text', description: 'A repeated English sentence, typical of human-readable payloads.' }),
  sensor: Object.freeze({ id: 'sensor', name: 'IoT sensor records', description: 'Repeated JSON sensor records (temperature, humidity, soil moisture, air quality).' }),
  custom: Object.freeze({ id: 'custom', name: 'Custom text', description: 'Your own text, repeated or truncated to each message size.' }),
});

export const BENCHMARK_DEFAULTS = Object.freeze({
  messageSizes: [1024],
  iterations: 200,
  warmupIterations: 50,
  mode: 'CBC',
  dataset: 'random',
});

function toInteger(value, field, min, max, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ValidationError(`${field} must be a whole number between ${min} and ${max}.`, { field, min, max });
  }
  return number;
}

function normalizeTargets(body) {
  let rawTargets;
  if (Array.isArray(body.targets)) {
    rawTargets = body.targets;
  } else if (Array.isArray(body.algorithms)) {
    rawTargets = body.algorithms.map((name) => ({ algorithm: name }));
  } else if (body.targets === undefined && body.algorithms === undefined) {
    rawTargets = Object.values(ALGORITHMS).map((algorithm) => ({ algorithm: algorithm.id }));
  } else {
    throw new ValidationError('targets must be an array of { algorithm, variant } objects.', { field: 'targets' });
  }

  if (rawTargets.length === 0) {
    throw new ValidationError('Select at least one algorithm to benchmark.', { field: 'targets' });
  }

  const seen = new Set();
  const targets = [];
  for (const raw of rawTargets) {
    const entry = typeof raw === 'string' ? { algorithm: raw } : raw;
    if (!entry || typeof entry !== 'object') {
      throw new ValidationError('Each target must be an object with an algorithm name.', { field: 'targets' });
    }
    const resolved = resolveTarget(entry.algorithm, entry.variant);
    const key = `${resolved.algorithm.id}:${resolved.variant.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push(resolved);
    }
  }
  if (targets.length > config.limits.maxTargets) {
    throw new ValidationError(`At most ${config.limits.maxTargets} algorithm variants can be benchmarked in one run.`, { field: 'targets' });
  }
  return targets;
}

function normalizeMessageSizes(body, iterations, warmupIterations) {
  const { minMessageSize, maxMessageSize, maxMessageSizes, maxBytesPerTarget } = config.limits;
  let sizes;
  if (body.messageSizes !== undefined) {
    if (!Array.isArray(body.messageSizes)) {
      throw new ValidationError('messageSizes must be an array of byte counts.', { field: 'messageSizes' });
    }
    sizes = body.messageSizes;
  } else if (body.messageSize !== undefined) {
    sizes = [body.messageSize];
  } else {
    sizes = BENCHMARK_DEFAULTS.messageSizes;
  }

  const normalized = [...new Set(sizes.map((size) => toInteger(size, 'messageSize', minMessageSize, maxMessageSize)))].sort((a, b) => a - b);
  if (normalized.length === 0) {
    throw new ValidationError('Provide at least one message size.', { field: 'messageSizes' });
  }
  if (normalized.length > maxMessageSizes) {
    throw new ValidationError(`At most ${maxMessageSizes} different message sizes can be tested in one run.`, { field: 'messageSizes' });
  }
  for (const size of normalized) {
    const totalBytes = size * (iterations + warmupIterations);
    if (totalBytes > maxBytesPerTarget) {
      const allowedIterations = Math.max(0, Math.floor(maxBytesPerTarget / size) - warmupIterations);
      throw new ValidationError(
        `Too much data for one run: ${size}-byte messages x ${iterations + warmupIterations} iterations exceeds the ${maxBytesPerTarget / (1024 * 1024)} MiB per-algorithm limit. Use at most ${allowedIterations} measured iterations for this size, or a smaller message size.`,
        { field: 'iterations', maxIterationsForSize: allowedIterations },
      );
    }
  }
  return normalized;
}

/** Validates a /api/benchmark request body and returns a normalised configuration. */
export function normalizeBenchmarkRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }
  const { maxIterations, maxWarmupIterations, maxCustomTextChars } = config.limits;
  const iterations = toInteger(body.iterations, 'iterations', 1, maxIterations, BENCHMARK_DEFAULTS.iterations);
  const warmupIterations = toInteger(body.warmupIterations, 'warmupIterations', 0, maxWarmupIterations, BENCHMARK_DEFAULTS.warmupIterations);
  const mode = findMode(body.mode ?? BENCHMARK_DEFAULTS.mode);

  const datasetId = body.dataset ?? BENCHMARK_DEFAULTS.dataset;
  const dataset = typeof datasetId === 'string' ? DATASETS[datasetId] : undefined;
  if (!dataset) {
    throw new ValidationError(`dataset must be one of: ${Object.keys(DATASETS).join(', ')}.`, { field: 'dataset' });
  }

  let customText = null;
  if (dataset.id === 'custom') {
    if (typeof body.customText !== 'string' || body.customText.length === 0) {
      throw new ValidationError('customText is required when dataset is "custom".', { field: 'customText' });
    }
    if (body.customText.length > maxCustomTextChars) {
      throw new ValidationError(`customText must be at most ${maxCustomTextChars} characters.`, { field: 'customText' });
    }
    customText = body.customText;
  }

  const targets = normalizeTargets(body);
  const messageSizes = normalizeMessageSizes(body, iterations, warmupIterations);

  return { targets, messageSizes, iterations, warmupIterations, mode, dataset, customText };
}
