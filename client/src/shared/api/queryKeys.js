/**
 * Centralized React Query keys so invalidations stay consistent across hooks.
 * Each key is a function returning a stable array; pass params for scoping.
 */
export const queryKeys = {
  resources: (params = {}) => ['resources', params],
  resource: (id) => ['resource', id],
  search: (q, limit) => ['search', q, limit],
  universitiesTree: () => ['catalog', 'universities', 'tree'],
  catalog: (entity, parentId) => ['catalog', entity, parentId ?? null],
  savedResources: () => ['me', 'saved-resources'],
  mySubmissions: () => ['me', 'submissions'],
  myRequests: () => ['me', 'requests'],
  // Admin
  pendingResources: (params = {}) => ['admin', 'resources', 'pending', params],
  adminUsers: () => ['admin', 'users'],
  adminRequests: (status) => ['admin', 'requests', status ?? 'all'],
};
