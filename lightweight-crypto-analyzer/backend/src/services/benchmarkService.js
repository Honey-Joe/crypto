/**
 * Software benchmark engine.
 *
 * Methodology (applied identically to every algorithm):
 *   1. One plaintext buffer per message size is generated and shared by all algorithms.
 *   2. A random key (and IV, where the mode uses one) is generated per algorithm. The IV is
 *      reused across iterations so every iteration does identical work; this is acceptable
 *      for timing only and must never be done when protecting real data.
 *   3. Key setup (round-key expansion) is timed on its own and never included in the
 *      encryption or decryption times.
 *   4. Warm-up iterations run the encrypt/decrypt path so V8 can optimise it; they are not
 *      measured.
 *   5. Each measured iteration is timed individually with performance.now(), giving mean,
 *      median, minimum, maximum and standard deviation.
 *   6. Every measured ciphertext is compared with the reference ciphertext and every
 *      decryption is compared with the original plaintext. Any mismatch marks the result
 *      as failed and excludes it from rankings.
 *   7. Throughput = plaintext bytes / mean time in seconds.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import * as blockModes from '../modes/blockModes.js';
import { paddedLength } from '../modes/padding.js';
import { encodedLength } from '../utils/encoding.js';
import { collectGarbage, estimateTimerResolution, getEnvironmentInfo, measureTimerOverhead } from '../utils/environment.js';
import { summarize, throughputBytesPerSecond } from '../utils/stats.js';
import { buildRunSummary } from './comparisonService.js';

const SAMPLE_TEXT =
  'Lightweight cryptography protects resource-constrained IoT devices such as sensors, RFID tags and smart cards. ';

export const METHODOLOGY = Object.freeze([
  'All algorithms in a run encrypt the same plaintext bytes for each message size, in the same mode, with the same number of warm-up and measured iterations.',
  'Key setup (round-key expansion) is timed separately and excluded from encryption and decryption times.',
  'Before any measurement, every selected algorithm runs an unmeasured warm-up pass; each algorithm then runs its own warm-up iterations immediately before being measured, so the JavaScript engine has optimised the code first.',
  'Algorithms are measured one after another in the selected order on a single thread.',
  'Each measured iteration is timed individually with performance.now() (a monotonic high-resolution clock).',
  'Throughput = plaintext bytes / mean encryption (or decryption) time in seconds.',
  'Every iteration is verified: ciphertexts must be identical across iterations and every decryption must reproduce the original plaintext. Failed results are excluded from rankings.',
  'Results depend on the CPU, operating system, Node.js/V8 version, background load, JIT optimisation and the quality of each JavaScript implementation. They are software measurements and say nothing about hardware gate count, power or energy.',
]);

function sensorRecords(size) {
  const chunks = [];
  let length = 0;
  for (let sequence = 1; length < size; sequence++) {
    const record = JSON.stringify({
      deviceId: 'SENSOR-001',
      seq: sequence,
      temperature: Number((24 + 8 * Math.sin(sequence / 5)).toFixed(1)),
      humidity: 55 + (sequence % 20),
      soilMoisture: 30 + (sequence % 25),
      airQuality: 60 + ((sequence * 7) % 50),
    });
    chunks.push(record, '\n');
    length += record.length + 1;
  }
  return Buffer.from(chunks.join(''), 'utf8');
}

function repeatToSize(source, size) {
  const out = Buffer.allocUnsafe(size);
  for (let offset = 0; offset < size; offset += source.length) {
    source.copy(out, offset, 0, Math.min(source.length, size - offset));
  }
  return out;
}

/** Builds the shared plaintext for one message size. */
export function buildPlaintext(datasetId, size, customText) {
  switch (datasetId) {
    case 'random':
      return randomBytes(size);
    case 'text':
      return repeatToSize(Buffer.from(SAMPLE_TEXT, 'utf8'), size);
    case 'sensor':
      return repeatToSize(sensorRecords(size), size);
    case 'custom':
      return repeatToSize(Buffer.from(customText, 'utf8'), size);
    default:
      throw new RangeError(`Unknown dataset ${datasetId}`);
  }
}

function timingSummary(samples) {
  const stats = summarize(samples);
  return {
    meanMs: stats.mean,
    medianMs: stats.median,
    minMs: stats.min,
    maxMs: stats.max,
    stdDevMs: stats.stdDev,
    samples: stats.count,
  };
}

