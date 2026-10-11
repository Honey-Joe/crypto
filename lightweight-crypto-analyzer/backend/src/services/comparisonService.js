/**
 * Ranks benchmark results and produces a performance-based recommendation.
 *
 * Rankings are computed only from results whose round-trip verification passed and only
 * between results with the same message size. Differences in other conditions (iterations,
 * mode, dataset, machine, runtime, run) are reported as warnings.
 *
 * This is a PERFORMANCE comparison. It is not a security ranking.
 */
import { ALGORITHM_INFO } from '../data/algorithmInfo.js';

export const STATISTICS = Object.freeze(['mean', 'median', 'min']);

export const CRITERIA = Object.freeze({
  encryption: { label: 'Encryption time', unit: 'ms', better: 'lower' },
  decryption: { label: 'Decryption time', unit: 'ms', better: 'lower' },
  keySetup: { label: 'Key setup time', unit: 'ms', better: 'lower' },
  ciphertextSize: { label: 'Ciphertext size', unit: 'bytes', better: 'lower' },
  roundKeyMemory: { label: 'Round-key storage', unit: 'bytes', better: 'lower' },
});

export const DEFAULT_WEIGHTS = Object.freeze({
  encryption: 0.35,
  decryption: 0.35,
  keySetup: 0.1,
  ciphertextSize: 0.1,
  roundKeyMemory: 0.1,
});

export const DISCLAIMER =
  'This recommendation reflects measured software performance of these JavaScript implementations on this machine only. Faster or smaller does not mean more secure; security must be judged from independent cryptanalysis, key and block size, and standardisation status.';

// Relative difference below which two timing results are reported as a close call.
const CLOSE_CALL_THRESHOLD = 0.05;

function statKey(statistic) {
  return `${statistic}Ms`;
}

function isComparable(result) {
  return result?.status === 'passed' && result?.roundTrip?.passed === true;
}

function metricsFor(result, statistic) {
  const key = statKey(statistic);
  const encryptMs = result.encrypt[key];
  return {
    id: result.id,
    algorithm: result.algorithm,
    variant: result.variant,
    displayName: result.displayName,
    blockBits: result.blockBits,
    keyBits: result.keyBits,
    messageSize: result.messageSize,
    encryption: encryptMs,
    decryption: result.decrypt[key],
    keySetup: result.keySetup?.[key] ?? null,
    throughput: result.messageSize / (encryptMs / 1000),
    ciphertextSize: result.ciphertext.rawBytes,
    roundKeyMemory: result.memory?.roundKeyBytes ?? null,
  };
}

function rankBy(rows, metric, better) {
  const usable = rows.filter((row) => Number.isFinite(row[metric]));
  if (usable.length === 0) return null;
  const sorted = [...usable].sort((a, b) => (better === 'lower' ? a[metric] - b[metric] : b[metric] - a[metric]));
  const bestValue = sorted[0][metric];
  const winners = sorted.filter((row) => row[metric] === bestValue).map((row) => row.displayName);
  const runnerUp = sorted.find((row) => row[metric] !== bestValue);
  let closeCall = null;
  if (runnerUp && bestValue !== 0) {
    const relative = Math.abs(runnerUp[metric] - bestValue) / Math.abs(bestValue);
    if (relative < CLOSE_CALL_THRESHOLD) {
      closeCall = `${winners.join(', ')} and ${runnerUp.displayName} differ by only ${(relative * 100).toFixed(1)}%, which is within typical run-to-run variation. Repeat the benchmark before drawing conclusions.`;
    }
  }
  return {
    metric,
    winners,
    tie: winners.length > 1,
    value: bestValue,
    order: sorted.map((row) => ({ displayName: row.displayName, value: row[metric] })),
    closeCall,
  };
}

function distinct(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))];
}

export function comparabilityWarnings(results) {
  const warnings = [];
  const conditions = results.map((result) => result.conditions ?? {});
  const checks = [
    ['iterations', 'measured iteration counts'],
    ['warmupIterations', 'warm-up iteration counts'],
    ['mode', 'modes of operation'],
    ['dataset', 'plaintext datasets'],
    ['nodeVersion', 'Node.js versions'],
    ['cpuModel', 'CPU models'],
    ['platform', 'operating systems'],
  ];
  for (const [field, label] of checks) {
    const values = distinct(conditions.map((condition) => condition[field]));
    if (values.length > 1) {
      warnings.push(`Results were measured with different ${label} (${values.join(', ')}). Differences may reflect the conditions rather than the algorithms.`);
    }
  }
  const runs = distinct(conditions.map((condition) => condition.runId));
  if (runs.length > 1) {
    warnings.push(`Results come from ${runs.length} separate benchmark runs; system load and CPU frequency may have differed between runs.`);
  }
  return warnings;
}

function normalizeWeights(weights) {
  const merged = { ...DEFAULT_WEIGHTS, ...(weights ?? {}) };
  const normalized = {};
  for (const criterion of Object.keys(CRITERIA)) normalized[criterion] = Number(merged[criterion]);
  return normalized;
}

