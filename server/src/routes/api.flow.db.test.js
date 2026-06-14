import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

/**
 * End-to-end API flow against a live Postgres. Skipped unless TEST_DATABASE_URL
 * is set. Exercises the catalog -> submit -> list -> approve -> search -> save
 * -> request -> admin-queue -> role-assignment lifecycle with real RBAC gating.
 *
 * Tokens are minted directly (the JWT carries permission claims), so the flow
 * doesn't need a live Google OAuth round-trip.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const d = TEST_DB ? describe : describe.skip;

d('API flow (DB)', () => {
  let app;
  let pool;
  let signAccessToken;
  let PERMISSIONS;
  let ROLE_PERMISSIONS;
  let managementToken;
  let studentToken;
  let mgmtUserId;
  let studentUserId;

  const created = { universityId: null, domainId: null, subjectId: null, resourceId: null };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const appModule = await import('../app.js');
    app = appModule.createApp();
    ({ default: pool } = await import('../db.js'));
    ({ signAccessToken } = await import('../auth/jwt.js'));
    ({ PERMISSIONS, ROLE_PERMISSIONS } = await import('../auth/rbac.constants.js'));

    // Create two throwaway users directly.
    const mk = async (suffix) => {
      const { rows } = await pool.query(
        `INSERT INTO users (google_id, email, full_name)
         VALUES ($1, $2, $3) RETURNING id`,
        [`flow-${suffix}-${Date.now()}`, `flow-${suffix}-${Date.now()}@example.com`, suffix],
      );
      return rows[0].id;
    };
    mgmtUserId = await mk('mgmt');
    studentUserId = await mk('student');

    managementToken = signAccessToken(
      { id: mgmtUserId, email: 'm@x.com' },
      { roles: ['management'], permissions: ROLE_PERMISSIONS.management },
    );
    studentToken = signAccessToken(
      { id: studentUserId, email: 's@x.com' },
      { roles: ['student'], permissions: ROLE_PERMISSIONS.student },
    );
  });

  afterAll(async () => {
    if (!pool) return;
    if (created.resourceId)
      await pool.query('DELETE FROM resources WHERE id = $1', [created.resourceId]);
    if (created.universityId)
      await pool.query('DELETE FROM universities WHERE id = $1', [created.universityId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[mgmtUserId, studentUserId]]);
    await pool.end();
  });

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  it('management creates catalog: university -> domain -> subject', async () => {
    const uni = await request(app)
      .post('/api/admin/catalog/universities')
      .set(auth(managementToken))
      .send({ name: `Flow University ${Date.now()}` });
    expect(uni.status).toBe(201);
    created.universityId = uni.body.data.id;

    const dom = await request(app)
      .post('/api/admin/catalog/domains')
      .set(auth(managementToken))
      .send({ name: 'Flow Engineering', university_id: created.universityId });
    expect(dom.status).toBe(201);
    created.domainId = dom.body.data.id;

    const subj = await request(app)
      .post('/api/admin/catalog/subjects')
      .set(auth(managementToken))
      .send({ name: 'Flow CS101', domain_id: created.domainId });
    expect(subj.status).toBe(201);
    created.subjectId = subj.body.data.id;
  });

  it('student CANNOT create catalog (403)', async () => {
    const res = await request(app)
      .post('/api/admin/catalog/universities')
      .set(auth(studentToken))
      .send({ name: 'Nope University' });
    expect(res.status).toBe(403);
  });

  it('student submits a resource (pending) and it is NOT in the public list', async () => {
    const submit = await request(app)
      .post('/api/resources')
      .set(auth(studentToken))
      .send({
        title: 'Flow Resource',
        url: 'https://example.com/flow',
        description: 'flow test resource',
        subjectId: created.subjectId,
      });
    expect(submit.status).toBe(201);
    expect(submit.body.data.isApproved).toBe(false);
    created.resourceId = submit.body.data.id;

    const list = await request(app).get(
      `/api/resources?subjectId=${created.subjectId}`,
    );
    expect(list.status).toBe(200);
    const ids = list.body.data.map((r) => r.id);
    expect(ids).not.toContain(created.resourceId);
  });

  it('submitting with two parents is rejected (400)', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set(auth(studentToken))
      .send({
        title: 'Bad',
        url: 'https://example.com/bad',
        subjectId: created.subjectId,
        skillId: created.subjectId, // any uuid; service rejects "two parents"
      });
    expect(res.status).toBe(400);
  });

  it('management approves the resource; it then appears publicly and in search', async () => {
    const approve = await request(app)
      .patch(`/api/resources/${created.resourceId}/approval`)
      .set(auth(managementToken))
      .send({ isApproved: true });
    expect(approve.status).toBe(200);
    expect(approve.body.data.isApproved).toBe(true);

    const list = await request(app).get(`/api/resources?subjectId=${created.subjectId}`);
    expect(list.body.data.map((r) => r.id)).toContain(created.resourceId);

    const search = await request(app).get('/api/search?q=Flow Resource');
    expect(search.status).toBe(200);
    expect(search.body.data.map((r) => r.id)).toContain(created.resourceId);
  });

  it('student saves and unsaves the resource', async () => {
    const save = await request(app)
      .post(`/api/me/saved-resources/${created.resourceId}`)
      .set(auth(studentToken));
    expect(save.status).toBe(201);

    const saved = await request(app).get('/api/me/saved-resources').set(auth(studentToken));
    expect(saved.body.data.map((r) => r.id)).toContain(created.resourceId);

    const del = await request(app)
      .delete(`/api/me/saved-resources/${created.resourceId}`)
      .set(auth(studentToken));
    expect(del.status).toBe(204);
  });

  it('student creates a resource request; management can list it', async () => {
    const req = await request(app)
      .post('/api/requests')
      .set(auth(studentToken))
      .send({ title: 'Please add X', description: 'need it' });
    expect(req.status).toBe(201);

    const list = await request(app).get('/api/admin/requests').set(auth(managementToken));
    expect(list.status).toBe(200);
    expect(list.body.data.some((r) => r.title === 'Please add X')).toBe(true);
  });

  it('unauthenticated request to a protected route is 401', async () => {
    const res = await request(app).get('/api/me/saved-resources');
    expect(res.status).toBe(401);
  });

  it('management can list users and assign roles', async () => {
    const users = await request(app).get('/api/admin/users').set(auth(managementToken));
    expect(users.status).toBe(200);

    const assign = await request(app)
      .put(`/api/admin/users/${studentUserId}/roles`)
      .set(auth(managementToken))
      .send({ roles: ['student', 'management'] });
    expect(assign.status).toBe(200);
    expect(assign.body.data.roles).toEqual(expect.arrayContaining(['student', 'management']));
  });

  // keep the import-only references meaningful to linters
  it('exposes PERMISSIONS vocabulary', () => {
    expect(PERMISSIONS.RESOURCE_APPROVE).toBe('resource:approve');
  });
});
