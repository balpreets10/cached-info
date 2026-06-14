import { query } from '../db.js';

/**
 * Data access for refresh tokens. Only hashes are stored — the raw token lives
 * solely in the user's httpOnly cookie. Supports rotation: when a token is used
 * we revoke it and record which token replaced it.
 */

/** Persist a new refresh token (hash) for a user. */
export const create = async ({ userId, tokenHash, expiresAt }, db = query) => {
  const { rows } = await db(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt],
  );
  return rows[0];
};

/** Look up an active (non-revoked, unexpired) token by its hash. */
export const findActiveByHash = async (tokenHash, db = query) => {
  const { rows } = await db(
    `SELECT * FROM refresh_tokens
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
};

/** Revoke a token, optionally recording the replacement token id (rotation). */
export const revoke = async (id, replacedById = null, db = query) => {
  await db(
    `UPDATE refresh_tokens
        SET revoked_at = now(), replaced_by = $2
      WHERE id = $1`,
    [id, replacedById],
  );
};

/** Revoke every active token for a user (full logout / "log out everywhere"). */
export const revokeAllForUser = async (userId, db = query) => {
  await db(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
};

export default { create, findActiveByHash, revoke, revokeAllForUser };
