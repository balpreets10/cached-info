import apiClient from '../../shared/api/client';
import { unwrap, unwrapList } from '../../shared/api/unwrap';

/**
 * Management-only endpoints. All require the relevant capability — the server
 * enforces it; the client gates the UI on permissions from /api/auth/me.
 *
 * Note the route layout:
 *   - resource CRUD + approval live under /api/resources (management perms)
 *   - the pending queue is GET /api/admin/resources/pending
 *   - catalog writes live under /api/admin/catalog/:entity
 *   - users + request triage live under /api/admin/*
 */

// --- Resource approval queue -------------------------------------------------

export async function listPendingResources(params = {}) {
  const res = await apiClient.get('/admin/resources/pending', { params });
  return unwrapList(res); // { data, meta }
}

/** Approve or reject a submission. isApproved=false rejects (kept, not deleted). */
export async function setResourceApproval(id, isApproved) {
  const res = await apiClient.patch(`/resources/${id}/approval`, { isApproved });
  return unwrap(res);
}

// --- Resource CRUD (management) ---------------------------------------------

export async function adminCreateResource(body) {
  const res = await apiClient.post('/resources/admin', body);
  return unwrap(res);
}

export async function adminUpdateResource(id, body) {
  const res = await apiClient.patch(`/resources/${id}`, body);
  return unwrap(res);
}

export async function adminDeleteResource(id) {
  await apiClient.delete(`/resources/${id}`);
}

// --- Catalog writes ---------------------------------------------------------

export async function createCatalogItem(entity, body) {
  const res = await apiClient.post(`/admin/catalog/${entity}`, body);
  return unwrap(res);
}

export async function updateCatalogItem(entity, id, body) {
  const res = await apiClient.patch(`/admin/catalog/${entity}/${id}`, body);
  return unwrap(res);
}

export async function deleteCatalogItem(entity, id) {
  await apiClient.delete(`/admin/catalog/${entity}/${id}`);
}

// --- Users + roles ----------------------------------------------------------

export async function listUsers() {
  const res = await apiClient.get('/admin/users');
  return unwrap(res);
}

export async function setUserRoles(userId, roles) {
  const res = await apiClient.put(`/admin/users/${userId}/roles`, { roles });
  return unwrap(res);
}

// --- Resource requests triage -----------------------------------------------

export async function listAllRequests(status) {
  const params = status ? { status } : undefined;
  const res = await apiClient.get('/admin/requests', { params });
  return unwrap(res);
}

export async function updateRequestStatus(id, status) {
  const res = await apiClient.patch(`/admin/requests/${id}`, { status });
  return unwrap(res);
}

const adminApi = {
  listPendingResources,
  setResourceApproval,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  listUsers,
  setUserRoles,
  listAllRequests,
  updateRequestStatus,
};
export default adminApi;
