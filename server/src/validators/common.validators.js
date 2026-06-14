import { z } from 'zod';

/** Reusable primitives. */
export const uuid = z.string().uuid();

export const idParam = z.object({ id: uuid });

/** Pagination + common list filters (query string → coerced numbers). */
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export default { uuid, idParam, paginationQuery };
