import { query } from '../db.js';
import ApiError from '../utils/ApiError.js';

/**
 * Catalog data access. The catalog is a small set of structurally-similar
 * tables, so generic CRUD is produced by a factory; relationship-aware reads
 * (e.g. a university with its nested domains/subjects) are written explicitly.
 *
 * Each table has: id, name, <optional parent FK>, optional extra columns,
 * created_at, updated_at.
 */

/**
 * Build CRUD methods for one catalog table.
 * @param {string} table
 * @param {string[]} columns - writable columns (besides id/timestamps).
 * @param {string|null} parentCol - FK column name for filtering children, if any.
 */
function makeCrud(table, columns, parentCol = null) {
  const selectCols = ['id', ...columns, 'created_at', 'updated_at'].join(', ');

  return {
    async list({ parentId } = {}, db = query) {
      if (parentCol && parentId) {
        const { rows } = await db(
          `SELECT ${selectCols} FROM ${table} WHERE ${parentCol} = $1 ORDER BY name`,
          [parentId],
        );
        return rows;
      }
      const { rows } = await db(`SELECT ${selectCols} FROM ${table} ORDER BY name`);
      return rows;
    },

    async getById(id, db = query) {
      const { rows } = await db(`SELECT ${selectCols} FROM ${table} WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async create(data, db = query) {
      const cols = columns.filter((c) => data[c] !== undefined);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map((c) => data[c]);
      const { rows } = await db(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING ${selectCols}`,
        values,
      );
      return rows[0];
    },

    async update(id, data, db = query) {
      const cols = columns.filter((c) => data[c] !== undefined);
      if (cols.length === 0) return this.getById(id, db);
      const sets = cols.map((c, i) => `${c} = $${i + 2}`);
      const values = cols.map((c) => data[c]);
      const { rows } = await db(
        `UPDATE ${table} SET ${sets.join(', ')}, updated_at = now()
         WHERE id = $1 RETURNING ${selectCols}`,
        [id, ...values],
      );
      if (!rows[0]) throw ApiError.notFound(`${table} not found`);
      return rows[0];
    },

    async remove(id, db = query) {
      const { rowCount } = await db(`DELETE FROM ${table} WHERE id = $1`, [id]);
      if (rowCount === 0) throw ApiError.notFound(`${table} not found`);
    },
  };
}

export const universities = makeCrud('universities', ['name']);
export const domains = makeCrud('domains', ['name', 'university_id'], 'university_id');
export const subjects = makeCrud('subjects', ['name', 'domain_id', 'syllabus'], 'domain_id');
export const skillCategories = makeCrud('skill_categories', ['name']);
export const skills = makeCrud('skills', ['name', 'skill_category_id', 'roadmap'], 'skill_category_id');
export const examCategories = makeCrud('exam_categories', ['name']);
export const exams = makeCrud('exams', ['name', 'exam_category_id'], 'exam_category_id');

/** Universities with nested domains and subjects (powers the browse filter). */
export const universitiesWithTree = async (db = query) => {
  const { rows } = await db(`
    SELECT u.id, u.name,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('id', d.id, 'name', d.name)
        ) FILTER (WHERE d.id IS NOT NULL), '[]'
      ) AS domains
    FROM universities u
    LEFT JOIN domains d ON d.university_id = u.id
    GROUP BY u.id, u.name
    ORDER BY u.name
  `);
  return rows;
};

export default {
  universities,
  domains,
  subjects,
  skillCategories,
  skills,
  examCategories,
  exams,
  universitiesWithTree,
};
