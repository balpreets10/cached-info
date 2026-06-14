import authService from '../services/auth.service.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../auth/cookies.js';
import config from '../config.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Controllers for the auth routes. They own the HTTP concerns (cookies,
 * redirects, status codes); all logic lives in authService.
 */

/**
 * OAuth callback handler. Passport has already attached the user to req.user.
 * We issue our token pair, drop the refresh cookie, and bounce the browser back
 * to the SPA with the access token in the URL fragment (kept out of server
 * logs / Referer headers).
 */
export const googleCallback = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.issueTokenPair(req.user);
  setRefreshCookie(res, refreshToken);
  res.redirect(`${config.clientUrl}/auth/callback#access_token=${accessToken}`);
});

/** Exchange a valid refresh cookie for a new access token (and rotate refresh). */
export const refresh = asyncHandler(async (req, res) => {
  const raw = getRefreshCookie(req);
  const { accessToken, refreshToken } = await authService.rotateRefreshToken(raw);
  setRefreshCookie(res, refreshToken);
  res.json({ data: { accessToken } });
});

/** Revoke the current refresh token and clear the cookie. */
export const logout = asyncHandler(async (req, res) => {
  const raw = getRefreshCookie(req);
  await authService.logout(raw);
  clearRefreshCookie(res);
  res.json({ data: { ok: true } });
});

/** Return the authenticated user with roles + permissions. */
export const me = asyncHandler(async (req, res) => {
  const payload = await authService.getCurrentUser(req.user.id);
  res.json({ data: payload });
});

export default { googleCallback, refresh, logout, me };