function ciphertextInfo(modeId, messageSize, blockSize) {
  const rawBytes = blockModes.outputLength(modeId, messageSize, blockSize);
  const ivBytes = blockModes.MODES[modeId].usesIv ? blockSize : 0;
  const paddingBytes = modeId === 'CTR' ? 0 : paddedLength(messageSize, blockSize) - messageSize;
  return {
    rawBytes,
    ivBytes,
    paddingBytes,
    overheadBytes: rawBytes - messageSize,
    expansionRatio: rawBytes / messageSize,
    hexChars: encodedLength(rawBytes, 'hex'),
    base64Chars: encodedLength(rawBytes, 'base64'),
  };
}

// A median below this many timer ticks is reported as quantised.
const RESOLUTION_WARNING_FACTOR = 50;

function benchmarkTarget({ algorithm, variant, plaintext, iterations, warmupIterations, mode, conditions, timerResolutionMs }) {
  const blockSize = variant.blockBits / 8;
  const base = {
    id: `${conditions.runId}:${algorithm.id}:${variant.id}:${plaintext.length}`,
    algorithm: algorithm.id,
    variant: variant.id,
    displayName: variant.name,
    blockBits: variant.blockBits,
    keyBits: variant.keyBits,
    rounds: variant.rounds,
    messageSize: plaintext.length,
    mode: mode.id,
    iterations,
    warmupIterations,
    conditions: { ...conditions, messageSize: plaintext.length },
    ciphertext: ciphertextInfo(mode.id, plaintext.length, blockSize),
  };

  try {
    const key = randomBytes(variant.keyBits / 8);
    const iv = mode.usesIv ? randomBytes(blockSize) : undefined;

    // 1. Key setup, measured on its own.
    const keySetupRuns = Math.min(Math.max(iterations, 20), 500);
    const keySetupSamples = new Float64Array(keySetupRuns);
    let cipher;
    for (let i = 0; i < keySetupRuns; i++) {
      const start = performance.now();
      cipher = algorithm.createCipher(variant.id, key);
      keySetupSamples[i] = performance.now() - start;
    }

    // 2. Reference ciphertext and warm-up (not measured).
    const reference = blockModes.encrypt(mode.id, cipher, plaintext, iv);
    for (let i = 0; i < warmupIterations; i++) {
      blockModes.decrypt(mode.id, cipher, blockModes.encrypt(mode.id, cipher, plaintext, iv));
    }

    const gcBeforeMeasurement = collectGarbage();
    const memoryBefore = process.memoryUsage();

    // 3. Measured encryption iterations.
    const encryptSamples = new Float64Array(iterations);
    let inconsistentCiphertexts = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const output = blockModes.encrypt(mode.id, cipher, plaintext, iv);
      encryptSamples[i] = performance.now() - start;
      if (!output.equals(reference)) inconsistentCiphertexts++;
    }

    // 4. Measured decryption iterations with round-trip verification.
    const decryptSamples = new Float64Array(iterations);
    let roundTripFailures = 0;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const recovered = blockModes.decrypt(mode.id, cipher, reference);
      decryptSamples[i] = performance.now() - start;
      if (!recovered.equals(plaintext)) roundTripFailures++;
    }

    const memoryAfter = process.memoryUsage();
    const encrypt = timingSummary(encryptSamples);
    const decrypt = timingSummary(decryptSamples);
    const keySetup = timingSummary(keySetupSamples);

    const roundTrip = {
      passed: roundTripFailures === 0 && inconsistentCiphertexts === 0,
      verifiedIterations: iterations,
      failures: roundTripFailures,
      inconsistentCiphertexts,
    };

    const timingsValid = [encrypt.meanMs, decrypt.meanMs].every((value) => Number.isFinite(value) && value > 0);
    let error = null;
    if (!roundTrip.passed) {
      error = `Round-trip verification failed (${roundTripFailures} decryption mismatches, ${inconsistentCiphertexts} inconsistent ciphertexts).`;
    } else if (!timingsValid) {
      error = 'Timer resolution was insufficient to measure this configuration; increase the message size.';
    }

    const warnings = [];
    const quantisationLimit = RESOLUTION_WARNING_FACTOR * timerResolutionMs;
    if (encrypt.medianMs < quantisationLimit || decrypt.medianMs < quantisationLimit) {
      warnings.push(
        `Median times are within ${RESOLUTION_WARNING_FACTOR}x the timer resolution (${(timerResolutionMs * 1000).toFixed(3)} µs), so individual samples are quantised. The mean is more reliable here; larger messages give more precise results.`,
      );
    }

    return {
      ...base,
      status: error ? 'failed' : 'passed',
      error,
      warnings,
      keySetup,
      encrypt,
      decrypt,
      throughput: {
        basis: 'mean',
        encryptBytesPerSec: throughputBytesPerSecond(plaintext.length, encrypt.meanMs),
        decryptBytesPerSec: throughputBytesPerSecond(plaintext.length, decrypt.meanMs),
      },
      memory: {
        roundKeyBytes: cipher.roundKeyBytes,
        lookupTableBytes: cipher.tableBytes ?? 0,
        heapUsedBeforeBytes: memoryBefore.heapUsed,
        heapUsedAfterBytes: memoryAfter.heapUsed,
        heapUsedDeltaBytes: memoryAfter.heapUsed - memoryBefore.heapUsed,
        arrayBuffersDeltaBytes: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
        rssBytes: memoryAfter.rss,
        gcBeforeMeasurement,
      },
      roundTrip,
    };
  } catch (error) {
    return {
      ...base,
      status: 'failed',
      error: `Benchmark failed: ${error.message}`,
      warnings: [],
      roundTrip: { passed: false, verifiedIterations: 0, failures: null, inconsistentCiphertexts: null },
    };
  }
}

