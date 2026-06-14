import { verifyAccessToken } from '../auth/jwt.js';
import ApiError from '../utils/ApiError.js';

/**
 * Authenticate the request from its Bearer access token. On success attaches
 * `req.user = { id, email, roles, permissions }`. Throws 401 otherwise.
 */
export default function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const payload = verifyAccessToken(token); // throws ApiError(401) on failure
  req.user = {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles || [],
    permissions: payload.permissions || [],
  };
  next();
}
