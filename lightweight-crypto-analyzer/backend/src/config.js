import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Load backend/.env when present (process.loadEnvFile is built into Node.js 22+).
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

function intFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const config = Object.freeze({
  port: intFromEnv('PORT', 5000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  logRequests: (process.env.LOG_REQUESTS ?? 'true').toLowerCase() === 'true',

  limits: Object.freeze({
    // /api/encrypt and /api/decrypt
    maxPlaintextBytes: intFromEnv('MAX_PLAINTEXT_BYTES', 65536),
    jsonBodyLimit: '2mb',

    // /api/benchmark
    maxTargets: 9,
    maxMessageSizes: 6,
    minMessageSize: 1,
    maxMessageSize: 262144, // 256 KiB
    maxIterations: 2000,
    maxWarmupIterations: 500,
    // Upper bound on plaintext bytes encrypted per algorithm per message size,
    // i.e. messageSize x (iterations + warm-up). Keeps a run well below the
    // frontend timeout even for the slowest cipher (PRESENT).
    maxBytesPerTarget: 4 * 1024 * 1024,
    maxCustomTextChars: 4096,

    // /api/compare
    maxCompareResults: 60,
  }),
});

export default config;
