# Implementation Guide

> **Note:** An earlier version of this file described a MongoDB/Mongoose backend with
> a separate JWT setup. **That never matched the real project.** The backend is
> **Express + PostgreSQL (raw `pg`, no ORM)**. This guide reflects what is actually
> built. The authoritative, file-level plan lives at
> `C:\Users\Balpreet\.claude\plans\i-want-to-prepare-vivid-lovelace.md`.

## Overview

Cached Info is being refactored so the **Express API owns authentication and all data**.
The React client (currently still on Supabase) will talk only to the Express API. Work
proceeds in phases on the `refactor/express-owned-auth-api` branch.

- **Backend (Phases 0–3): complete and verified** — covered below.
- **Frontend (Phases 4–6): pending** — see "Frontend integration (pending)".
- **Deployment (Phase 7): pending.**

## Architecture

```
React SPA (client/)  ──HTTPS──>  Express API (server/)  ──>  PostgreSQL 18
   (CRA, MUI, React Query*)         (auth + all data)        (raw pg, no ORM)
   * React Query + Express data layer land in the frontend cutover
```

- **Auth**: backend-driven Google OAuth via Passport. The API issues a short-lived JWT
  **access token** (Bearer; carries role + permission claims) and an opaque **refresh
  token** (httpOnly cookie, SHA-256-hashed in DB, rotated on each use).
- **RBAC**: dedicated `roles` + `permissions` tables. Endpoints are gated on capability
  strings (e.g. `resource:approve`, `catalog:manage`), single-sourced in
  `server/src/auth/rbac.constants.js`. Two seeded roles: `student`, `management`.
- **Layering**: `route → middleware (auth/permission/validate) → controller → service →
  repository → db`. Repositories are the only place that run SQL.

## Backend — what exists

### Auth endpoints
```
GET  /api/auth/google           Start Google OAuth (redirects to Google)
GET  /api/auth/google/callback  Issues tokens, sets refresh cookie, redirects to SPA
POST /api/auth/refresh          Rotate refresh cookie -> new access token
POST /api/auth/logout           Revoke refresh token, clear cookie
GET  /api/auth/me               Current user + roles + permissions (Bearer required)
```
New sign-ins are created as `student`. The OAuth callback redirects the browser to
`<CLIENT_URL>/auth/callback#access_token=<jwt>` — the SPA reads the token from the
fragment and keeps it in memory.

### Data endpoints (high level)
```
Public read:   GET /api/catalog/:entity, /api/catalog/universities/tree
               GET /api/resources (filter+paginate), /api/resources/:id
               GET /api/search?q=
Student:       POST /api/resources (pending), POST /api/requests
               GET/POST/DELETE /api/me/saved-resources, GET /api/me/submissions
Management:    POST/PATCH/DELETE /api/admin/catalog/:entity
               PATCH /api/resources/:id/approval, GET /api/admin/resources/pending
               GET /api/admin/users, PUT /api/admin/users/:id/roles
               GET/PATCH /api/admin/requests
```
Responses use `{ data }` (or `{ data, meta }` for paginated lists). Errors use
`{ error: { code, message, details? } }`. Full live reference at `/api/docs`.

### Database
PostgreSQL 18, raw `pg`. `node-pg-migrate` migrations in `server/src/db/migrations/`
create: the catalog (universities→domains→subjects, skill_categories→skills,
exam_categories→exams), `resources` (attached to exactly one of subject/skill/exam, with
`is_approved`), users + RBAC tables, user activity (saves/requests), and `refresh_tokens`.
A `pg_trgm` GIN index powers the universal search bar.

See `server/README.md` for setup, run, migrate, seed, and test commands.

## Frontend integration (pending)

The client still uses Supabase. The cutover (Phases 4–6) will:

1. **Foundation** — restructure `client/src` into feature folders; add an axios client
   (attaches the access token; on 401 calls `/api/auth/refresh` once then retries) and a
   React Query `QueryClientProvider`; add per-feature service modules.
2. **Auth** — replace the Supabase `AuthContext` with a thin one backed by the Express
   API: "Sign in with Google" → redirect to `GET /api/auth/google`; finish at a new
   `/auth/callback` route; hydrate the user via `GET /api/auth/me`. Replace the
   `userProfile.role === 'admin'` check with a permission check (e.g. `catalog:manage`)
   for the admin dashboard route.
3. **Data + Supabase removal** — swap all `DataContext` Supabase queries for React Query
   hooks over the service modules (`useResources`, `useSearch`, `useCatalog`,
   `useSavedResources`, admin mutations). Then delete `client/src/supabaseClient.js` and
   remove `@supabase/supabase-js`.

### Data migration (one-off, during cutover)
`server/scripts/migrate-from-supabase.js` copies catalog rows, resources, and user
profiles from Supabase into self-hosted Postgres (UUID-preserving, transactional,
`--dry-run` supported). **Take a PG dump first** — this is the one hard-to-reverse step.
It needs `@supabase/supabase-js` installed in `server/` temporarily
(`npm i --no-save @supabase/supabase-js`) plus `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`.

## Prerequisites for full local testing

- A reachable Postgres in `DATABASE_URL` (local PG, or SSH tunnel to the droplet).
- Run `npm run migrate:dev && npm run seed:dev` in `server/`.
- For end-to-end login: real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in
  `server/.env.development`, with `http://localhost:5000/api/auth/google/callback`
  registered as an authorized redirect URI in Google Cloud Console. **Not configured
  locally yet** — until then, login can't be smoke-tested end to end.
