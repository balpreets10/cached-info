import { Router } from 'express';
import passport from '../auth/passport.js';
import authController from '../controllers/auth.controller.js';
import requireAuth from '../middleware/requireAuth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// All auth endpoints are rate limited.
router.use(authLimiter);

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     summary: Start Google OAuth (redirects to Google).
 *     tags: [Auth]
 *     responses:
 *       302: { description: Redirect to Google's consent screen. }
 */
router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback — issues tokens and redirects to the SPA.
 *     tags: [Auth]
 *     responses:
 *       302: { description: Redirect to the client with the access token in the URL fragment. }
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/failure' }),
  authController.googleCallback,
);

/**
 * @openapi
 * /api/auth/failure:
 *   get:
 *     summary: OAuth failure endpoint.
 *     tags: [Auth]
 *     responses:
 *       401: { description: Authentication failed. }
 */
router.get('/failure', (req, res) => {
  res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Google authentication failed' } });
});

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Rotate the refresh cookie and return a new access token.
 *     tags: [Auth]
 *     responses:
 *       200: { description: New access token issued. }
 *       401: { description: Missing/invalid refresh token. }
 */
router.post('/refresh', authController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Revoke the refresh token and clear the cookie.
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out. }
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Current authenticated user with roles and permissions.
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current user. }
 *       401: { description: Not authenticated. }
 */
router.get('/me', requireAuth, authController.me);

export default router;
