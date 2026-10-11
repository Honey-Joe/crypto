import { performance } from 'node:perf_hooks';

/** Logs method, path, status and duration. Bodies and query strings are never logged. */
export function requestLogger(req, res, next) {
  const start = performance.now();
  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(1);
    const path = req.originalUrl.split('?')[0];
    console.log(`${req.method} ${path} -> ${res.statusCode} (${duration} ms)`);
  });
  next();
}
