import ApiError from '../utils/ApiError.js';

/**
 * Catch-all for unmatched routes. Mounted after all real routes but before the
 * errorHandler, so unknown paths produce a consistent 404 JSON envelope rather
 * than Express's default HTML page.
 */
export default function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
