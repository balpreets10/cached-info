import { query } from '../db.js';

/**
 * Data access for users. The ONLY place (besides other repositories) that
 * issues SQL against the users / user_roles / role_permissions tables.
 * Every method accepts an optional `db` executor so callers can run inside a
 * transaction; it defaults to the shared pool.
 */

/** Find a user by their Google subject id. */
export const findByGoogleId = async (googleId, db = query) => {
  const { rows } = await db('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] ?? null;
};

/** Find a user by id. */
export const findById = async (id, db = query) => {
  const { rows } = await db('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
};

/** Insert a new user. */
export const create = async ({ googleId, email, fullName, avatarUrl }, db = query) => {
  const { rows } = await db(
    `INSERT INTO users (google_id, email, full_name, avatar_url, last_login_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING *`,
    [googleId, email, fullName ?? null, avatarUrl ?? null],
  );
  return rows[0];
};

/** Refresh profile fields from the latest Google login. */
export const touchLogin = async (id, { email, fullName, avatarUrl }, db = query) => {
  const { rows } = await db(
    `UPDATE users
        SET email = COALESCE($2, email),
            full_name = COALESCE($3, full_name),
            avatar_url = COALESCE($4, avatar_url),
            last_login_at = now(),
            updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, email ?? null, fullName ?? null, avatarUrl ?? null],
  );
  return rows[0];
};

/** Assign a role to a user by role name (no-op if already assigned). */
export const assignRoleByName = async (userId, roleName, db = query) => {
  await db(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, r.id FROM roles r WHERE r.name = $2
     ON CONFLICT DO NOTHING`,
    [userId, roleName],
  );
};

/** Role names held by a user. */
export const getRoleNames = async (userId, db = query) => {
  const { rows } = await db(
    `SELECT r.name FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name`,
    [userId],
  );
  return rows.map((r) => r.name);
};

/** Distinct permission names a user has, resolved through their roles. */
export const getPermissionNames = async (userId, db = query) => {
  const { rows } = await db(
    `SELECT DISTINCT p.name
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1
      ORDER BY p.name`,
    [userId],
  );
  return rows.map((r) => r.name);
};

export default {
  findByGoogleId,
  findById,
  create,
  touchLogin,
  assignRoleByName,
  getRoleNames,
  getPermissionNames,
};
