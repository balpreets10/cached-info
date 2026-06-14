import { z } from 'zod';
import { uuid } from './common.validators.js';

/** Public list filters for GET /api/resources. */
export const listResourcesQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  universityId: uuid.optional(),
  domainId: uuid.optional(),
  subjectId: uuid.optional(),
  skillId: uuid.optional(),
  examId: uuid.optional(),
  type: z.enum(['university', 'skill', 'competitive']).optional(),
});

/** GET /api/search?q= */
export const searchQuery = z.object({
  q: z.string().trim().min(1, 'q is required'),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

// Exactly one of subjectId / skillId / examId is enforced in the service layer
// (clearer error than a zod refinement and shared by submit + admin create).
const resourceParentIds = {
  subjectId: uuid.optional(),
  skillId: uuid.optional(),
  examId: uuid.optional(),
};

/** Student submission body. */
export const submitResourceBody = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  url: z.string().url(),
  topic: z.string().trim().max(300).optional(),
  ...resourceParentIds,
});

/** Management create (can set approval). */
export const adminCreateResourceBody = submitResourceBody.extend({
  isApproved: z.boolean().optional(),
});

/** Management partial update. */
export const updateResourceBody = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  url: z.string().url().optional(),
  topic: z.string().trim().max(300).optional(),
  ...resourceParentIds,
});

export const approvalBody = z.object({
  isApproved: z.boolean(),
});

export default {
  listResourcesQuery,
  searchQuery,
  submitResourceBody,
  adminCreateResourceBody,
  updateResourceBody,
  approvalBody,
};
