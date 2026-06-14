 

/**
 * Catalog tables — the browsable taxonomy that resources hang off of.
 *
 *   universities -> domains -> subjects        (university exam resources)
 *   skill_categories -> skills                  (skill-based resources)
 *   exam_categories -> exams                    (competitive exam resources)
 *
 * Mirrors the original Supabase schema (see database_policies.json / the
 * DataContext nested selects). UUID primary keys keep IDs portable for the
 * one-off Supabase -> self-hosted data migration.
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // gen_random_uuid() needs pgcrypto on older PG; PG 18 has it built in, but
  // enabling is idempotent and keeps staging/older envs safe.
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  const idCol = { id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') } };
  const ts = {
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  };

  // --- University branch ------------------------------------------------------
  pgm.createTable('universities', {
    ...idCol,
    name: { type: 'text', notNull: true },
    ...ts,
  });
  pgm.addConstraint('universities', 'universities_name_unique', { unique: ['name'] });

  pgm.createTable('domains', {
    ...idCol,
    name: { type: 'text', notNull: true },
    university_id: {
      type: 'uuid',
      notNull: true,
      references: 'universities',
      onDelete: 'CASCADE',
    },
    ...ts,
  });
  pgm.createIndex('domains', 'university_id');
  pgm.addConstraint('domains', 'domains_name_university_unique', {
    unique: ['university_id', 'name'],
  });

  pgm.createTable('subjects', {
    ...idCol,
    name: { type: 'text', notNull: true },
    domain_id: { type: 'uuid', notNull: true, references: 'domains', onDelete: 'CASCADE' },
    // Syllabus index lives on the subject (project-info: "Subject page: shows
    // syllabus index"). Stored as JSONB for flexible topic trees.
    syllabus: { type: 'jsonb', notNull: false },
    ...ts,
  });
  pgm.createIndex('subjects', 'domain_id');
  pgm.addConstraint('subjects', 'subjects_name_domain_unique', { unique: ['domain_id', 'name'] });

  // --- Skill branch -----------------------------------------------------------
  pgm.createTable('skill_categories', {
    ...idCol,
    name: { type: 'text', notNull: true },
    ...ts,
  });
  pgm.addConstraint('skill_categories', 'skill_categories_name_unique', { unique: ['name'] });

  pgm.createTable('skills', {
    ...idCol,
    name: { type: 'text', notNull: true },
    skill_category_id: {
      type: 'uuid',
      notNull: true,
      references: 'skill_categories',
      onDelete: 'CASCADE',
    },
    // Skill roadmap (project-info: "Skill page shows a skill roadmap").
    roadmap: { type: 'jsonb', notNull: false },
    ...ts,
  });
  pgm.createIndex('skills', 'skill_category_id');
  pgm.addConstraint('skills', 'skills_name_category_unique', {
    unique: ['skill_category_id', 'name'],
  });

  // --- Exam branch ------------------------------------------------------------
  pgm.createTable('exam_categories', {
    ...idCol,
    name: { type: 'text', notNull: true },
    ...ts,
  });
  pgm.addConstraint('exam_categories', 'exam_categories_name_unique', { unique: ['name'] });

  pgm.createTable('exams', {
    ...idCol,
    name: { type: 'text', notNull: true },
    exam_category_id: {
      type: 'uuid',
      notNull: true,
      references: 'exam_categories',
      onDelete: 'CASCADE',
    },
    ...ts,
  });
  pgm.createIndex('exams', 'exam_category_id');
  pgm.addConstraint('exams', 'exams_name_category_unique', { unique: ['exam_category_id', 'name'] });
};

export const down = (pgm) => {
  pgm.dropTable('exams');
  pgm.dropTable('exam_categories');
  pgm.dropTable('skills');
  pgm.dropTable('skill_categories');
  pgm.dropTable('subjects');
  pgm.dropTable('domains');
  pgm.dropTable('universities');
};
