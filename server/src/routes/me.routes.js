import { Router } from 'express';
import meController from '../controllers/me.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePermission from '../middleware/requirePermission.js';
import validate from '../middleware/validate.js';
import { PERMISSIONS } from '../auth/rbac.constants.js';
import { z } from 'zod';

/** Authenticated user's own data: saved resources, submissions, requests. */
const router = Router();

// Everything here requires a logged-in user.
router.use(requireAuth);

const resourceIdParam = z.object({ resourceId: z.string().uuid() });

/**
 * @openapi
 * /api/me/saved-resources:
 *   get:
 *     summary: List the current user's saved resources.
 *     tags: [Me]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Saved resources. } }
 */
router.get('/saved-resources', meController.listSaved);

router.post(
  '/saved-resources/:resourceId',
  requirePermission(PERMISSIONS.RESOURCE_SAVE),
  validate({ params: resourceIdParam }),
  meController.save,
);

router.delete(
  '/saved-resources/:resourceId',
  requirePermission(PERMISSIONS.RESOURCE_SAVE),
  validate({ params: resourceIdParam }),
  meController.unsave,
);

/**
 * @openapi
 * /api/me/submissions:
 *   get:
 *     summary: Resources the current user submitted (any status).
 *     tags: [Me]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Submitted resources. } }
 */
router.get('/submissions', meController.listSubmissions);

/**
 * @openapi
 * /api/me/requests:
 *   get:
 *     summary: The current user's resource requests.
 *     tags: [Me]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Requests. } }
 */
router.get('/requests', meController.listRequests);

export default router;
