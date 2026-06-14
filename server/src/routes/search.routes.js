import { Router } from 'express';
import resourceController from '../controllers/resource.controller.js';
import validate from '../middleware/validate.js';
import { searchQuery } from '../validators/resource.validators.js';

const router = Router();

/**
 * @openapi
 * /api/search:
 *   get:
 *     summary: Universal fuzzy search across approved resources (homepage bar).
 *     tags: [Search]
 *     parameters:
 *       - { in: query, name: q, required: true, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Matching resources. }
 */
router.get('/', validate({ query: searchQuery }), resourceController.search);

export default router;
