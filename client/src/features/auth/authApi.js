import apiClient from '../../shared/api/client';
import { unwrap } from '../../shared/api/unwrap';

/**
 * Auth service module. Google OAuth is backend-driven: the browser is sent to
 * GET /api/auth/google (a full-page redirect, not XHR), Express handles the
 * handshake and bounces back to /auth/callback#access_token=… (see AuthContext).
 */

/** Absolute URL to start the Google OAuth flow (full-page navigation). */
export function googleAuthUrl() {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  return `${base}/auth/google`;
}

/** Current user + roles + permissions. Throws 401 if not authenticated. */
export async function fetchMe() {
  const res = await apiClient.get('/auth/me');
  return unwrap(res); // { user, roles, permissions }
}

/** Exchange the refresh cookie for a fresh access token. */
export async function refresh() {
  const res = await apiClient.post('/auth/refresh');
  return res.data?.data?.accessToken;
}

/** Revoke the refresh token and clear the cookie. */
export async function logout() {
  await apiClient.post('/auth/logout');
}

const authApi = { googleAuthUrl, fetchMe, refresh, logout };
export default authApi;
