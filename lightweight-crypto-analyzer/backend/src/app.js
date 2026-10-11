import cors from 'cors';
import express from 'express';
import config from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import apiRouter from './routes/index.js';

/** Builds the Express application (exported separately from server.js for testing). */
export function createApp({ logRequests = config.logRequests } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / non-browser requests (no Origin header) and configured origins.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST'],
    }),
  );
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    next();
  });
  if (logRequests) app.use(requestLogger);
  app.use(express.json({ limit: config.limits.jsonBodyLimit }));

  app.get('/', (req, res) => {
    res.json({ success: true, message: 'Lightweight Crypto Analyzer API. See /api/health and /api/algorithms.' });
  });
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
