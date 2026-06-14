/**
 * Pagination helpers shared by list endpoints. Keeps limit/offset math and the
 * response `meta` shape consistent across the API.
 */

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Clamp/normalize page+limit (already coerced to numbers by zod) into SQL bounds. */
export const toLimitOffset = ({ page = 1, limit = DEFAULT_LIMIT } = {}) => {
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const safePage = Math.max(1, page);
  return { limit: safeLimit, offset: (safePage - 1) * safeLimit, page: safePage };
};

/** Build the `meta` block returned alongside paginated `data`. */
export const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export default { DEFAULT_LIMIT, MAX_LIMIT, toLimitOffset, buildMeta };
