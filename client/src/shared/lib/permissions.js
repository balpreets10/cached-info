/**
 * Capability strings, mirrored from the backend's single source of truth at
 * server/src/auth/rbac.constants.js. Gate UI on these — NOT on role names —
 * so the client matches the server's RBAC checks.
 */
export const PERMISSIONS = {
  RESOURCE_SUBMIT: 'resource:submit',
  RESOURCE_SAVE: 'resource:save',
  REQUEST_CREATE: 'request:create',
  RESOURCE_MANAGE: 'resource:manage',
  RESOURCE_APPROVE: 'resource:approve',
  CATALOG_MANAGE: 'catalog:manage',
  REQUEST_MANAGE: 'request:manage',
  USER_MANAGE: 'user:manage',
};

export const ROLES = {
  STUDENT: 'student',
  MANAGEMENT: 'management',
};
