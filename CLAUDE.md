# CLAUDE.md

Guidance for working in this repository.

## What this is

**Cached Info** (`cachedinfo.gamingdronzz.com`) — a resource-sharing platform. Users
search/browse learning resources across three taxonomies (university exams, skills,
competitive exams), save them, and submit/request new ones. Two user types:

- **student** — browse, search, save, submit (pending), request resources.
- **management** — everything a student can, plus approve submissions and manage all
  catalog data (universities/domains/subjects, skills, exams) and user roles.

## Layout

Two independent apps (NOT a monorepo — no workspaces tooling):

- `client/` — React 18 SPA, **Create React App** (`react-scripts`), plain JS/JSX (no TS),
  MUI 5, `react-router-dom` 6. Deployed as a static build to a DigitalOcean droplet.
- `server/` — Express 4 API, **ES modules**, `pg` (node-postgres, raw SQL — no ORM),
  PostgreSQL 18. Owns auth and all data.

## Architecture (post-refactor target)

The project is mid-refactor (branch `refactor/express-owned-auth-api`). The decided target:

- **Express API owns everything.** The client talks ONLY to the Express API. Google
  OAuth (backend-driven via Passport) + JWT live in Express; all data is served by
  Express. **Supabase is being removed** — do not add new Supabase usage.
- **RBAC** via dedicated `roles` + `permissions` tables (NOT a role string column).
  Capability strings like `resource:approve` are single-sourced in
  `server/src/auth/rbac.constants.js`. Gate routes on capabilities, not role names.
- **JWT**: short-lived access token (Bearer, carries role+permission claims) + opaque
  refresh token (httpOnly cookie, SHA-256-hashed in DB, rotated on use).

### Backend layering — keep this discipline

```
route → [requireAuth → requirePermission → validate(zod)] → controller → service → repository → db
                                                  ↓ throw
                                  errorHandler → { error: { code, message, details? } }
```

- **repositories/** are the ONLY place that runs SQL. They accept an optional `db`
  executor (last arg) so callers can pass a transaction client.
- **services/** hold business logic; no `req`/`res`. **controllers/** do HTTP only
  (parse req, shape `{ data }` / `{ data, meta }`, status codes) — no SQL, no logic.
- Throw `ApiError` (`server/src/utils/ApiError.js`); wrap async handlers in
  `asyncHandler`. Never `try/catch` just to `res.status(500)`.
- Validate every write with a zod schema via the `validate({ body, query, params })`
  middleware.

## Conventions

- Server is **ESM** (`"type": "module"`) — use `import`/`export`, not `require`.
- Routes mount under `/api`; each feature has its own `*.routes.js` aggregated in
  `server/src/routes/index.js`. Document every route with an `@openapi` JSDoc block
  (surfaces at `/api/docs`). Avoid literal `{ ... }` in swagger description strings —
  it's parsed as YAML flow-maps and warns.
- The app is built by a factory: `createApp()` in `server/src/app.js` (testable with
  supertest); `server/src/index.js` only calls `listen()`.
- DB-backed tests are guarded on `TEST_DATABASE_URL` so CI without a DB stays green.

## Common commands (run inside `server/`)

```
npm test                 # vitest (unit + integration; DB tests skip w/o TEST_DATABASE_URL)
npm run lint             # eslint (flat config)
npm run migrate:dev      # apply migrations to .env.development DB
npm run seed:dev         # seed roles/permissions/grants (idempotent)
npm run start:dev        # run API against .env.development
```

To run DB-backed tests locally, set `TEST_DATABASE_URL` to your dev Postgres URL.

## Database

- PostgreSQL 18, loopback-only on the droplet. Local dev uses a local PG on
  `127.0.0.1:5432/gamingdronzz_cachedinfo`; remote dev uses an SSH tunnel
  (`5433 → droplet 5432`). See `gamingdronzz_cachedinfo.md` (gitignored — has live
  passwords) and `server/.env.example`.
- Migrations: `node-pg-migrate` in `server/src/db/migrations/`. Schema mirrors the old
  Supabase model + adds users/RBAC/refresh_tokens. Resources attach to exactly one of
  subject/skill/exam (enforced by a CHECK). `pg_trgm` GIN indexes power the search bar.

## Refactor status (as of this writing)

Backend Phases 0–3 are **done, committed, and verified** (28 passing tests incl. an
11-step end-to-end flow vs live Postgres): tooling/error-handling, schema+migrations+seed,
auth (Passport Google + JWT + RBAC), and the full catalog/resources/search/me/admin API.

**Still pending — frontend (Phases 4–6), to be done in a later session:**
- Restructure `client/src` into feature folders; add an axios client (token attach +
  401-refresh interceptor) and a React Query provider + service modules.
- Replace the Supabase `AuthContext` with a thin Express-OAuth one; redirect to
  `GET /api/auth/google`, hydrate via `GET /api/auth/me`; gate admin routes on a
  permission (e.g. `catalog:manage`) instead of `userProfile.role === 'admin'`.
- Swap all `DataContext` Supabase queries for React Query hooks over the API, then
  delete `client/src/supabaseClient.js` and remove `@supabase/supabase-js`.
- Run the one-off `server/scripts/migrate-from-supabase.js` during cutover (take a PG
  dump first).

**Phase 7 (server CI/CD) — implemented in the workflow, not yet rolled out:**
`.github/workflows/deploy.yml` now has `deploy-server-{staging,production}` jobs that
rsync `server/`, write a root-owned `/etc/cinfo/api-<env>.env` from GitHub Environment
secrets/vars, run `npm run migrate`, and (re)start the API under **PM2**
(`deploy/ecosystem.config.cjs`; prod :5000, staging :5001), then smoke-check
`/api/health`. Secrets are configured in GitHub, never hand-placed on the droplet.
Still to do before it works live: apply the per-env GitHub secrets/vars, do the
one-time droplet prep (PM2 + nginx `/api/*` proxy + scoped sudo) per `deploy/README.md`,
and verify a real staging→prod deploy.

The full plan with file-level detail lives at
`C:\Users\Balpreet\.claude\plans\i-want-to-prepare-vivid-lovelace.md`; the server-deploy
plan is at `Plans/github-secrets-server-deploy.md`.

## Notable gotchas

- `IMPLEMENTATION_GUIDE.md` previously described a MongoDB/Mongoose backend that never
  existed — the real backend is Postgres + raw `pg`. It has been corrected; don't trust
  older copies.
- Google OAuth creds are NOT configured locally yet — full login can't be smoke-tested
  until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are added to `server/.env.development`.
- `@supabase/supabase-js` is still a `client/` dependency until the Phase 6 cutover; the
  one-off migration script needs it installed in `server/` temporarily (`npm i --no-save`).
