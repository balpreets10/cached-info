/**
 * The Express API wraps every success response as `{ data }` or `{ data, meta }`.
 * These helpers pull the payload out so callers work with plain values.
 */

/** Return just the `data` field from an axios response. */
export const unwrap = (res) => res.data?.data;

/** Return `{ data, meta }` for paginated endpoints. */
export const unwrapList = (res) => ({
  data: res.data?.data ?? [],
  meta: res.data?.meta ?? null,
});
