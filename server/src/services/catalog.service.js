import catalogRepository from '../repositories/catalog.repository.js';
import ApiError from '../utils/ApiError.js';

/**
 * Catalog business logic. Maps the public entity name (from the route) to its
 * repository, so the controller can stay generic for the six catalog types.
 */
const ENTITIES = {
  universities: catalogRepository.universities,
  domains: catalogRepository.domains,
  subjects: catalogRepository.subjects,
  'skill-categories': catalogRepository.skillCategories,
  skills: catalogRepository.skills,
  'exam-categories': catalogRepository.examCategories,
  exams: catalogRepository.exams,
};

export function repoFor(entity) {
  const repo = ENTITIES[entity];
  if (!repo) throw ApiError.notFound(`Unknown catalog type: ${entity}`);
  return repo;
}

export const list = (entity, opts) => repoFor(entity).list(opts);

export async function getById(entity, id) {
  const row = await repoFor(entity).getById(id);
  if (!row) throw ApiError.notFound(`${entity} not found`);
  return row;
}

export const create = (entity, data) => repoFor(entity).create(data);
export const update = (entity, id, data) => repoFor(entity).update(id, data);
export const remove = (entity, id) => repoFor(entity).remove(id);

/** Universities with nested domains, for the browse filter. */
export const universitiesTree = () => catalogRepository.universitiesWithTree();

export default { repoFor, list, getById, create, update, remove, universitiesTree };
