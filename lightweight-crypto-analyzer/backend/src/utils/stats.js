/**
 * Descriptive statistics for timing samples (milliseconds).
 * Uses the sample standard deviation (n - 1 denominator).
 */
export function summarize(samples) {
  const count = samples.length;
  if (count === 0) {
    throw new RangeError('Cannot summarise an empty sample set');
  }
  const sorted = Float64Array.from(samples).sort();
  let sum = 0;
  for (let i = 0; i < count; i++) sum += sorted[i];
  const mean = sum / count;

  let squared = 0;
  for (let i = 0; i < count; i++) squared += (sorted[i] - mean) ** 2;
  const stdDev = count > 1 ? Math.sqrt(squared / (count - 1)) : 0;

  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return {
    count,
    mean,
    median,
    min: sorted[0],
    max: sorted[count - 1],
    stdDev,
  };
}

/**
 * Throughput = plaintext bytes processed / time in seconds.
 * Returns null when the time is not a positive finite number.
 */
export function throughputBytesPerSecond(bytes, milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }
  return bytes / (milliseconds / 1000);
}
