// Formatting helpers. Throughput uses decimal units (1 MB/s = 10^6 bytes/s);
// data sizes use binary units (1 KiB = 1024 bytes) to match message-size choices.

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '–';
  const sign = bytes < 0 ? '-' : '';
  const value = Math.abs(bytes);
  if (value < 1024) return `${sign}${value} B`;
  if (value < 1024 * 1024) return `${sign}${trim(value / 1024)} KiB`;
  return `${sign}${trim(value / (1024 * 1024))} MiB`;
}

function trim(value) {
  const text = value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** Formats a duration given in milliseconds, choosing ns/µs/ms/s automatically. */
export function formatDuration(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '–';
  if (ms < 0.001) return `${(ms * 1e6).toFixed(0)} ns`;
  if (ms < 1) return `${significant(ms * 1000)} µs`;
  if (ms < 1000) return `${significant(ms)} ms`;
  return `${significant(ms / 1000)} s`;
}

function significant(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatThroughput(bytesPerSecond) {
  if (bytesPerSecond === null || bytesPerSecond === undefined || !Number.isFinite(bytesPerSecond)) return '–';
  if (bytesPerSecond >= 1e6) return `${significant(bytesPerSecond / 1e6)} MB/s`;
  if (bytesPerSecond >= 1e3) return `${significant(bytesPerSecond / 1e3)} KB/s`;
  return `${significant(bytesPerSecond)} B/s`;
}

export function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

export function formatDateTime(iso) {
  if (!iso) return '–';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '–' : date.toLocaleString();
}

/** Picks one time unit for a whole chart so every bar shares the same axis. */
export function timeUnitFor(maxMs) {
  if (maxMs < 1) return { unit: 'µs', factor: 1000 };
  return { unit: 'ms', factor: 1 };
}

export function throughputUnitFor(maxBytesPerSecond) {
  if (maxBytesPerSecond >= 1e6) return { unit: 'MB/s', factor: 1e-6 };
  if (maxBytesPerSecond >= 1e3) return { unit: 'KB/s', factor: 1e-3 };
  return { unit: 'B/s', factor: 1 };
}

export function compactNumber(value) {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}
