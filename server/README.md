# Cached Info — Backend API

Express + PostgreSQL API for `cachedinfo.gamingdronzz.com`. Owns authentication
(Google OAuth → JWT) and all application data. ES modules, raw `pg` (no ORM).

## Stack

- **Express 4**, ES modules
- **PostgreSQL 18** via `pg` (node-postgres) — raw parameterized SQL, no ORM
- **Auth**: Passport (`passport-google-oauth20`) + `jsonwebtoken`; access token (Bearer)
  + httpOnly refresh cookie with rotation
- **Validation**: `zod`
- **Migrations**: `node-pg-migrate`
- **Docs**: `swagger-jsdoc` + `swagger-ui-express` at `/api/docs`
- **Security**: `helmet`, `cors` (credentialed), `compression`, `express-rate-limit`
- **Tests**: `vitest` + `supertest`

## Project structure

```
src/
  app.js              # createApp() — builds the Express app (testable)
  index.js            # entrypoint — calls listen()
  config.js           # env-driven config (loads .env.<NODE_ENV>)
  db.js               # pg pool + query() helper
  swagger.js          # OpenAPI spec from @openapi JSDoc blocks
  auth/               # passport strategy, jwt util, cookies, rbac.constants
  middleware/         # requireAuth, requirePermission, validate, errorHandler, …
  routes/             # one *.routes.js per feature, aggregated in index.js
  controllers/        # HTTP only (parse req, shape res)
  services/           # business logic (no req/res)
  repositories/       # the ONLY place that runs SQL
  validators/         # zod schemas
  db/
    migrations/       # node-pg-migrate files
    seed.js           # idempotent roles/permissions/grants seed
scripts/
  migrate-from-supabase.js   # one-off Supabase -> Postgres data migration
```

## Setup

1. Copy the env template and fill it in:
   ```
   cp .env.example .env.development
   ```
   At minimum set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and (for login)
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`.

   Generate a JWT secret:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

2. Install and prepare the database:
   ```
   npm install
   npm run migrate:dev    # create the schema
   npm run seed:dev       # roles, permissions, grants (idempotent)
   ```

## Run

```
npm run start:dev        # NODE_ENV=development
npm run server           # nodemon (auto-reload)
```

- API:  http://localhost:5000/api
- Docs: http://localhost:5000/api/docs
- Health: `GET /api/health`, DB check: `GET /api/db-ping`

## Database & migrations

`DATABASE_URL` is loopback-only on the droplet. Local dev points at a local Postgres
(`127.0.0.1:5432`); remote dev uses an SSH tunnel (`5433 → droplet 5432`).

```
npm run migrate:dev          # up, against .env.development
npm run migrate:down         # roll back the last migration
npm run migrate:create -- <name>   # scaffold a new migration
npm run migrate              # CI/prod: reads DATABASE_URL from the process env
```

## Tests

```
npm test                     # unit + integration (DB tests skip without a DB)
```

DB-backed tests run only when `TEST_DATABASE_URL` is set:

```
# bash
TEST_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/gamingdronzz_cachedinfo npm test
```

```
# PowerShell
$env:TEST_DATABASE_URL = 'postgres://user:pass@127.0.0.1:5432/gamingdronzz_cachedinfo'; npm test
```

## API surface (high level)

| Area      | Examples                                                            | Access |
|-----------|---------------------------------------------------------------------|--------|
| Auth      | `GET /auth/google`, `/google/callback`; `POST /auth/refresh`, `/logout`; `GET /auth/me` | public / cookie |
| Catalog   | `GET /catalog/:entity`, `/catalog/universities/tree`                | public read |
| Resources | `GET /resources` (filter/paginate), `GET /resources/:id`, `GET /search?q=` | public read |
| Student   | `POST /resources` (pending), `POST /requests`, `GET/POST/DELETE /me/saved-resources`, `GET /me/submissions` | auth + permission |
| Management| `POST/PATCH/DELETE /admin/catalog/:entity`, `PATCH /resources/:id/approval`, `GET /admin/resources/pending`, `GET /admin/users`, `PUT /admin/users/:id/roles`, `GET/PATCH /admin/requests` | auth + permission |

All write endpoints are zod-validated; management endpoints are gated on RBAC
permissions defined in `src/auth/rbac.constants.js`. Full, current details at `/api/docs`.

## Roles & permissions

Two seeded roles: `student` (default for new sign-ups) and `management`. Permissions are
capability strings (`resource:submit`, `resource:approve`, `catalog:manage`, `user:manage`,
…). New Google sign-ups get `student` automatically. Grant `management` either by setting
`BOOTSTRAP_ADMIN_EMAIL` before `npm run seed` (after that user has signed in once) or via
`PUT /api/admin/users/:id/roles`.
