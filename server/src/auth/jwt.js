import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import ApiError from '../utils/ApiError.js';

/**
 * Access tokens are signed JWTs (short-lived, stateless). Refresh tokens are
 * opaque random strings stored hashed in the DB (stateful, revocable).
 */

/** Sign a short-lived access token carrying the user id + permission claims. */
export const signAccessToken = (user, { permissions = [], roles = [] } = {}) => {
  return jwt.sign({ sub: user.id, email: user.email, roles, permissions }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
};

/** Verify an access token; throws ApiError(401) on any failure. */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token', { cause: err });
  }
};

/** Generate a cryptographically random opaque refresh token (raw string). */
export const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');

/** Hash a refresh token for storage / lookup (never store the raw value). */
export const hashRefreshToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

/** Compute the absolute expiry date for a new refresh token. */
export const refreshTokenExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + config.jwt.refreshTtlDays);
  return d;
};

export default {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
};
