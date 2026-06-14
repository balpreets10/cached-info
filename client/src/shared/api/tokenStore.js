/**
 * In-memory access-token store.
 *
 * The access token is deliberately NOT persisted to localStorage/sessionStorage
 * — it's short-lived and re-obtainable from the httpOnly refresh cookie via
 * POST /api/auth/refresh. Keeping it in a module variable (not React state)
 * lets the axios interceptors read/write it synchronously without prop drilling.
 */
let accessToken = null;

/** Subscribers notified whenever the token changes (e.g. AuthContext). */
const listeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  listeners.forEach((fn) => fn(accessToken));
}

export function clearAccessToken() {
  setAccessToken(null);
}

/** Subscribe to token changes. Returns an unsubscribe function. */
export function onAccessTokenChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
