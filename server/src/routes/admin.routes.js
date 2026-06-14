import { Router } from 'express';
import catalogController from '../controllers/catalog.controller.js';
import resourceController from '../controllers/resource.controller.js';
import adminController from '../controllers/admin.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePermission from '../middleware/requirePermission.js';
import validate from '../middleware/validate.js';
import { PERMISSIONS } from '../auth/rbac.constants.js';
import { idParam } from '../validators/common.validators.js';
import { catalogEntityParam, catalogEntityIdParam } from '../validators/catalog.validators.js';
import { setUserRolesBody } from '../validators/admin.validators.js';
import {
  listRequestsQuery,
  updateRequestStatusBody,
} from '../validators/request.validators.js';

/**
 * Management-only surface. Everything here requires authentication; each route
 * additionally checks the specific capability it needs.
 */
const router = Router();
router.use(requireAuth);

// --- Catalog write (catalog:manage) -----------------------------------------
router.post(
  '/catalog/:entity',
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  validate({ params: catalogEntityParam }),
  catalogController.create,
);
router.patch(
  '/catalog/:entity/:id',
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  validate({ params: catalogEntityIdParam }),
  catalogController.update,
);
router.delete(
  '/catalog/:entity/:id',
  requirePermission(PERMISSIONS.CATALOG_MANAGE),
  validate({ params: catalogEntityIdParam }),
  catalogController.remove,
);

// --- Resource approval queue (resource:approve) -----------------------------
/**
 * @openapi
 * /api/admin/resources/pending:
 *   get:
 *     summary: Pending (unapproved) resource submissions.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Pending resources with data and meta. } }
 */
router.get(
  '/resources/pending',
  requirePermission(PERMISSIONS.RESOURCE_APPROVE),
  resourceController.listPending,
);

// --- Users + roles (user:manage) --------------------------------------------
router.get('/users', requirePermission(PERMISSIONS.USER_MANAGE), adminController.listUsers);
router.put(
  '/users/:id/roles',
  requirePermission(PERMISSIONS.USER_MANAGE),
  validate({ params: idParam, body: setUserRolesBody }),
  adminController.setUserRoles,
);

// --- Resource requests triage (request:manage) ------------------------------
router.get(
  '/requests',
  requirePermission(PERMISSIONS.REQUEST_MANAGE),
  validate({ query: listRequestsQuery }),
  adminController.listRequests,
);
router.patch(
  '/requests/:id',
  requirePermission(PERMISSIONS.REQUEST_MANAGE),
  validate({ params: idParam, body: updateRequestStatusBody }),
  adminController.updateRequestStatus,
);

export default router;
