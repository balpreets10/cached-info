 

/**
 * Resources — the core content. Each resource is attached to exactly ONE of a
 * subject (university), skill, or exam (competitive). A CHECK constraint
 * enforces the "exactly one parent" rule, replacing the implicit branching the
 * old DataContext did at read time.
 *
 * Search: a pg_trgm GIN index over title+description powers the homepage
 * universal search bar (GET /api/search?q=).
 */

export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createExtension('pg_trgm', { ifNotExists: true });

  const idCol = { id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') } };
  const ts = {
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  };

  pgm.createTable('resources', {
    ...idCol,
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    url: { type: 'text', notNull: true },
    // Exactly one of these is non-null (see CHECK below).
    subject_id: { type: 'uuid', references: 'subjects', onDelete: 'SET NULL' },
    skill_id: { type: 'uuid', references: 'skills', onDelete: 'SET NULL' },
    exam_id: { type: 'uuid', references: 'exams', onDelete: 'SET NULL' },
    // Optional topic within a subject's syllabus (project-info: clicking a topic
    // opens topic-specific resources). Free-form for now.
    topic: { type: 'text' },
    is_approved: { type: 'boolean', notNull: true, default: false },
    submitted_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    approved_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    approved_at: { type: 'timestamptz' },
    ...ts,
  });

  // Exactly one parent (subject XOR skill XOR exam).
  pgm.addConstraint(
    'resources',
    'resources_one_parent_chk',
    `CHECK (
       (CASE WHEN subject_id IS NOT NULL THEN 1 ELSE 0 END) +
       (CASE WHEN skill_id   IS NOT NULL THEN 1 ELSE 0 END) +
       (CASE WHEN exam_id    IS NOT NULL THEN 1 ELSE 0 END) = 1
     )`,
  );

  pgm.createIndex('resources', 'subject_id');
  pgm.createIndex('resources', 'skill_id');
  pgm.createIndex('resources', 'exam_id');
  pgm.createIndex('resources', 'submitted_by');
  // Common filter: approved resources.
  pgm.createIndex('resources', 'is_approved');

  // Trigram GIN indexes for fuzzy search on the universal search bar.
  pgm.sql('CREATE INDEX resources_title_trgm_idx ON resources USING gin (title gin_trgm_ops)');
  pgm.sql(
    'CREATE INDEX resources_description_trgm_idx ON resources USING gin (description gin_trgm_ops)',
  );
};

export const down = (pgm) => {
  pgm.dropTable('resources');
};
