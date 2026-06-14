import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * DB-backed auth service tests. Skipped unless TEST_DATABASE_URL is set so CI
 * without a database stays green. Locally:
 *   TEST_DATABASE_URL=postgres://.../gamingdronzz_cachedinfo npm test
 *
 * The suite creates a throwaway user (and cleans it up), then exercises the
 * real find-or-create, token issue, refresh rotation, and getCurrentUser paths.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const d = TEST_DB ? describe : describe.skip;

d('auth.service (DB)', () => {
  let authService;
  let pool;
  const googleId = `test-${Date.now()}`;
  const email = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    ({ default: pool } = await import('../db.js'));
    authService = (await import('./auth.service.js')).default;
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DELETE FROM users WHERE google_id = $1', [googleId]);
      await pool.end();
    }
  });

  it('creates a new user as a student and issues a working token pair', async () => {
    const user = await authService.findOrCreateFromGoogle({
      googleId,
      email,
      fullName: 'Test User',
    });
    expect(user.email).toBe(email);

    const pair = await authService.issueTokenPair(user);
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toHaveLength(96);
    expect(pair.roles).toContain('student');
    expect(pair.permissions).toContain('resource:save');
  });

  it('is idempotent: a second login returns the same user', async () => {
    const a = await authService.findOrCreateFromGoogle({ googleId, email });
    const b = await authService.findOrCreateFromGoogle({ googleId, email });
    expect(a.id).toBe(b.id);
  });

  it('rotates a refresh token and rejects the old one', async () => {
    const user = await authService.findOrCreateFromGoogle({ googleId, email });
    const { refreshToken } = await authService.issueTokenPair(user);

    const rotated = await authService.rotateRefreshToken(refreshToken);
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).not.toBe(refreshToken);

    // Old token is now revoked.
    await expect(authService.rotateRefreshToken(refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('getCurrentUser returns roles and permissions', async () => {
    const user = await authService.findOrCreateFromGoogle({ googleId, email });
    const payload = await authService.getCurrentUser(user.id);
    expect(payload.user.email).toBe(email);
    expect(payload.roles).toContain('student');
    expect(payload.permissions.length).toBeGreaterThan(0);
  });
});
