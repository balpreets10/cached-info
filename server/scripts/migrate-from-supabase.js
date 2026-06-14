/**
 * ONE-OFF data migration: Supabase (old) -> self-hosted Postgres (new).
 *
 * Run during the Phase 6 cutover, AFTER `npm run migrate` has created the
 * schema and `npm run seed` has created roles/permissions. It copies catalog
 * rows, resources, and user profiles, preserving UUIDs so foreign keys line up.
 *
 * IMPORTANT — take a PG dump before running (this is the irreversible-ish step):
 *   pg_dump "$DATABASE_URL" > backup-before-migration.sql
 *
 * Required env (in server/.env or process env):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY   (service key — needs full read access)
 *   DATABASE_URL                          (target self-hosted PG)
 *
 * Usage:
 *   node scripts/migrate-from-supabase.js          # migrate
 *   node scripts/migrate-from-supabase.js --dry-run # report counts only
 *
 * NOTE: @supabase/supabase-js is NOT a server dependency (it lives in client/).
 * Before running this one-off script, install it temporarily in server/:
 *   npm i --no-save @supabase/supabase-js
 */
import { createClient } from '@supabase/supabase-js';
import pool from '../src/db.js';

const DRY_RUN = process.argv.includes('--dry-run');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[migrate] SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/** Pull every row from a Supabase table (paginated to dodge the 1000-row cap). */
async function fetchAll(table) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase read ${table}: ${error.message}`);
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/**
 * Insert rows into the target table, keeping only the listed columns and
 * skipping conflicts on primary key. Returns the number of rows attempted.
 */
async function copyTable(client, table, rows, columns) {
  if (rows.length === 0) return 0;
  for (const row of rows) {
    const values = columns.map((c) => row[c] ?? null);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT (id) DO NOTHING`,
      values,
    );
  }
  return rows.length;
}

async function run() {
  // Read everything from Supabase first (fail fast before touching target DB).
  console.log('[migrate] Reading from Supabase…');
  const [
    universities,
    domains,
    subjects,
    skillCategories,
    skills,
    examCategories,
    exams,
    resources,
    userProfiles,
  ] = await Promise.all([
    fetchAll('universities'),
    fetchAll('domains'),
    fetchAll('subjects'),
    fetchAll('skill_categories'),
    fetchAll('skills'),
    fetchAll('exam_categories'),
    fetchAll('exams'),
    fetchAll('resources'),
    fetchAll('user_profiles'),
  ]);

  const report = {
    universities: universities.length,
    domains: domains.length,
    subjects: subjects.length,
    skill_categories: skillCategories.length,
    skills: skills.length,
    exam_categories: examCategories.length,
    exams: exams.length,
    resources: resources.length,
    user_profiles: userProfiles.length,
  };
  console.table(report);

  if (DRY_RUN) {
    console.log('[migrate] Dry run — no writes performed.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Order matters: parents before children.
    await copyTable(client, 'universities', universities, ['id', 'name']);
    await copyTable(client, 'domains', domains, ['id', 'name', 'university_id']);
    await copyTable(client, 'subjects', subjects, ['id', 'name', 'domain_id']);
    await copyTable(client, 'skill_categories', skillCategories, ['id', 'name']);
    await copyTable(client, 'skills', skills, ['id', 'name', 'skill_category_id']);
    await copyTable(client, 'exam_categories', examCategories, ['id', 'name']);
    await copyTable(client, 'exams', exams, ['id', 'name', 'exam_category_id']);

    // Users: old user_profiles.id is the auth user id. We seed a minimal users
    // row so resources.submitted_by FKs resolve. google_id/email may be unknown
    // for legacy profiles — fall back to placeholders that a later login fixes.
    for (const p of userProfiles) {
      await client.query(
        `INSERT INTO users (id, google_id, email, full_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id,
          `legacy:${p.id}`,
          p.email ?? `legacy+${p.id}@migrated.local`,
          p.full_name ?? null,
        ],
      );
    }

    await copyTable(client, 'resources', resources, [
      'id',
      'title',
      'description',
      'url',
      'subject_id',
      'skill_id',
      'exam_id',
      'is_approved',
      'submitted_by',
      'created_at',
    ]);

    await client.query('COMMIT');
    console.log('[migrate] Migration committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] Rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] Fatal:', err);
  process.exit(1);
});
