import { describe, it, expect } from 'vitest';
import requirePermission from './requirePermission.js';
import requireAuth from './requireAuth.js';
import { signAccessToken } from '../auth/jwt.js';
import { PERMISSIONS } from '../auth/rbac.constants.js';

/** Minimal Express req/res/next doubles. */
const run = (mw, req) => {
  return new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });
};

describe('requirePermission', () => {
  it('passes when the user holds all required permissions', async () => {
    const req = { user: { permissions: [PERMISSIONS.RESOURCE_APPROVE, PERMISSIONS.CATALOG_MANAGE] } };
    const err = await run(requirePermission(PERMISSIONS.RESOURCE_APPROVE), req);
    expect(err).toBeUndefined();
  });

  it('rejects with 403 when a permission is missing', async () => {
    const req = { user: { permissions: [PERMISSIONS.RESOURCE_SAVE] } };
    const err = await run(requirePermission(PERMISSIONS.RESOURCE_APPROVE), req);
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(err.details.missing).toContain(PERMISSIONS.RESOURCE_APPROVE);
  });

  it('rejects with 401 when there is no authenticated user', async () => {
    const err = await run(requirePermission(PERMISSIONS.RESOURCE_SAVE), {});
    expect(err.statusCode).toBe(401);
  });
});

describe('requireAuth', () => {
  it('attaches req.user for a valid Bearer token', async () => {
    const token = signAccessToken(
      { id: 'u1', email: 'x@y.com' },
      { roles: ['management'], permissions: [PERMISSIONS.USER_MANAGE] },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const err = await run(requireAuth, req);
    expect(err).toBeUndefined();
    expect(req.user.id).toBe('u1');
    expect(req.user.permissions).toContain(PERMISSIONS.USER_MANAGE);
  });

  it('rejects a missing/!Bearer header with 401', async () => {
    expect((await run(requireAuth, { headers: {} })).statusCode).toBe(401);
    expect((await run(requireAuth, { headers: { authorization: 'Basic xyz' } })).statusCode).toBe(
      401,
    );
  });
});
