import { compactNumber, formatBytes, formatDuration, formatThroughput, throughputUnitFor, timeUnitFor } from './format';

const timing = (field) => (result, statistic) => result[field]?.[`${statistic}Ms`];

/** Metrics that can be charted from a benchmark result. `statistic` is mean | median | min. */
export const RESULT_METRICS = {
  encrypt: { label: 'Encryption time', kind: 'time', better: 'lower', get: timing('encrypt') },
  decrypt: { label: 'Decryption time', kind: 'time', better: 'lower', get: timing('decrypt') },
  keySetup: { label: 'Key setup time', kind: 'time', better: 'lower', get: timing('keySetup') },
  throughput: {
    label: 'Encryption throughput',
    kind: 'throughput',
    better: 'higher',
    get: (result, statistic) => result.messageSize / (timing('encrypt')(result, statistic) / 1000),
  },
  decryptThroughput: {
    label: 'Decryption throughput',
    kind: 'throughput',
    better: 'higher',
    get: (result, statistic) => result.messageSize / (timing('decrypt')(result, statistic) / 1000),
  },
  ciphertext: { label: 'Raw ciphertext size', kind: 'bytes', better: 'lower', get: (result) => result.ciphertext?.rawBytes },
  roundKeys: { label: 'Round-key storage', kind: 'bytes', better: 'lower', get: (result) => result.memory?.roundKeyBytes },
  heapDelta: { label: 'Process heap growth', kind: 'bytes', better: 'lower', get: (result) => result.memory?.heapUsedDeltaBytes },
};

/** Formatters that share one unit across a chart (so bars are comparable at a glance). */
export function formattersFor(kind, values) {
  const finite = values.filter(Number.isFinite);
  const max = finite.length ? Math.max(...finite.map(Math.abs)) : 0;
  if (kind === 'time') {
    const { unit, factor } = timeUnitFor(max);
    return {
      unit,
      scale: (value) => value * factor,
      formatValue: (value) => `${compactNumber(value)} ${unit}`,
      formatAxis: (value) => compactNumber(value),
      formatRaw: formatDuration,
    };
  }
  if (kind === 'throughput') {
    const { unit, factor } = throughputUnitFor(max);
    return {
      unit,
      scale: (value) => value * factor,
      formatValue: (value) => `${compactNumber(value)} ${unit}`,
      formatAxis: (value) => compactNumber(value),
      formatRaw: formatThroughput,
    };
  }
  return {
    unit: 'bytes',
    scale: (value) => value,
    formatValue: (value) => formatBytes(value),
    formatAxis: (value) => formatBytes(Math.round(value)),
    formatRaw: formatBytes,
  };
}
