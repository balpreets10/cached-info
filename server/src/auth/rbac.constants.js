/**
 * Canonical RBAC vocabulary. The seed script writes these into the DB and the
 * permission middleware / controllers reference them by name, so there is a
 * single source of truth for capability strings.
 *
 * Convention: '<resource>:<action>'.
 */

export const ROLES = {
  STUDENT: 'student',
  MANAGEMENT: 'management',
};

export const PERMISSIONS = {
  // Reading approved content is public, so no permission needed for that.
  RESOURCE_SUBMIT: 'resource:submit', // student: submit a resource (pending)
  RESOURCE_SAVE: 'resource:save', // student: bookmark resources
  REQUEST_CREATE: 'request:create', // student: request a resource

  RESOURCE_MANAGE: 'resource:manage', // management: full CRUD on resources
  RESOURCE_APPROVE: 'resource:approve', // management: approve/reject submissions
  CATALOG_MANAGE: 'catalog:manage', // management: CRUD universities/domains/etc.
  REQUEST_MANAGE: 'request:manage', // management: triage resource requests
  USER_MANAGE: 'user:manage', // management: view users, assign roles
};

/** Human-readable descriptions, used when seeding the permissions table. */
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.RESOURCE_SUBMIT]: 'Submit a new resource for approval',
  [PERMISSIONS.RESOURCE_SAVE]: 'Save/bookmark resources',
  [PERMISSIONS.REQUEST_CREATE]: 'Request a resource',
  [PERMISSIONS.RESOURCE_MANAGE]: 'Create, edit and delete resources',
  [PERMISSIONS.RESOURCE_APPROVE]: 'Approve or reject submitted resources',
  [PERMISSIONS.CATALOG_MANAGE]: 'Manage universities, domains, subjects, skills and exams',
  [PERMISSIONS.REQUEST_MANAGE]: 'Triage and resolve resource requests',
  [PERMISSIONS.USER_MANAGE]: 'View users and assign roles',
};

/** Which permissions each role is granted. */
export const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    PERMISSIONS.RESOURCE_SUBMIT,
    PERMISSIONS.RESOURCE_SAVE,
    PERMISSIONS.REQUEST_CREATE,
  ],
  [ROLES.MANAGEMENT]: [
    // Management can do everything a student can, plus manage the platform.
    PERMISSIONS.RESOURCE_SUBMIT,
    PERMISSIONS.RESOURCE_SAVE,
    PERMISSIONS.REQUEST_CREATE,
    PERMISSIONS.RESOURCE_MANAGE,
    PERMISSIONS.RESOURCE_APPROVE,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.REQUEST_MANAGE,
    PERMISSIONS.USER_MANAGE,
  ],
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.STUDENT]: 'Default role: browse, search, save, submit and request resources',
  [ROLES.MANAGEMENT]: 'Platform managers: approve submissions and manage all catalog data',
};
