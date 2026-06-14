import apiClient from '../../shared/api/client';
import { unwrap } from '../../shared/api/unwrap';

/**
 * Catalog reads (public). Entity names match the API URL segments:
 * 'universities' | 'domains' | 'subjects' | 'skill-categories' | 'skills' |
 * 'exam-categories' | 'exams'.
 */

/** GET /api/catalog/universities/tree — universities with nested domains. */
export async function fetchUniversitiesTree() {
  const res = await apiClient.get('/catalog/universities/tree');
  return unwrap(res);
}

/** GET /api/catalog/:entity — optionally filter children by parentId. */
export async function listCatalog(entity, parentId) {
  const params = parentId ? { parentId } : undefined;
  const res = await apiClient.get(`/catalog/${entity}`, { params });
  return unwrap(res);
}

/** GET /api/catalog/:entity/:id */
export async function getCatalogItem(entity, id) {
  const res = await apiClient.get(`/catalog/${entity}/${id}`);
  return unwrap(res);
}

const catalogApi = { fetchUniversitiesTree, listCatalog, getCatalogItem };
export default catalogApi;
