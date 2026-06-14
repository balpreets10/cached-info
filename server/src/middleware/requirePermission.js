import ApiError from '../utils/ApiError.js';

/**
 * Authorize the request by capability. Must run AFTER requireAuth. Pass one or
 * more permission names; the user needs ALL of them. Checks the permission
 * claims embedded in the (short-lived) access token, so no DB hit per request.
 *
 * @example
 *   router.post('/:id/approve',
 *     requireAuth,
 *     requirePermission(PERMISSIONS.RESOURCE_APPROVE),
 *     controller.approve);
 */
export default function requirePermission(...required) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    const held = new Set(req.user.permissions || []);
    const missing = required.filter((p) => !held.has(p));
    if (missing.length > 0) {
      return next(
        ApiError.forbidden('Insufficient permissions', {
          details: { required, missing },
        }),
      );
    }
    next();
  };
}
