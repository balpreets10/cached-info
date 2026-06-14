import { z } from 'zod';
import { uuid } from './common.validators.js';

/**
 * Per-entity write schemas for the generic catalog controller. Keyed by the
 * public entity name used in the URL (/api/admin/catalog/:entity).
 */
const name = z.string().trim().min(1).max(200);

export const catalogCreateSchemas = {
  universities: z.object({ name }),
  domains: z.object({ name, university_id: uuid }),
  subjects: z.object({ name, domain_id: uuid, syllabus: z.any().optional() }),
  'skill-categories': z.object({ name }),
  skills: z.object({ name, skill_category_id: uuid, roadmap: z.any().optional() }),
  'exam-categories': z.object({ name }),
  exams: z.object({ name, exam_category_id: uuid }),
};

// Updates allow any subset of the create fields.
export const catalogUpdateSchemas = Object.fromEntries(
  Object.entries(catalogCreateSchemas).map(([k, schema]) => [k, schema.partial()]),
);

/** Param schema for /:entity routes. */
export const catalogEntityParam = z.object({
  entity: z.enum(Object.keys(catalogCreateSchemas)),
});

export const catalogEntityIdParam = catalogEntityParam.extend({ id: uuid });

export default {
  catalogCreateSchemas,
  catalogUpdateSchemas,
  catalogEntityParam,
  catalogEntityIdParam,
};
