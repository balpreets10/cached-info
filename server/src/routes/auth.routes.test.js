import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

// Integration tests that don't need a DB: they exercise the middleware chain
// and error envelopes. DB-backed flows (token issue, refresh, me) are covered
// by the auth.service DB test when TEST_DATABASE_URL is set.
describe('auth routes (no DB)', () => {
  const app = createApp();

  it('GET /api/auth/me without a token returns 401 envelope', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me with a malformed token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/failure returns 401', async () => {
    const res = await request(app).get('/api/auth/failure');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
