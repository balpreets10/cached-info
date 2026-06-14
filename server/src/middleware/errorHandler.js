import { ZodError } from 'zod';
import ApiError from '../utils/ApiError.js';
import config from '../config.js';

/**
 * Central error handler — the LAST middleware mounted on the app. Every thrown
 * ApiError, Zod validation error, or unexpected error funnels through here and
 * leaves as a consistent JSON envelope: { error: { code, message, details? } }.
 *
 * Must keep the 4-arg signature so Express recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  let apiError = err;

  // Normalise known error shapes into ApiError.
  if (err instanceof ZodError) {
    apiError = ApiError.badRequest('Validation failed', {
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  } else if (!(err instanceof ApiError)) {
    // Unexpected / programmer error — don't leak internals in non-dev.
    apiError = ApiError.internal(
      config.env === 'development' ? err.message : 'Internal server error',
      { cause: err },
    );
  }

  // Log server-side faults (and the original cause) for diagnostics.
  if (apiError.statusCode >= 500) {
    console.error('[error]', req.method, req.originalUrl, '-', err?.stack || err);
  }

  const body = {
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
  };

  res.status(apiError.statusCode).json(body);
}
