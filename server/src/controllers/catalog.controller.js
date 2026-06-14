import catalogService from '../services/catalog.service.js';
import { catalogCreateSchemas, catalogUpdateSchemas } from '../validators/catalog.validators.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

/**
 * Generic catalog controller — one set of handlers serves all seven catalog
 * entities. The entity name comes from the URL param and selects both the
 * repository (via the service) and the zod schema for writes.
 */

export const list = asyncHandler(async (req, res) => {
  const { entity } = req.params;
  // Optional parent filter (e.g. ?parentId=<universityId> for domains).
  const data = await catalogService.list(entity, { parentId: req.query.parentId });
  res.json({ data });
});

export const getById = asyncHandler(async (req, res) => {
  const data = await catalogService.getById(req.params.entity, req.params.id);
  res.json({ data });
});

export const create = asyncHandler(async (req, res) => {
  const { entity } = req.params;
  const body = parseBody(catalogCreateSchemas, entity, req.body);
  const data = await catalogService.create(entity, body);
  res.status(201).json({ data });
});

export const update = asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const body = parseBody(catalogUpdateSchemas, entity, req.body);
  const data = await catalogService.update(entity, id, body);
  res.json({ data });
});

export const remove = asyncHandler(async (req, res) => {
  await catalogService.remove(req.params.entity, req.params.id);
  res.status(204).end();
});

/** Universities-with-domains tree for the browse filter. */
export const universitiesTree = asyncHandler(async (req, res) => {
  const data = await catalogService.universitiesTree();
  res.json({ data });
});

/** Validate the body against the per-entity schema (throws ZodError → 400). */
function parseBody(schemas, entity, body) {
  const schema = schemas[entity];
  if (!schema) throw ApiError.notFound(`Unknown catalog type: ${entity}`);
  return schema.parse(body);
}

export default { list, getById, create, update, remove, universitiesTree };
