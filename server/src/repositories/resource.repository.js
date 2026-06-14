import { query } from '../db.js';
import ApiError from '../utils/ApiError.js';

/**
 * Resource data access. Reads join out to the catalog so each row carries the
 * resolved subject/domain/university OR skill/category OR exam/category names —
 * the shape the frontend used to assemble client-side from Supabase.
 */

// Reusable SELECT that resolves a resource's parent names via LEFT JOINs.
const RESOURCE_SELECT = `
  SELECT r.id, r.title, r.description, r.url, r.topic, r.is_approved,
         r.subject_id, r.skill_id, r.exam_id, r.submitted_by, r.created_at,
         subj.name  AS subject_name,
         dom.id     AS domain_id,   dom.name  AS domain_name,
         uni.id     AS university_id, uni.name AS university_name,
         sk.name    AS skill_name,
         skc.name   AS skill_category_name,
         ex.name    AS exam_name,
         exc.name   AS exam_category_name
  FROM resources r
  LEFT JOIN subjects subj ON subj.id = r.subject_id
  LEFT JOIN domains dom   ON dom.id = subj.domain_id
  LEFT JOIN universities uni ON uni.id = dom.university_id
  LEFT JOIN skills sk     ON sk.id = r.skill_id
  LEFT JOIN skill_categories skc ON skc.id = sk.skill_category_id
  LEFT JOIN exams ex      ON ex.id = r.exam_id
  LEFT JOIN exam_categories exc ON exc.id = ex.exam_category_id
`;

/**
 * Build a WHERE clause + params from filters. `approvedOnly` defaults to true
 * (public listing); admin listing passes false to include pending.
 */
function buildFilters({ universityId, domainId, subjectId, skillId, examId, type } = {}, approvedOnly) {
  const conditions = [];
  const params = [];
  const add = (sql, val) => {
    params.push(val);
    conditions.push(sql.replace('$?', `$${params.length}`));
  };

  if (approvedOnly) conditions.push('r.is_approved = true');
  if (subjectId) add('r.subject_id = $?', subjectId);
  if (domainId) add('subj.domain_id = $?', domainId);
  if (universityId) add('dom.university_id = $?', universityId);
  if (skillId) add('r.skill_id = $?', skillId);
  if (examId) add('r.exam_id = $?', examId);
  if (type === 'university') conditions.push('r.subject_id IS NOT NULL');
  if (type === 'skill') conditions.push('r.skill_id IS NOT NULL');
  if (type === 'competitive') conditions.push('r.exam_id IS NOT NULL');

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

/** Paginated list with optional filters. Returns { rows, total }. */
export const list = async ({ filters = {}, limit, offset, approvedOnly = true } = {}, db = query) => {
  const { where, params } = buildFilters(filters, approvedOnly);

  const countSql = `SELECT count(*)::int AS total FROM resources r
    LEFT JOIN subjects subj ON subj.id = r.subject_id
    LEFT JOIN domains dom ON dom.id = subj.domain_id ${where}`;
  const { rows: countRows } = await db(countSql, params);

  const listSql = `${RESOURCE_SELECT} ${where}
    ORDER BY r.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const { rows } = await db(listSql, [...params, limit, offset]);

  return { rows, total: countRows[0].total };
};

/** Single resource by id (any approval state — callers decide visibility). */
export const getById = async (id, db = query) => {
  const { rows } = await db(`${RESOURCE_SELECT} WHERE r.id = $1`, [id]);
  return rows[0] ?? null;
};

/** Fuzzy search across title + description (pg_trgm), approved only. */
export const search = async ({ q, limit = 10 }, db = query) => {
  const { rows } = await db(
    `${RESOURCE_SELECT}
      WHERE r.is_approved = true
        AND (r.title ILIKE '%' || $1 || '%' OR r.description ILIKE '%' || $1 || '%')
      ORDER BY similarity(r.title, $1) DESC, r.created_at DESC
      LIMIT $2`,
    [q, limit],
  );
  return rows;
};

/** Insert a resource (defaults to pending / is_approved = false). */
export const create = async (data, db = query) => {
  const { title, description, url, subjectId, skillId, examId, topic, submittedBy, isApproved } =
    data;
  const { rows } = await db(
    `INSERT INTO resources
       (title, description, url, subject_id, skill_id, exam_id, topic, submitted_by, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, false))
     RETURNING id`,
    [title, description ?? null, url, subjectId ?? null, skillId ?? null, examId ?? null, topic ?? null, submittedBy ?? null, isApproved ?? null],
  );
  return getById(rows[0].id, db);
};

/** Patch editable fields. */
export const update = async (id, data, db = query) => {
  const map = {
    title: 'title',
    description: 'description',
    url: 'url',
    topic: 'topic',
    subjectId: 'subject_id',
    skillId: 'skill_id',
    examId: 'exam_id',
  };
  const sets = [];
  const params = [];
  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getById(id, db);
  params.push(id);
  const { rows } = await db(
    `UPDATE resources SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $${params.length} RETURNING id`,
    params,
  );
  if (!rows[0]) throw ApiError.notFound('Resource not found');
  return getById(id, db);
};

/** Approve/reject a submission, stamping the approver. */
export const setApproval = async (id, { isApproved, approvedBy }, db = query) => {
  const { rows } = await db(
    `UPDATE resources
        SET is_approved = $2,
            approved_by = $3,
            approved_at = CASE WHEN $2 THEN now() ELSE NULL END,
            updated_at = now()
      WHERE id = $1 RETURNING id`,
    [id, isApproved, approvedBy ?? null],
  );
  if (!rows[0]) throw ApiError.notFound('Resource not found');
  return getById(id, db);
};

export const remove = async (id, db = query) => {
  const { rowCount } = await db('DELETE FROM resources WHERE id = $1', [id]);
  if (rowCount === 0) throw ApiError.notFound('Resource not found');
};

/** Pending submissions for the management approval queue. */
export const listPending = async ({ limit, offset } = {}, db = query) => {
  const { rows: countRows } = await db(
    'SELECT count(*)::int AS total FROM resources WHERE is_approved = false',
  );
  const { rows } = await db(
    `${RESOURCE_SELECT} WHERE r.is_approved = false
      ORDER BY r.created_at ASC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return { rows, total: countRows[0].total };
};

/** Resources a given user submitted (any status). */
export const listBySubmitter = async (userId, db = query) => {
  const { rows } = await db(
    `${RESOURCE_SELECT} WHERE r.submitted_by = $1 ORDER BY r.created_at DESC`,
    [userId],
  );
  return rows;
};

export default {
  list,
  getById,
  search,
  create,
  update,
  setApproval,
  remove,
  listPending,
  listBySubmitter,
};
