import { ValidationError } from '../utils/errors.js';

/** Rejects POST requests whose body is not a JSON object. */
export function requireJsonObjectBody(req, res, next) {
  if (!req.is('application/json')) {
    return next(new ValidationError('Content-Type must be application/json.'));
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(new ValidationError('Request body must be a JSON object.'));
  }
  return next();
}