const GLOBAL_WARMUP_MIN_ITERATIONS = 300;
const GLOBAL_WARMUP_MIN_BYTES = 256 * 1024;
const GLOBAL_WARMUP_MAX_BYTES = 1024 * 1024;

/**
 * Exercises every target once before any measurement. The block-mode code is shared by
 * all ciphers, so without this pass the first algorithm in a run would be measured while
 * that shared code is still unoptimised, penalising it relative to the others.
 */
function globalWarmup(targets, mode, plaintext, rounds) {
  for (const { algorithm, variant } of targets) {
    const cipher = algorithm.createCipher(variant.id, randomBytes(variant.keyBits / 8));
    const iv = mode.usesIv ? randomBytes(variant.blockBits / 8) : undefined;
    for (let i = 0; i < rounds; i++) {
      blockModes.decrypt(mode.id, cipher, blockModes.encrypt(mode.id, cipher, plaintext, iv));
    }
  }
}

/** Runs a benchmark for a configuration produced by normalizeBenchmarkRequest(). */
export function runBenchmark(benchmarkConfig) {
  const { targets, messageSizes, iterations, warmupIterations, mode, dataset, customText } = benchmarkConfig;
  const environment = getEnvironmentInfo();
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const timer = { overheadMs: measureTimerOverhead(), resolutionMs: estimateTimerResolution() };
  const conditions = {
    runId,
    iterations,
    warmupIterations,
    mode: mode.id,
    dataset: dataset.id,
    nodeVersion: environment.nodeVersion,
    platform: environment.platform,
    cpuModel: environment.cpuModel,
  };

  const runStart = performance.now();
  // Uses the smallest message size (sizes are sorted): at least 300 iterations and 256 KiB
  // per target so the JIT reaches its optimised tier, but never more than 1 MiB per target.
  const warmupPlaintext = buildPlaintext(dataset.id, messageSizes[0], customText);
  const wantedRounds = Math.max(warmupIterations, GLOBAL_WARMUP_MIN_ITERATIONS, Math.ceil(GLOBAL_WARMUP_MIN_BYTES / warmupPlaintext.length));
  const warmupRounds = Math.max(1, Math.min(wantedRounds, Math.floor(GLOBAL_WARMUP_MAX_BYTES / warmupPlaintext.length)));
  globalWarmup(targets, mode, warmupPlaintext, warmupRounds);

  const results = [];
  for (const size of messageSizes) {
    const plaintext = buildPlaintext(dataset.id, size, customText);
    for (const { algorithm, variant } of targets) {
      results.push(
        benchmarkTarget({ algorithm, variant, plaintext, iterations, warmupIterations, mode, conditions, timerResolutionMs: timer.resolutionMs }),
      );
    }
  }
  const totalDurationMs = performance.now() - runStart;

  return {
    success: true,
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    totalDurationMs,
    config: {
      targets: targets.map(({ algorithm, variant }) => ({ algorithm: algorithm.id, variant: variant.id, displayName: variant.name })),
      messageSizes,
      iterations,
      warmupIterations,
      mode: mode.id,
      dataset: dataset.id,
      datasetName: dataset.name,
    },
    environment,
    timer,
    methodology: METHODOLOGY,
    memoryNote:
      'Round-key and lookup-table sizes are exact sizes of the typed arrays each implementation allocates. Heap and RSS figures come from process.memoryUsage() for the whole Node.js process; they include the runtime, the HTTP server and uncollected garbage, so they are indicative only and are not the memory needed by the algorithm itself.',
    summary: buildRunSummary(results),
    results,
  };
}
