 

/**
 * Users + Role-Based Access Control.
 *
 *   users                         — one row per authenticated person (Google)
 *   roles                         — e.g. student, management
 *   permissions                   — fine-grained capabilities (resource:approve)
 *   role_permissions  (M:N)       — which permissions a role grants
 *   user_roles        (M:N)       — which roles a user holds
 *
 * Enforcement is entirely app-layer (Express middleware) — there are no
 * Postgres RLS policies here (those were a Supabase-only concept).
 */

export const shorthands = undefined;

export const up = (pgm) => {
  const idCol = { id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') } };
  const ts = {
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  };

  // --- Users ------------------------------------------------------------------
  pgm.createTable('users', {
    ...idCol,
    google_id: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
    full_name: { type: 'text' },
    avatar_url: { type: 'text' },
    last_login_at: { type: 'timestamptz' },
    ...ts,
  });
  pgm.addConstraint('users', 'users_google_id_unique', { unique: ['google_id'] });
  pgm.addConstraint('users', 'users_email_unique', { unique: ['email'] });

  // --- Roles ------------------------------------------------------------------
  pgm.createTable('roles', {
    ...idCol,
    name: { type: 'text', notNull: true }, // 'student' | 'management'
    description: { type: 'text' },
    ...ts,
  });
  pgm.addConstraint('roles', 'roles_name_unique', { unique: ['name'] });

  // --- Permissions ------------------------------------------------------------
  pgm.createTable('permissions', {
    ...idCol,
    // Convention: '<resource>:<action>' e.g. 'resource:approve', 'catalog:manage'.
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    ...ts,
  });
  pgm.addConstraint('permissions', 'permissions_name_unique', { unique: ['name'] });

  // --- role_permissions (M:N) -------------------------------------------------
  pgm.createTable('role_permissions', {
    role_id: { type: 'uuid', notNull: true, references: 'roles', onDelete: 'CASCADE' },
    permission_id: {
      type: 'uuid',
      notNull: true,
      references: 'permissions',
      onDelete: 'CASCADE',
    },
  });
  pgm.addConstraint('role_permissions', 'role_permissions_pkey', {
    primaryKey: ['role_id', 'permission_id'],
  });
  pgm.createIndex('role_permissions', 'permission_id');

  // --- user_roles (M:N) -------------------------------------------------------
  pgm.createTable('user_roles', {
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'roles', onDelete: 'CASCADE' },
    assigned_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('user_roles', 'user_roles_pkey', { primaryKey: ['user_id', 'role_id'] });
  pgm.createIndex('user_roles', 'role_id');
};

export const down = (pgm) => {
  pgm.dropTable('user_roles');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
  pgm.dropTable('users');
};
