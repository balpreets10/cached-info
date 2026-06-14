import { Router } from 'express';
import catalogController from '../controllers/catalog.controller.js';
import validate from '../middleware/validate.js';
import { catalogEntityParam, catalogEntityIdParam } from '../validators/catalog.validators.js';

/**
 * Public, read-only catalog browsing. Writes live under /api/admin/catalog
 * (see admin.routes.js) behind the catalog:manage permission.
 */
const router = Router();

/**
 * @openapi
 * /api/catalog/universities/tree:
 *   get:
 *     summary: Universities with nested domains (browse filter).
 *     tags: [Catalog]
 *     responses: { 200: { description: University tree. } }
 */
router.get('/universities/tree', catalogController.universitiesTree);

/**
 * @openapi
 * /api/catalog/{entity}:
 *   get:
 *     summary: List a catalog type (universities, domains, subjects, skills, exams…).
 *     tags: [Catalog]
 *     parameters:
 *       - { in: path, name: entity, required: true, schema: { type: string } }
 *       - { in: query, name: parentId, schema: { type: string, format: uuid }, description: "Filter children by parent id." }
 *     responses: { 200: { description: Catalog rows. } }
 */
router.get('/:entity', validate({ params: catalogEntityParam }), catalogController.list);

/**
 * @openapi
 * /api/catalog/{entity}/{id}:
 *   get:
 *     summary: Get one catalog row by id.
 *     tags: [Catalog]
 *     responses: { 200: { description: The row. }, 404: { description: Not found. } }
 */
router.get('/:entity/:id', validate({ params: catalogEntityIdParam }), catalogController.getById);

export default router;
