import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

/**
 * Single axios instance the whole app talks through. The Express API is the only
 * backend (Supabase is gone). Two interceptors implement the JWT session:
 *
 *   request  → attach the in-memory access token as a Bearer header.
 *   response → on a 401, transparently hit POST /api/auth/refresh once (the
 *              httpOnly refresh cookie rides along automatically because of
 *              withCredentials), store the new access token, and retry the
 *              original request. A second failure means the session is dead.
 */

// REACT_APP_API_URL already includes the /api suffix (see client/.env.*).
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL,
  // Required so the browser sends/receives the httpOnly refresh cookie.
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 401 → refresh → retry, with single-flight de-duplication ----------------

// A handler the app installs (AuthContext) to run when refresh ultimately fails
// — e.g. clear user state and bounce to the sign-in page.
let onAuthFailure = null;
export function setAuthFailureHandler(fn) {
  onAuthFailure = fn;
}

// Endpoints that must NOT trigger the refresh dance (avoids infinite loops).
const AUTH_BYPASS = ['/auth/refresh', '/auth/logout', '/auth/google'];

// While a refresh is in flight, concurrent 401s await the same promise instead
// of each firing their own /auth/refresh.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh')
      .then((res) => {
        const token = res.data?.data?.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    const isAuthCall = AUTH_BYPASS.some((path) => url.includes(path));

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        if (token) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      } catch (refreshErr) {
        // Refresh failed — session is unrecoverable.
        clearAccessToken();
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
