import apiClient from '../../shared/api/client';
import { unwrap, unwrapList } from '../../shared/api/unwrap';

/**
 * Resource endpoints. Public reads (list/get/search) need no auth; submit and
 * saved-resource mutations require a logged-in student (the access token is
 * attached automatically by the axios interceptor).
 *
 * The API already returns the nested frontend shape (type + subject/domain/
 * university OR skill OR exam), so no client-side transform is needed.
 */

/** GET /api/resources — approved resources, filterable + paginated. */
export async function listResources(params = {}) {
  const res = await apiClient.get('/resources', { params });
  return unwrapList(res); // { data, meta }
}

/** GET /api/resources/:id */
export async function getResource(id) {
  const res = await apiClient.get(`/resources/${id}`);
  return unwrap(res);
}

/** GET /api/search?q= — trigram search powering the homepage search bar. */
export async function searchResources(q, limit) {
  const res = await apiClient.get('/search', { params: { q, limit } });
  return unwrap(res); // array
}

/** POST /api/resources — student submission (created pending). */
export async function submitResource(body) {
  const res = await apiClient.post('/resources', body);
  return unwrap(res);
}

// --- Saved resources (student) ----------------------------------------------

export async function listSavedResources() {
  const res = await apiClient.get('/me/saved-resources');
  return unwrap(res);
}

export async function saveResource(resourceId) {
  const res = await apiClient.post(`/me/saved-resources/${resourceId}`);
  return unwrap(res);
}

export async function unsaveResource(resourceId) {
  await apiClient.delete(`/me/saved-resources/${resourceId}`);
}

/** GET /api/me/submissions — resources the current user submitted. */
export async function listMySubmissions() {
  const res = await apiClient.get('/me/submissions');
  return unwrap(res);
}

const resourcesApi = {
  listResources,
  getResource,
  searchResources,
  submitResource,
  listSavedResources,
  saveResource,
  unsaveResource,
  listMySubmissions,
};
export default resourcesApi;
