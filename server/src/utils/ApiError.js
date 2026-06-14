/**
 * Typed application error. Throw this anywhere in the request lifecycle and the
 * central errorHandler turns it into a consistent JSON response. Anything that
 * is NOT an ApiError is treated as an unexpected 500 (details hidden in prod).
 */
export default class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Human-readable, safe-to-expose message.
   * @param {object} [options]
   * @param {string} [options.code] - Stable machine-readable error code (e.g. 'NOT_FOUND').
   * @param {unknown} [options.details] - Extra context (e.g. validation issues).
   * @param {Error} [options.cause] - Underlying error, for logging only.
   */
  constructor(statusCode, message, { code, details, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || defaultCodeFor(statusCode);
    this.details = details;
    // Mark as expected so errorHandler can distinguish from programmer errors.
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', opts) {
    return new ApiError(400, message, opts);
  }

  static unauthorized(message = 'Unauthorized', opts) {
    return new ApiError(401, message, opts);
  }

  static forbidden(message = 'Forbidden', opts) {
    return new ApiError(403, message, opts);
  }

  static notFound(message = 'Not found', opts) {
    return new ApiError(404, message, opts);
  }

  static conflict(message = 'Conflict', opts) {
    return new ApiError(409, message, opts);
  }

  static internal(message = 'Internal server error', opts) {
    return new ApiError(500, message, opts);
  }
}

function defaultCodeFor(statusCode) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
  };
  return map[statusCode] || 'ERROR';
}
