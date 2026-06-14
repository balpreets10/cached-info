import pool, { query } from '../db.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../auth/rbac.constants.js';

/** Management view of users + role assignment. */

const VALID_ROLES = new Set(Object.values(ROLES));

export async function listUsers() {
  const { rows } = await query(`
    SELECT u.id, u.email, u.full_name, u.avatar_url, u.last_login_at, u.created_at,
      COALESCE(
        array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}'
      ) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    avatarUrl: u.avatar_url,
    lastLoginAt: u.last_login_at,
    roles: u.roles,
  }));
}

/** Replace a user's roles atomically with the provided set (by role name). */
export async function setUserRoles(userId, roleNames) {
  const invalid = roleNames.filter((r) => !VALID_ROLES.has(r));
  if (invalid.length) throw ApiError.badRequest(`Unknown role(s): ${invalid.join(', ')}`);

  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    for (const roleName of roleNames) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE name = $2`,
        [userId, roleName],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const roles = await userRepository.getRoleNames(userId);
  return { id: userId, roles };
}

export default { listUsers, setUserRoles };
