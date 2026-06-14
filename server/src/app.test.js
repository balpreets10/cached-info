import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

// Smoke tests for the Phase 0 foundation: the app boots, security middleware is
// wired, the health route works, and unknown routes get the consistent 404
// envelope from the central error handler.
describe('app foundation', () => {
  const app = createApp();

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('unknown route returns the 404 error envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(typeof res.body.error.message).toBe('string');
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/health');
    // helmet sets this by default; presence proves the middleware ran.
    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
  });
});
