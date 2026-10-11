import os from 'node:os';
import { performance } from 'node:perf_hooks';

/** Describes the machine and runtime that produced a measurement. */
export function getEnvironmentInfo() {
  const cpus = os.cpus();
  return {
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    platform: process.platform,
    osRelease: os.release(),
    arch: process.arch,
    cpuModel: cpus[0]?.model?.trim() ?? 'unknown',
    logicalCpus: cpus.length,
    totalMemoryBytes: os.totalmem(),
    gcExposed: typeof globalThis.gc === 'function',
  };
}

/** Runs a full garbage collection when Node was started with --expose-gc. */
export function collectGarbage() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
    return true;
  }
  return false;
}

/** Smallest observable step of performance.now(), in milliseconds. */
export function estimateTimerResolution(samples = 200) {
  let smallest = Infinity;
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    let next = performance.now();
    while (next === start) next = performance.now();
    smallest = Math.min(smallest, next - start);
  }
  return smallest;
}

/** Estimates the cost of one performance.now() call pair, in milliseconds. */
export function measureTimerOverhead(samples = 2000) {
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    total += performance.now() - start;
  }
  return total / samples;
}
