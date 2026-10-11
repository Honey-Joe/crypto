// CSV / JSON export of benchmark results (generated in the browser, no server round trip).

const CSV_COLUMNS = [
  ['run_id', (r) => r.conditions?.runId],
  ['algorithm', (r) => r.algorithm],
  ['variant', (r) => r.displayName],
  ['block_bits', (r) => r.blockBits],
  ['key_bits', (r) => r.keyBits],
  ['rounds', (r) => r.rounds],
  ['mode', (r) => r.mode],
  ['dataset', (r) => r.conditions?.dataset],
  ['message_bytes', (r) => r.messageSize],
  ['iterations', (r) => r.iterations],
  ['warmup_iterations', (r) => r.warmupIterations],
  ['status', (r) => r.status],
  ['round_trip_passed', (r) => r.roundTrip?.passed],
  ['encrypt_mean_ms', (r) => r.encrypt?.meanMs],
  ['encrypt_median_ms', (r) => r.encrypt?.medianMs],
  ['encrypt_min_ms', (r) => r.encrypt?.minMs],
  ['encrypt_max_ms', (r) => r.encrypt?.maxMs],
  ['encrypt_stddev_ms', (r) => r.encrypt?.stdDevMs],
  ['decrypt_mean_ms', (r) => r.decrypt?.meanMs],
  ['decrypt_median_ms', (r) => r.decrypt?.medianMs],
  ['decrypt_min_ms', (r) => r.decrypt?.minMs],
  ['decrypt_max_ms', (r) => r.decrypt?.maxMs],
  ['decrypt_stddev_ms', (r) => r.decrypt?.stdDevMs],
  ['key_setup_mean_ms', (r) => r.keySetup?.meanMs],
  ['encrypt_throughput_bytes_per_s', (r) => r.throughput?.encryptBytesPerSec],
  ['decrypt_throughput_bytes_per_s', (r) => r.throughput?.decryptBytesPerSec],
  ['ciphertext_raw_bytes', (r) => r.ciphertext?.rawBytes],
  ['ciphertext_iv_bytes', (r) => r.ciphertext?.ivBytes],
  ['ciphertext_padding_bytes', (r) => r.ciphertext?.paddingBytes],
  ['ciphertext_hex_chars', (r) => r.ciphertext?.hexChars],
  ['ciphertext_base64_chars', (r) => r.ciphertext?.base64Chars],
  ['round_key_bytes', (r) => r.memory?.roundKeyBytes],
  ['lookup_table_bytes', (r) => r.memory?.lookupTableBytes],
  ['process_heap_delta_bytes', (r) => r.memory?.heapUsedDeltaBytes],
  ['node_version', (r) => r.conditions?.nodeVersion],
  ['cpu_model', (r) => r.conditions?.cpuModel],
  ['platform', (r) => r.conditions?.platform],
  ['error', (r) => r.error],
];

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function resultsToCsv(results) {
  const header = CSV_COLUMNS.map(([name]) => name).join(',');
  const rows = results.map((result) => CSV_COLUMNS.map(([, get]) => csvCell(get(result))).join(','));
  return [header, ...rows].join('\r\n');
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function downloadCsv(results, prefix = 'benchmark-results') {
  download(resultsToCsv(results), `${prefix}-${stamp()}.csv`, 'text/csv;charset=utf-8');
}

export function downloadJson(data, prefix = 'benchmark-results') {
  download(JSON.stringify(data, null, 2), `${prefix}-${stamp()}.json`, 'application/json');
}
