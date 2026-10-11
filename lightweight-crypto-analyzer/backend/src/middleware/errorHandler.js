import { AppError } from '../utils/errors.js';

/**
 * Centralised error handler. Known errors become structured JSON responses; anything else
 * becomes a generic 500 so stack traces and internal details never reach the client.
 */
// Express recognises error handlers by their four parameters, so `next` must stay.
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
  }

  // Errors raised by express.json() while reading the request body.
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } });
  }

  // Log only the message and stack, never the request body (it may contain keys/plaintext).
  console.error(`[error] ${req.method} ${req.originalUrl}: ${error?.stack ?? error}`);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `No API route matches ${req.method} ${req.originalUrl}.` },
  });
}
