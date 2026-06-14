import { Router } from 'express';
import meController from '../controllers/me.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePermission from '../middleware/requirePermission.js';
import validate from '../middleware/validate.js';
import { PERMISSIONS } from '../auth/rbac.constants.js';
import { createRequestBody } from '../validators/request.validators.js';

/** "Request a Resource" — student-facing create endpoint. */
const router = Router();

/**
 * @openapi
 * /api/requests:
 *   post:
 *     summary: Request a resource (student).
 *     tags: [Requests]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Request created. } }
 */
router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.REQUEST_CREATE),
  validate({ body: createRequestBody }),
  meController.createRequest,
);

export default router;
