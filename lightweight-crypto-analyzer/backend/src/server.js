import { createApp } from './app.js';
import config from './config.js';
import { runSelfTests } from './services/selfTestService.js';

// Verify every algorithm against its known-answer vectors before accepting requests.
const report = runSelfTests();
for (const [id, result] of Object.entries(report.algorithms)) {
  const variants = Object.entries(result.variants)
    .map(([variant, status]) => `${variant} ${status.verified ? 'verified' : 'FAILED'}`)
    .join(', ');
  console.log(`[self-test] ${id}: ${result.vectorsPassed}/${result.vectorsTotal} vectors passed (${variants})`);
}

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Lightweight Crypto Analyzer API listening on http://localhost:${config.port}/api`);
  console.log(`Allowed CORS origins: ${config.corsOrigins.join(', ')}`);
  if (typeof globalThis.gc !== 'function') {
    console.log('Note: start Node with --expose-gc (npm run dev does) for steadier memory statistics.');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Set a different PORT in backend/.env.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
