/**
 * Application error with an HTTP status code and a stable machine-readable code.
 * Messages are written for end users; they never contain keys or plaintext.
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

/** The request was well-formed but the ciphertext could not be decrypted. */
export class DecryptionError extends AppError {
  constructor(message, code = 'DECRYPTION_FAILED', details) {
    super(422, code, message, details);
    this.name = 'DecryptionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/** An algorithm exists but failed its known-answer self-test, so it is disabled. */
export class UnavailableError extends AppError {
  constructor(message) {
    super(503, 'ALGORITHM_UNAVAILABLE', message);
    this.name = 'UnavailableError';
  }
}
