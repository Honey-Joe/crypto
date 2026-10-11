import api from './api';

// Benchmarks run synchronously on the server; allow more time than ordinary requests.
const BENCHMARK_TIMEOUT_MS = 120000;

/** Defaults, datasets and limits accepted by POST /benchmark. */
export async function getBenchmarkOptions() {
  const { data } = await api.get('/benchmark/options');
  return data;
}

/**
 * Runs a benchmark on the server.
 * @param {{targets: {algorithm: string, variant: string}[], messageSizes: number[], iterations: number, warmupIterations: number, mode: string, dataset: string, customText?: string}} config
 */
export async function runBenchmark(config) {
  const { data } = await api.post('/benchmark', config, { timeout: BENCHMARK_TIMEOUT_MS });
  return data;
}