function overallScores(rows, weights) {
  const best = {};
  for (const [criterion, info] of Object.entries(CRITERIA)) {
    const values = rows.map((row) => row[criterion]).filter(Number.isFinite);
    if (values.length) best[criterion] = info.better === 'lower' ? Math.min(...values) : Math.max(...values);
  }
  return rows
    .map((row) => {
      let weighted = 0;
      let totalWeight = 0;
      const breakdown = {};
      for (const [criterion, info] of Object.entries(CRITERIA)) {
        const weight = weights[criterion];
        const value = row[criterion];
        if (!weight || !Number.isFinite(value) || best[criterion] === undefined) continue;
        // 1.0 for the best value; proportionally lower for worse values.
        let score;
        if (info.better === 'lower') score = value === 0 ? 1 : best[criterion] / value;
        else score = best[criterion] === 0 ? 1 : value / best[criterion];
        breakdown[criterion] = score;
        weighted += weight * score;
        totalWeight += weight;
      }
      return {
        displayName: row.displayName,
        algorithm: row.algorithm,
        variant: row.variant,
        score: totalWeight > 0 ? (100 * weighted) / totalWeight : null,
        breakdown,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

function securityContext(rows) {
  const notes = [];
  for (const row of rows) {
    if (row.blockBits <= 32) {
      notes.push(`${row.displayName} uses a ${row.blockBits}-bit block: about 2^16 blocks (256 KiB) per key before collisions become likely. Not suitable for bulk data.`);
    }
    if (row.keyBits < 112) {
      notes.push(`${row.displayName} uses a ${row.keyBits}-bit key, below the 112-128-bit minimum commonly recommended for long-term security.`);
    }
  }
  return [...new Set(notes)];
}

function compareGroup(results, statistic, weights) {
  const rows = results.map((result) => metricsFor(result, statistic));
  const winners = {
    encryption: rankBy(rows, 'encryption', 'lower'),
    decryption: rankBy(rows, 'decryption', 'lower'),
    throughput: rankBy(rows, 'throughput', 'higher'),
    ciphertextSize: rankBy(rows, 'ciphertextSize', 'lower'),
    keySetup: rankBy(rows, 'keySetup', 'lower'),
    roundKeyMemory: rankBy(rows, 'roundKeyMemory', 'lower'),
  };
  const ranking = overallScores(rows, weights);
  const top = ranking[0];
  const topScore = top?.score;
  const best = ranking.filter((entry) => entry.score === topScore && topScore !== null);

  let recommendation = null;
  if (best.length > 0) {
    const metricLabel = (metric) => (metric === 'throughput' ? 'throughput' : CRITERIA[metric].label.toLowerCase());
    const wonBy = Object.entries(winners).filter(([, ranked]) => ranked && ranked.winners.includes(top.displayName));
    const leads = wonBy.filter(([, ranked]) => !ranked.tie).map(([metric]) => metricLabel(metric));
    const ties = wonBy.filter(([, ranked]) => ranked.tie).map(([metric]) => metricLabel(metric));
    const details = [leads.length ? `leading on ${leads.join(', ')}` : null, ties.length ? `tied for best on ${ties.join(', ')}` : null].filter(Boolean);
    recommendation = {
      best: best.map((entry) => entry.displayName),
      score: topScore,
      explanation:
        `${best.map((entry) => entry.displayName).join(' and ')} scored highest (${topScore.toFixed(1)} / 100) under the selected weights` +
        (details.length ? `, ${details.join(' and ')}.` : '.') +
        ' Scores are relative to the best measured value for each criterion within this comparison.',
    };
  }

  return {
    messageSize: results[0].messageSize,
    statistic,
    warnings: comparabilityWarnings(results),
    rows,
    winners,
    ranking,
    recommendation,
    securityContext: securityContext(rows),
    algorithmSecurityNotes: Object.fromEntries(
      distinct(rows.map((row) => row.algorithm)).map((algorithm) => [algorithm, ALGORITHM_INFO[algorithm]?.securityNotes ?? []]),
    ),
    throughputNote:
      'At a fixed message size, throughput is the message size divided by the encryption time, so the fastest encryption always has the highest throughput.',
  };
}

/** Compares results (as returned by /api/benchmark), grouped by message size. */
export function compareResults({ results, statistic = 'mean', weights } = {}) {
  const normalizedWeights = normalizeWeights(weights);
  const comparable = results.filter(isComparable);
  const excluded = results
    .filter((result) => !isComparable(result))
    .map((result) => ({
      displayName: result.displayName,
      messageSize: result.messageSize,
      reason: result.error ?? 'Round-trip verification did not pass.',
    }));

  const bySize = new Map();
  for (const result of comparable) {
    if (!bySize.has(result.messageSize)) bySize.set(result.messageSize, []);
    bySize.get(result.messageSize).push(result);
  }
  const groups = [...bySize.keys()].sort((a, b) => a - b).map((size) => compareGroup(bySize.get(size), statistic, normalizedWeights));

  const notes = [];
  if (groups.length > 1) {
    notes.push('Results with different message sizes are compared separately, one group per size.');
  }
  return {
    success: true,
    statistic,
    weights: normalizedWeights,
    criteria: CRITERIA,
    disclaimer: DISCLAIMER,
    excluded,
    notes,
    groups,
  };
}

/** Short per-size summary attached to every /api/benchmark response. */
export function buildRunSummary(results) {
  const comparison = compareResults({ results, statistic: 'mean' });
  return {
    passed: results.filter(isComparable).length,
    failed: results.length - results.filter(isComparable).length,
    bySize: comparison.groups.map((group) => ({
      messageSize: group.messageSize,
      fastestEncryption: group.winners.encryption?.winners ?? [],
      fastestDecryption: group.winners.decryption?.winners ?? [],
      highestThroughput: group.winners.throughput?.winners ?? [],
      smallestCiphertext: group.winners.ciphertextSize?.winners ?? [],
    })),
  };
}
