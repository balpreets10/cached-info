import { Router } from 'express';
import resourceController from '../controllers/resource.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePermission from '../middleware/requirePermission.js';
import validate from '../middleware/validate.js';
import { PERMISSIONS } from '../auth/rbac.constants.js';
import { idParam } from '../validators/common.validators.js';
import {
  listResourcesQuery,
  submitResourceBody,
  adminCreateResourceBody,
  updateResourceBody,
  approvalBody,
} from '../validators/resource.validators.js';

const router = Router();

/**
 * @openapi
 * /api/resources:
 *   get:
 *     summary: List approved resources (filterable, paginated).
 *     tags: [Resources]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: universityId, schema: { type: string, format: uuid } }
 *       - { in: query, name: subjectId, schema: { type: string, format: uuid } }
 *       - { in: query, name: type, schema: { type: string, enum: [university, skill, competitive] } }
 *     responses:
 *       200: { description: Paginated resources with data and meta. }
 */
router.get('/', validate({ query: listResourcesQuery }), resourceController.listApproved);

/**
 * @openapi
 * /api/resources/{id}:
 *   get:
 *     summary: Get a single approved resource.
 *     tags: [Resources]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: The resource. }
 *       404: { description: Not found or not approved. }
 */
router.get('/:id', validate({ params: idParam }), resourceController.getApproved);

/**
 * @openapi
 * /api/resources:
 *   post:
 *     summary: Submit a resource (student). Created pending approval.
 *     tags: [Resources]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Submission created (pending). }
 */
router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.RESOURCE_SUBMIT),
  validate({ body: submitResourceBody }),
  resourceController.submit,
);

// --- Management CRUD + approval ---------------------------------------------

router.post(
  '/admin',
  requireAuth,
  requirePermission(PERMISSIONS.RESOURCE_MANAGE),
  validate({ body: adminCreateResourceBody }),
  resourceController.adminCreate,
);

router.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.RESOURCE_MANAGE),
  validate({ params: idParam, body: updateResourceBody }),
  resourceController.adminUpdate,
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.RESOURCE_MANAGE),
  validate({ params: idParam }),
  resourceController.remove,
);

/**
 * @openapi
 * /api/resources/{id}/approval:
 *   patch:
 *     summary: Approve or reject a submitted resource (management).
 *     tags: [Resources]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated resource. }
 */
router.patch(
  '/:id/approval',
  requireAuth,
  requirePermission(PERMISSIONS.RESOURCE_APPROVE),
  validate({ params: idParam, body: approvalBody }),
  resourceController.setApproval,
);

export default router;
