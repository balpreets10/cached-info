 

/**
 * Per-user activity + auth token storage.
 *
 *   user_saved_resources   — resources a student bookmarked (replaces the old
 *                            localStorage 'savedResources').
 *   user_resource_requests — "Request a Resource" form submissions.
 *   refresh_tokens         — hashed refresh tokens for JWT refresh rotation.
 *
 * Note: "submitted resources" are derived from resources.submitted_by rather
 * than a separate join table, so there's no user_submitted_resources here.
 */

export const shorthands = undefined;

export const up = (pgm) => {
  const idCol = { id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') } };
  const ts = {
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  };

  // --- Saved resources --------------------------------------------------------
  pgm.createTable('user_saved_resources', {
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    resource_id: { type: 'uuid', notNull: true, references: 'resources', onDelete: 'CASCADE' },
    saved_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('user_saved_resources', 'user_saved_resources_pkey', {
    primaryKey: ['user_id', 'resource_id'],
  });
  pgm.createIndex('user_saved_resources', 'resource_id');

  // --- Resource requests ------------------------------------------------------
  pgm.createTable('user_resource_requests', {
    ...idCol,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    // free-form context the requester gives (subject/skill/exam they want)
    context: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'open' }, // open | fulfilled | rejected
    ...ts,
  });
  pgm.createIndex('user_resource_requests', 'user_id');
  pgm.createIndex('user_resource_requests', 'status');

  // --- Refresh tokens ---------------------------------------------------------
  pgm.createTable('refresh_tokens', {
    ...idCol,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    // SHA-256 hash of the opaque token — never store the raw token.
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
    // Points to the token that replaced this one (refresh rotation audit trail).
    replaced_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('refresh_tokens', 'refresh_tokens_token_hash_unique', { unique: ['token_hash'] });
  pgm.createIndex('refresh_tokens', 'user_id');
};

export const down = (pgm) => {
  pgm.dropTable('refresh_tokens');
  pgm.dropTable('user_resource_requests');
  pgm.dropTable('user_saved_resources');
};
