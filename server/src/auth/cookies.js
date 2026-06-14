import config from '../config.js';

/**
 * Helpers for the httpOnly refresh-token cookie. The access token is NEVER put
 * in a cookie — it's returned in the JSON body and held in client memory.
 */

const maxAgeMs = config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000;

export const setRefreshCookie = (res, token) => {
  res.cookie(config.cookie.name, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: maxAgeMs,
    path: '/api/auth',
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(config.cookie.name, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/auth',
  });
};

export const getRefreshCookie = (req) => req.cookies?.[config.cookie.name] ?? null;

export default { setRefreshCookie, clearRefreshCookie, getRefreshCookie };
