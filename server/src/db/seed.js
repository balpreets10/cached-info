/**
 * Idempotent seed: roles, permissions, role→permission grants, and (if
 * BOOTSTRAP_ADMIN_EMAIL is set and that user already exists) the management
 * role for the bootstrap admin.
 *
 * Safe to run repeatedly — every insert uses ON CONFLICT DO NOTHING/UPDATE.
 * Run with: npm run seed
 */
import pool from '../db.js';
import config from '../config.js';
import {
  ROLES,
  ROLE_DESCRIPTIONS,
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_PERMISSIONS,
} from '../auth/rbac.constants.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Roles ----------------------------------------------------------------
    for (const name of Object.values(ROLES)) {
      await client.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, updated_at = now()`,
        [name, ROLE_DESCRIPTIONS[name] ?? null],
      );
    }

    // --- Permissions ----------------------------------------------------------
    for (const name of Object.values(PERMISSIONS)) {
      await client.query(
        `INSERT INTO permissions (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, updated_at = now()`,
        [name, PERMISSION_DESCRIPTIONS[name] ?? null],
      );
    }

    // --- role_permissions -----------------------------------------------------
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permName of perms) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id FROM roles r, permissions p
           WHERE r.name = $1 AND p.name = $2
           ON CONFLICT DO NOTHING`,
          [roleName, permName],
        );
      }
    }

    // --- Bootstrap admin ------------------------------------------------------
    if (config.bootstrapAdminEmail) {
      const { rowCount } = await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT u.id, r.id FROM users u, roles r
         WHERE u.email = $1 AND r.name = $2
         ON CONFLICT DO NOTHING`,
        [config.bootstrapAdminEmail, ROLES.MANAGEMENT],
      );
      if (rowCount > 0) {
        console.log(`[seed] Granted management role to ${config.bootstrapAdminEmail}`);
      } else {
        console.log(
          `[seed] Bootstrap admin ${config.bootstrapAdminEmail} not found yet (sign in once via Google, then re-run seed).`,
        );
      }
    }

    await client.query('COMMIT');
    console.log('[seed] Done: roles, permissions and grants are in place.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
