import pool from '../db.js';
import userRepository from '../repositories/user.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import * as jwtUtil from '../auth/jwt.js';
import { ROLES } from '../auth/rbac.constants.js';
import ApiError from '../utils/ApiError.js';

/**
 * Run a function inside a transaction, passing a bound `db(text, params)`
 * executor that uses the same client. Commits on success, rolls back on throw.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const db = (text, params) => client.query(text, params);
    const result = await fn(db);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Find or create a user from a normalized Google profile, assigning the default
 * `student` role to brand-new users. Returns the user row.
 */
export async function findOrCreateFromGoogle(profile) {
  const { googleId, email, fullName, avatarUrl } = profile;
  if (!googleId || !email) {
    throw ApiError.badRequest('Google profile missing id or email');
  }

  return withTransaction(async (db) => {
    const existing = await userRepository.findByGoogleId(googleId, db);
    if (existing) {
      return userRepository.touchLogin(existing.id, { email, fullName, avatarUrl }, db);
    }
    const user = await userRepository.create({ googleId, email, fullName, avatarUrl }, db);
    await userRepository.assignRoleByName(user.id, ROLES.STUDENT, db);
    return user;
  });
}

/** Build an access+refresh token pair for a user and persist the refresh hash. */
export async function issueTokenPair(user) {
  const [roles, permissions] = await Promise.all([
    userRepository.getRoleNames(user.id),
    userRepository.getPermissionNames(user.id),
  ]);

  const accessToken = jwtUtil.signAccessToken(user, { roles, permissions });

  const rawRefresh = jwtUtil.generateRefreshToken();
  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: jwtUtil.hashRefreshToken(rawRefresh),
    expiresAt: jwtUtil.refreshTokenExpiry(),
  });

  return { accessToken, refreshToken: rawRefresh, roles, permissions };
}

/**
 * Rotate a refresh token: validate the presented raw token, revoke it, and
 * issue a fresh pair. Throws 401 if the token is unknown/expired/revoked.
 */
export async function rotateRefreshToken(rawRefresh) {
  if (!rawRefresh) throw ApiError.unauthorized('Missing refresh token');

  const tokenHash = jwtUtil.hashRefreshToken(rawRefresh);
  const stored = await refreshTokenRepository.findActiveByHash(tokenHash);
  if (!stored) throw ApiError.unauthorized('Invalid or expired refresh token');

  const user = await userRepository.findById(stored.user_id);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  const pair = await issueTokenPair(user);
  // Revoke the old token and link it to the user (rotation audit). The new
  // token's id isn't surfaced by issueTokenPair, so we record null here; the
  // important part is the old one is now revoked and cannot be reused.
  await refreshTokenRepository.revoke(stored.id, null);

  return { user, ...pair };
}

/** Revoke a single refresh token (logout this session). */
export async function logout(rawRefresh) {
  if (!rawRefresh) return;
  const tokenHash = jwtUtil.hashRefreshToken(rawRefresh);
  const stored = await refreshTokenRepository.findActiveByHash(tokenHash);
  if (stored) await refreshTokenRepository.revoke(stored.id, null);
}

/** Hydrate the "current user" payload returned by GET /api/auth/me. */
export async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.unauthorized('User not found');
  const [roles, permissions] = await Promise.all([
    userRepository.getRoleNames(userId),
    userRepository.getPermissionNames(userId),
  ]);
  return { user: toPublicUser(user), roles, permissions };
}

/** Strip internal columns before sending a user to the client. */
export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
  };
}

export default {
  findOrCreateFromGoogle,
  issueTokenPair,
  rotateRefreshToken,
  logout,
  getCurrentUser,
  toPublicUser,
};
