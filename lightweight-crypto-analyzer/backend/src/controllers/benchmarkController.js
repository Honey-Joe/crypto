import config from '../config.js';
import { MODE_IDS } from '../modes/blockModes.js';
import { runBenchmark, METHODOLOGY } from '../services/benchmarkService.js';
import { BENCHMARK_DEFAULTS, DATASETS, normalizeBenchmarkRequest } from '../validators/benchmarkValidator.js';

export function postBenchmark(req, res) {
  const benchmarkConfig = normalizeBenchmarkRequest(req.body);
  res.json(runBenchmark(benchmarkConfig));
}

export function getBenchmarkOptions(req, res) {
  const { limits } = config;
  res.json({
    success: true,
    defaults: BENCHMARK_DEFAULTS,
    datasets: Object.values(DATASETS),
    modes: MODE_IDS,
    limits: {
      maxTargets: limits.maxTargets,
      maxMessageSizes: limits.maxMessageSizes,
      minMessageSize: limits.minMessageSize,
      maxMessageSize: limits.maxMessageSize,
      maxIterations: limits.maxIterations,
      maxWarmupIterations: limits.maxWarmupIterations,
      maxBytesPerTarget: limits.maxBytesPerTarget,
      maxCustomTextChars: limits.maxCustomTextChars,
    },
    methodology: METHODOLOGY,
  });
}
