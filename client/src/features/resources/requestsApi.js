import apiClient from '../../shared/api/client';
import { unwrap } from '../../shared/api/unwrap';

/**
 * "Request a Resource" — student-facing. Body: { title, description?, context? }.
 * Listing the current user's own requests is GET /api/me/requests.
 */

export async function createRequest(body) {
  const res = await apiClient.post('/requests', body);
  return unwrap(res);
}

export async function listMyRequests() {
  const res = await apiClient.get('/me/requests');
  return unwrap(res);
}

const requestsApi = { createRequest, listMyRequests };
export default requestsApi;
