# Refactor Plan: Cached Info — Express-Owned Auth + Layered API

> **Branch:** `refactor/express-owned-auth-api` (off `dev`)

## Progress Log

- **Phase 0 — Backend tooling: ✅ DONE & VERIFIED**
  - Installed deps: helmet, morgan, express-rate-limit, compression, cookie-parser, zod (v4), passport, passport-google-oauth20, jsonwebtoken, node-pg-migrate, bcrypt; dev: vitest, supertest, eslint (+ @eslint/js, globals).
  - Split entrypoint: [server/src/app.js](server/src/app.js) builds the app (testable), [server/src/index.js](server/src/index.js) just `listen()`s.
  - Utils: [ApiError.js](server/src/utils/ApiError.js), [asyncHandler.js](server/src/utils/asyncHandler.js).
  - Middleware: [errorHandler.js](server/src/middleware/errorHandler.js) (Zod-aware), [notFound.js](server/src/middleware/notFound.js), [validate.js](server/src/middleware/validate.js), [rateLimit.js](server/src/middleware/rateLimit.js).
  - Security wired in app.js: helmet, cors (credentials), compression, cookie-parser, morgan (env-gated). Routes aggregated under [routes/index.js](server/src/routes/index.js) → [system.routes.js](server/src/routes/system.routes.js) (health, db-ping).
  - Config extended for JWT / Google OAuth / cookie / bootstrap admin ([config.js](server/src/config.js)); `.env.example` updated.
  - Scripts added: `migrate*`, `seed`, `lint`, `test`. **`npm test` → 3/3 green; `npm run lint` → clean.**
- **Phase 0 — Frontend tooling: ✅ DONE**
  - Installed `@tanstack/react-query` (v5.101) in client. Kept CRA's `react-app` ESLint config (React best-practice default). Added shared root Prettier config ([.prettierrc.json](.prettierrc.json), [.prettierignore](.prettierignore)). Provider wiring + folder restructure deferred to Phase 4 (as planned).
- **Phase 1 — DB schema + migrations: ✅ DONE & VERIFIED (against live PostgreSQL 18.3)**
  - 4 node-pg-migrate migrations in [server/src/db/migrations/](server/src/db/migrations/): `catalog` (universities→domains→subjects, skill_categories→skills, exam_categories→exams; syllabus/roadmap JSONB), `users_rbac` (users, roles, permissions, role_permissions, user_roles), `resources` (exactly-one-parent CHECK on subject/skill/exam, is_approved, submitted_by/approved_by, pg_trgm GIN search indexes), `user_activity_and_tokens` (user_saved_resources, user_resource_requests, refresh_tokens with hash+rotation).
  - RBAC vocabulary single-sourced in [server/src/auth/rbac.constants.js](server/src/auth/rbac.constants.js) (2 roles, 8 permissions). Idempotent seed [server/src/db/seed.js](server/src/db/seed.js) + bootstrap-admin grant.
  - One-off [server/scripts/migrate-from-supabase.js](server/scripts/migrate-from-supabase.js) (UUID-preserving, paginated, transactional, `--dry-run`).
  - Scripts: `migrate` (CI/prod, reads `DATABASE_URL` from env), `migrate:dev` / `migrate:down` (`.env.development`), `seed` / `seed:dev`.
  - **Verified:** all 17 tables created, one-parent CHECK + both trigram indexes + pgcrypto/pg_trgm extensions present; seed → 2 roles / 8 perms / grants (mgmt 8, student 3); `migrate:dev` idempotent; lint clean.
- **Phase 2 — Backend auth: ✅ DONE & VERIFIED (full flow vs live PG)**
  - Repositories ([user.repository.js](server/src/repositories/user.repository.js), [refreshToken.repository.js](server/src/repositories/refreshToken.repository.js)) — sole SQL owners, accept an optional tx executor.
  - JWT util ([auth/jwt.js](server/src/auth/jwt.js)): signed access tokens (claims: sub/email/roles/permissions) + opaque SHA-256-hashed refresh tokens. Passport Google strategy ([auth/passport.js](server/src/auth/passport.js), guarded so app stays importable without creds). Cookie helpers ([auth/cookies.js](server/src/auth/cookies.js)).
  - Service ([auth.service.js](server/src/services/auth.service.js)): transactional find-or-create (new users → `student`), `issueTokenPair`, `rotateRefreshToken` (revokes old), `logout`, `getCurrentUser`.
  - Middleware: [requireAuth.js](server/src/middleware/requireAuth.js) (Bearer → req.user), [requirePermission.js](server/src/middleware/requirePermission.js) (capability check from token claims, AND semantics).
  - Routes ([auth.routes.js](server/src/routes/auth.routes.js)): `GET /api/auth/google`, `/google/callback`, `/failure`; `POST /refresh`, `/logout`; `GET /me`. Rate-limited; swagger-documented (+ bearerAuth scheme). Passport initialized in app.js; swagger now scans `routes/`.
  - Controller ([auth.controller.js](server/src/controllers/auth.controller.js)): sets/clears httpOnly refresh cookie; callback redirects to `/auth/callback#access_token=…`.
  - Tests: vitest config + setup; jwt unit, requireAuth/requirePermission unit, auth-routes integration (no-DB), and **DB-backed auth.service** (guarded on `TEST_DATABASE_URL`). **18/18 green (incl. 4 DB tests vs live PG); lint clean; app builds.**
- **Phase 3 — Catalog + resources API: ✅ DONE & VERIFIED (11-step E2E flow vs live PG)**
  - Repositories: [catalog.repository.js](server/src/repositories/catalog.repository.js) (generic CRUD factory for 7 entities + `universitiesWithTree`), [resource.repository.js](server/src/repositories/resource.repository.js) (join-resolving SELECT, filters, pagination, trigram search, approval, pending queue), [userActivity.repository.js](server/src/repositories/userActivity.repository.js) (saves + requests).
  - Services: [resource.service.js](server/src/services/resource.service.js) (serializer → nested frontend shape; exactly-one-parent guard), [catalog.service.js](server/src/services/catalog.service.js) (entity→repo map), [userActivity.service.js](server/src/services/userActivity.service.js), [adminUser.service.js](server/src/services/adminUser.service.js) (transactional role replace).
  - Validators (zod): common, resource, catalog (per-entity), request, admin.
  - Controllers: resource, catalog (generic), me, admin. Consistent `{ data }` / `{ data, meta }` envelopes.
  - Routes mounted under `/api`: `catalog` (public read), `resources` (public read + student submit + mgmt CRUD/approval), `search`, `requests` (student create), `me` (saved/submissions/requests), `admin` (catalog write, pending queue, users+roles, request triage) — all RBAC-gated. 20 swagger paths, no YAML warnings.
  - Tests: full **11-step DB-backed E2E flow** ([api.flow.db.test.js](server/src/routes/api.flow.db.test.js)) — catalog create, student-403, pending-hidden, two-parent-400, approve→public+search, save/unsave, request+triage, 401, role assignment. **28/28 green (DB); lint clean; swagger builds.**
- **Docs: ✅ DONE** — added root [CLAUDE.md](CLAUDE.md) (architecture, conventions, refactor status), [server/README.md](server/README.md) (setup/run/migrate/test/API), and rewrote the stale [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) (removed the never-real Mongo/JWT content).
- **Phase 4 — Frontend foundation: ✅ DONE (build compiles)**
  - Feature-folder restructure (via `git mv`, history preserved): `client/src/{app,features/{auth,resources,catalog,admin,about},shared/{api,components,hooks,lib}}`. Old `components/`, `pages/` removed; `context/DataContext.jsx` + `supabaseClient.js` intentionally kept alive until Phase 6.
  - Shared API layer: [tokenStore.js](client/src/shared/api/tokenStore.js) (in-memory access token + change listeners), [client.js](client/src/shared/api/client.js) (axios w/ `withCredentials`, Bearer request interceptor, **single-flight 401→/auth/refresh→retry** response interceptor + `setAuthFailureHandler`), [queryClient.js](client/src/shared/api/queryClient.js), [unwrap.js](client/src/shared/api/unwrap.js) (`{data}`/`{data,meta}` envelopes), [queryKeys.js](client/src/shared/api/queryKeys.js).
  - Service modules (mapped to live API contract): [authApi.js](client/src/features/auth/authApi.js), [resourcesApi.js](client/src/features/resources/resourcesApi.js), [requestsApi.js](client/src/features/resources/requestsApi.js), [catalogApi.js](client/src/features/catalog/catalogApi.js), [adminApi.js](client/src/features/admin/adminApi.js).
  - React Query hooks: [useResources.js](client/src/features/resources/hooks/useResources.js), [useCatalog.js](client/src/features/catalog/hooks/useCatalog.js), [useAdmin.js](client/src/features/admin/hooks/useAdmin.js). Permission constants mirrored client-side: [permissions.js](client/src/shared/lib/permissions.js).
  - App shell: [app/providers.jsx](client/src/app/providers.jsx) (Router → QueryClient → Auth) + [app/App.jsx](client/src/app/App.jsx) (clean router, no global data-loading gate); [index.jsx](client/src/index.jsx) rewired. **`react-scripts build` compiles** (warnings only, all in Phase-6 rewrite targets).
- **Phase 5 — Frontend auth cutover (Express OAuth): ✅ DONE**
  - Thin [AuthContext.jsx](client/src/features/auth/AuthContext.jsx): on mount attempts silent `POST /auth/refresh` then hydrates via `GET /auth/me`; exposes `user/roles/permissions`, `isAuthenticated`, `hasPermission`/`hasRole`, `login(token)`, `signInWithGoogle()` (full-page redirect to `/api/auth/google`), `signOut()`. Wires `setAuthFailureHandler` to wipe state. Supabase auth gone.
  - [AuthCallback.jsx](client/src/features/auth/AuthCallback.jsx) parses `#access_token` from the OAuth redirect → `login()` → home. Route `/auth/callback` added.
  - [ProtectedRoute.jsx](client/src/features/auth/ProtectedRoute.jsx) gates on `isAuthenticated`; new [RequirePermission.jsx](client/src/features/auth/RequirePermission.jsx) gates `/admin-dashboard` on `catalog:manage` (replaces `role === 'admin'`).
  - [SignIn.jsx](client/src/features/auth/components/SignIn.jsx) rewritten Google-only (email/password UI removed — backend has no such endpoint). [Header.jsx](client/src/shared/components/Header.jsx) updated to new user shape (`fullName`/`avatarUrl`), `roles` chip, `hasPermission`-based admin link. `ModernAdminDashboard` `isAdmin()` rebound to `hasPermission(catalog:manage)`.
  - **Setup guide for the user written:** [Plans/GOOGLE_OAUTH_SETUP.md](Plans/GOOGLE_OAUTH_SETUP.md) (console steps, callback `http://localhost:5000/api/auth/google/callback`, env vars, smoke test).
- **Phase 6 — Frontend data cutover + Supabase removal: ✅ DONE (build compiles clean, 0 warnings even under CI=true)**
  - Ported every page/component off the Supabase `DataContext` to React Query hooks + service modules:
    - [HomePage.jsx](client/src/features/resources/HomePage.jsx) — `useResources({limit:6})` recents, `useSearchResources` (server trigram on submit), autocomplete built from the universities tree + recents, save/unsave via `useSavedResources`. (Dropped the fabricated stats section — no stats endpoint.)
    - [Resources.jsx](client/src/features/resources/Resources.jsx) — server-side filter+pagination via `useResources({universityId,domainId,page,limit})` + meta; university/domain filters from `useUniversitiesTree`.
    - [SubmitResource.jsx](client/src/features/resources/SubmitResource.jsx) — `useSubmitResource` → `POST /api/resources`; cascading catalog selects (`useUniversitiesTree`, `useCatalog('subjects'|'skills'|'exams', parentId)`); exactly-one-parent enforced client+server.
    - [RequestResource.jsx](client/src/features/resources/RequestResource.jsx) — simplified to the API body `{title,description?,context?}` → `POST /api/requests` (old type/priority/subject fields folded into free-text context).
    - [ShareableResourceCard.jsx](client/src/features/resources/components/ShareableResourceCard.jsx) — new `id`/object shape; save delegates to parent; broken `/api/resources/share` replaced with a client-side deep link.
  - Admin dashboard ported to API hooks: [ModernAdminDashboard.jsx](client/src/features/admin/components/ModernAdminDashboard.jsx) (stats from query metas, approval via `useSetResourceApproval` — approve=isApproved true, deny=false/kept), [PendingResourcesTab](client/src/features/admin/components/PendingResourcesTab.jsx) + [DashboardOverview](client/src/features/admin/components/DashboardOverview.jsx) (serialized shape, no `user_profiles`), [UsersTab](client/src/features/admin/components/UsersTab.jsx) (`useAdminUsers`/`useSetUserRoles`, student↔management; no user-delete endpoint), and the four catalog tabs ([Universities](client/src/features/admin/components/UniversitiesTab.jsx)/[Domains](client/src/features/admin/components/DomainsTab.jsx)/[Subjects](client/src/features/admin/components/SubjectsTab.jsx)/[Resources](client/src/features/admin/components/ResourcesTab.jsx)) on `useCatalog` + catalog/resource CRUD hooks.
  - **Supabase removed:** deleted `context/DataContext.jsx`, `supabaseClient.js`, the DataContext-only `DebugPanel`/`LoadingScreen`, and the obsolete `setup-check.js`; removed `DataProvider` from `app/App.jsx`; dropped `@supabase/supabase-js`, `@react-oauth/google`, `jwt-decode` from `client/package.json` (lockfile updated). No Supabase imports or `REACT_APP_SUPABASE_*` remain.
  - **Still to do before E2E:** configure Google OAuth creds in `server/.env.development` (user doing this now — see [Plans/GOOGLE_OAUTH_SETUP.md](Plans/GOOGLE_OAUTH_SETUP.md)); run the one-off `server/scripts/migrate-from-supabase.js` during cutover (dump PG first). Then **Phase 7** (server deploy automation + final docs).

## Context

**Why this refactor.** Cached Info is a resource-sharing platform (university / skill / competitive-exam resources) with two user types — **students** (browse, search, save, submit/request resources) and **management** (approve submissions, manage universities/domains/subjects/skills/exams/resources). Today the React client talks **directly to Supabase** for *both* auth and data via the Supabase JS SDK ([client/src/context/AuthContext.jsx](client/src/context/AuthContext.jsx), [client/src/context/DataContext.jsx](client/src/context/DataContext.jsx)). Separately, a self-hosted **Express + PostgreSQL** backend has been started ([server/src/index.js](server/src/index.js)) with `REACT_APP_API_URL` already wired, but it only has health/db-ping endpoints. The stale [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) even references MongoDB/JWT that don't match reality.

**Target outcome (decided with user):**
- **Express API owns everything.** Drop Supabase entirely. Express handles Google OAuth (backend-driven via Passport) + issues its own JWTs, and serves *all* data.
- **Proper RBAC** via dedicated `roles` + `permissions` tables (not just a `role` column).
- **Stay in JavaScript** (JSX client, ESM server) — no TypeScript migration.
- **JWT access + refresh** session strategy (refresh token in httpOnly cookie).
- **node-pg-migrate** for versioned schema migrations (fits the existing raw `pg` setup).
- **Include backend deployment** automation to the DigitalOcean droplet.
- This plan is **design-only** — no code is written until approved.

**Guiding principles:** React best practices (feature-based structure, service layer, React Query for server state, thin contexts), Express/Node best practices (layered routes → controllers → services → repositories, centralized error handling, validation middleware, security middleware), and design patterns that keep the project scalable (Repository pattern, Strategy for auth, dependency-light DI via factory modules).

---

## Current State (verified)

**Frontend** — CRA 5 (`react-scripts`), React 18.3, `react-router-dom` 6.28, MUI 5, axios (present but unused), `@supabase/supabase-js`, `@react-oauth/google`. State via Context API only. Direct Supabase queries in `DataContext`. Routes in [client/src/App.jsx](client/src/App.jsx): `/`, `/resources`, `/request`, `/signin`, `/submit`, `/our-story`, `/admin-dashboard`. `isAdmin()` checks `userProfile.role === 'admin'`.

**Backend** — Express 4 (ESM), `pg` 8 pool ([server/src/db.js](server/src/db.js)), env-aware config ([server/src/config.js](server/src/config.js)), swagger-jsdoc docs. **No** routes/controllers/services/models/middleware/auth/validation yet. Everything inline in `index.js`.

**Data model (from Supabase, to recreate in self-hosted PG):** `universities → domains → subjects`; `skill_categories → skills`; `exam_categories → exams`; `resources` (FK to one of subject/skill/exam, `is_approved`, `submitted_by`); `user_profiles`; `user_resource_requests`; `user_saved_resources`; `user_submitted_resources`. (Source: [database_policies.json](database_policies.json), `DataContext` select shapes.)

**Infra** — DigitalOcean droplet, Postgres 18 loopback-only (SSH tunnel `5433→5432` for dev). [.github/workflows/deploy.yml](.github/workflows/deploy.yml) deploys **client only** (rsync static build). `build.bat` orchestrates local dev via `concurrently`.

---

## Target Architecture

### Backend layering (per request flow)
```
HTTP → route → [middleware: auth → rbac → validate] → controller → service → repository → db.query
                                          ↓ (on throw)
                              centralized errorHandler → JSON error
```
- **routes/** — URL + method → middleware chain → controller method. Thin.
- **controllers/** — parse `req`, call service, shape `res`. No business logic, no SQL.
- **services/** — business rules, orchestration, transactions. No `req`/`res`.
- **repositories/** — the **only** place that touches `db.query` (Repository pattern). Returns plain objects.
- **middleware/** — `requireAuth` (verify JWT), `requirePermission('resource:approve')` (RBAC), `validate(schema)` (zod), `errorHandler`, `notFound`, request logging.
- **validators/** — zod schemas per resource.
- **auth/** — Passport Google strategy + JWT issue/verify/refresh (Strategy pattern keeps room for future providers).
- **config/**, **db/** (pool + migrations), **utils/** (ApiError class, asyncHandler wrapper).

### Frontend structure (feature-based)
```
client/src/
  app/            # App.jsx, router config, providers composition
  features/
    auth/         # AuthContext (thin), useAuth, SignIn, OAuth callback
    resources/    # list/detail/submit/request, hooks, components
    catalog/      # universities/domains/subjects/skills/exams browse+filter
    admin/        # management dashboard + per-entity CRUD tabs
    profile/      # saved/submitted resources
  shared/
    api/          # axios instance + interceptors, React Query client
    components/   # reusable UI (Header, LoadingScreen, cards, modals)
    hooks/        # cross-feature hooks
    lib/          # constants, formatters
```
- **Server state → React Query (TanStack Query).** Replaces the giant `DataContext` fetch-everything pattern. Caching, retries, pagination, invalidation for free.
- **Auth state → thin AuthContext** (current user + tokens only; no data).
- **API access → service modules** (`resourcesApi`, `authApi`, `adminApi`) on a shared axios instance with interceptors that attach the access token and transparently refresh on 401.

---

## Phased Implementation

> Each phase is independently shippable and leaves the app working. Frontend keeps reading Supabase until Phase 6 cuts the data path over, so there's no big-bang breakage.

### Phase 0 — Tooling & hygiene foundation
**Backend**
- Add deps: `helmet`, `morgan`, `express-rate-limit`, `compression`, `cookie-parser`, `zod`, `passport`, `passport-google-oauth20`, `jsonwebtoken`, `node-pg-migrate`, `bcrypt` (for any non-OAuth admin), `eslint` + config. Dev: `vitest`/`jest` + `supertest`.
- Add `src/utils/ApiError.js` (typed error class) and `src/utils/asyncHandler.js` (wraps async controllers so rejections hit `errorHandler`).
- Add `src/middleware/errorHandler.js` + `notFound.js`; wire them last in `index.js`.
- Add `helmet`, `compression`, `morgan` (env-gated), `rate-limit` (on `/api/auth`).
- Add `npm run lint`, `npm run test`, `npm run migrate` scripts.

**Frontend**
- Add deps: `@tanstack/react-query`. Add ESLint/Prettier config. Add `client/.env.example` keys cleanup (remove Supabase keys at the end of Phase 6).
- No behavior change yet.

**Files:** `server/src/utils/*`, `server/src/middleware/errorHandler.js`, `server/src/middleware/notFound.js`, `server/package.json`, `client/package.json`.

### Phase 1 — Database schema + migrations (self-hosted Postgres)
- Initialize `node-pg-migrate` (`server/migrations/`, `migrate` scripts using `DATABASE_URL`).
- Migration set (mirror Supabase model, add RBAC):
  - **Catalog:** `universities`, `domains(university_id)`, `subjects(domain_id)`, `skill_categories`, `skills(skill_category_id)`, `exam_categories`, `exams(exam_category_id)`.
  - **Resources:** `resources` with nullable `subject_id`/`skill_id`/`exam_id` (exactly-one CHECK), `is_approved`, `submitted_by`, timestamps; indexes on FK + `is_approved` + a search index (`pg_trgm` GIN on title/description for the universal search bar).
  - **Users & RBAC:** `users` (id, google_id, email, full_name, avatar_url, timestamps), `roles` (`student`, `management`), `permissions` (e.g. `resource:approve`, `catalog:manage`, `resource:read`), `role_permissions` (M:N), `user_roles` (M:N) — **separate roles/permissions tables** per decision.
  - **User activity:** `user_saved_resources`, `user_submitted_resources` (or derive from `resources.submitted_by`), `user_resource_requests`.
  - **Auth:** `refresh_tokens` (hashed token, user_id, expires_at, revoked) for refresh rotation.
- Seed migration: roles, baseline permissions, role→permission grants, and the first management user (by email).
- Add a **data-migration note/script** to export current Supabase rows → import into PG (one-off, run during Phase 6 cutover).

**Files:** `server/migrations/*.js`, `server/src/db/seed.js`.

### Phase 2 — Backend auth (Google OAuth + JWT + RBAC)
- **Passport Google strategy** (`passport-google-oauth20`): `GET /api/auth/google` → redirect; `GET /api/auth/google/callback` → find-or-create `users` row, assign default `student` role, issue **access JWT** (~15 min) + **refresh token** (httpOnly, secure, sameSite cookie; row in `refresh_tokens`), redirect back to client.
- Endpoints: `POST /api/auth/refresh` (rotate refresh, new access), `POST /api/auth/logout` (revoke refresh + clear cookie), `GET /api/auth/me` (current user + roles + permissions).
- **Middleware:** `requireAuth` (verify access JWT → `req.user`), `requirePermission(...perms)` (loads user perms, checks). Permission set resolved from `user_roles → role_permissions`.
- **Services/repos:** `authService`, `userRepository`, `roleRepository`, `refreshTokenRepository`.
- Swagger-document every endpoint (existing `@openapi` JSDoc pattern).
- Tests: auth flow (mock Google profile), refresh rotation, permission middleware.

**Files:** `server/src/auth/passport.js`, `server/src/auth/jwt.js`, `server/src/routes/auth.routes.js`, `server/src/controllers/auth.controller.js`, `server/src/services/auth.service.js`, `server/src/middleware/requireAuth.js`, `server/src/middleware/requirePermission.js`, `server/src/repositories/*`.

### Phase 3 — Backend catalog + resources API (public + management)
- **Public (read):** `GET /api/catalog/universities?include=domains,subjects`, `/domains`, `/subjects`, `/skills`, `/exams`; `GET /api/resources` (filter by university/domain/subject/skill/exam, `is_approved=true`, pagination); `GET /api/resources/:id`; `GET /api/search?q=` (trigram search powering the homepage universal search bar).
- **Authenticated (student):** `POST /api/resources` (submit → `is_approved=false`), `POST /api/requests` (request a resource), saved-resources CRUD `GET/POST/DELETE /api/me/saved-resources`, `GET /api/me/submissions`.
- **Management (RBAC-gated):** full CRUD on catalog entities + resources; `GET /api/admin/resources/pending`, `POST /api/admin/resources/:id/approve|reject`; `GET /api/admin/users` + role assignment.
- Each entity: route → controller → service → repository. zod validation on every write. Consistent response envelope (`{ data, meta }`) and error shape.
- Tests: repository queries against a test DB, controller integration via supertest, permission gating.

**Files:** `server/src/routes/{catalog,resources,requests,me,admin}.routes.js`, matching `controllers/`, `services/`, `repositories/`, `validators/`.

### Phase 4 — Frontend foundation (structure, API layer, React Query)
- Restructure `client/src` into feature folders (above). Move existing components/pages into `features/*` and `shared/*` (mechanical move + import fixes; no logic change yet).
- **API layer:** `shared/api/client.js` — axios instance with `baseURL = REACT_APP_API_URL`, request interceptor (attach access token from memory), response interceptor (on 401 → call `/auth/refresh` once → retry; else redirect to sign-in). `shared/api/queryClient.js` — React Query client; wrap app in `QueryClientProvider`.
- Service modules: `features/auth/authApi.js`, `features/resources/resourcesApi.js`, `features/catalog/catalogApi.js`, `features/admin/adminApi.js`.
- No data cutover yet — keep Supabase `DataContext` alive in parallel so the app still works.

**Files:** `client/src/shared/api/*`, `client/src/app/App.jsx`, feature folder moves.

### Phase 5 — Frontend auth cutover (Express OAuth)
- Replace Supabase `AuthContext` with a thin one backed by the Express API: "Sign in with Google" → redirect to `GET /api/auth/google`; on return, call `GET /api/auth/me` to hydrate `user` + `permissions`; store access token in memory, rely on httpOnly refresh cookie.
- `ProtectedRoute` → check `isAuthenticated`; add `RequirePermission` wrapper for `/admin-dashboard` (replaces `isAdmin()` string check with permission check, e.g. `catalog:manage`).
- Remove `@react-oauth/google` usage (backend-driven flow doesn't need it) and `jwt-decode` if unused.
- Add `/auth/callback` route to finish the redirect handshake.

**Files:** `client/src/features/auth/AuthContext.jsx`, `useAuth.js`, `SignIn.jsx`, `client/src/shared/components/ProtectedRoute.jsx`, router config.

### Phase 6 — Frontend data cutover + Supabase removal
- Replace `DataContext` Supabase calls with React Query hooks over the service modules: `useResources`, `useResource`, `useSearch`, `useCatalog`, `useSavedResources`, admin mutation hooks (`useApproveResource`, entity CRUD).
- Port the homepage universal search, resource filters, submit/request forms, profile saved-resources, and the management dashboard tabs to the new hooks.
- **Run the one-off data migration** (Phase 1 script) to move live Supabase rows into PG before flipping production.
- Delete `client/src/supabaseClient.js`, remove `@supabase/supabase-js`, drop Supabase env vars from `client/.env.example` and CRA configs. Remove the fallback/demo-data path in favor of React Query loading/error states.

**Files:** `client/src/features/**/hooks/*`, removal of `supabaseClient.js` + `DataContext.jsx`.

### Phase 7 — Deployment automation (server) + docs
- **Server deploy:** add a job to [.github/workflows/deploy.yml](.github/workflows/deploy.yml) (or a sibling workflow) to rsync `server/` to the droplet, `npm ci --omit=dev`, run `npm run migrate`, and restart via **pm2** (or systemd). Wire server env (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `CLIENT_ORIGIN`) via GitHub Environments + droplet `.env.production`.
- Update Google Cloud OAuth authorized origins/redirects to the real domains (callback `https://cachedinfo.gamingdronzz.com/api/auth/google/callback`).
- Update `build.bat` for the new structure; rewrite/replace [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) (currently stale Mongo/JWT) with accurate setup docs; add `server/README.md` + `client/README.md`.

**Files:** `.github/workflows/deploy.yml`, `build.bat`, docs.

---

## Key Design Patterns Used
- **Repository pattern** — isolates SQL in `repositories/`; services/controllers stay DB-agnostic and testable.
- **Strategy pattern** — Passport auth strategy; adding GitHub/email later won't touch controllers.
- **Centralized error handling** — `ApiError` + `asyncHandler` + `errorHandler` middleware = consistent JSON errors, no try/catch sprawl.
- **RBAC via permissions** — controllers gate on capability (`resource:approve`), not on a hardcoded role string — scales to more management sub-roles.
- **Server-state caching (React Query)** — replaces hand-rolled context fetching; declarative cache/invalidation.
- **Feature-based modularization** — frontend grouped by domain, not file type.

---

## Verification

**Per phase**
- **Backend (2–3):** `npm run migrate` applies cleanly; `npm test` (vitest + supertest) green; manual: hit `/api/auth/google` end-to-end, confirm cookie + `/api/auth/me`; confirm a student token is rejected on `/api/admin/*` and a management token is accepted.
- **Frontend (4–6):** `npm start`, sign in with Google via Express, confirm `/admin-dashboard` only opens with management permission, search + filters + submit + save + approve all hit the API (verify in Network tab and Postgres rows).
- **API docs:** every endpoint visible at `/api/docs`.

**End-to-end (after Phase 6)**
1. Start API (`npm run start:dev`) + client (`npm start`) via updated `build.bat` (SSH tunnel open).
2. Sign in as a fresh Google account → lands as **student**, can browse/search/save/submit (submission is pending).
3. Grant that user **management** (seed or admin UI) → can approve the pending resource and manage catalog entities.
4. Confirm Supabase is fully removed: no `@supabase/*` imports, no `REACT_APP_SUPABASE_*` referenced, app fully functional against Postgres.

**Deployment (Phase 7):** push to `staging` → server job migrates + restarts via pm2; smoke-test `https://staging.cachedinfo.gamingdronzz.com` OAuth + a read endpoint; then promote to `main`.

---

## Open Risks / Notes
- **Data migration timing:** the Supabase→PG row export (Phase 1 script, run in Phase 6) is the one irreversible-ish step — take a PG dump before importing.
- **OAuth redirect URIs** must be registered in Google Cloud Console for localhost + staging + prod before Phase 2/5 testing.
- **`is_admin(auth.uid())` RLS policies** in Supabase become app-layer RBAC checks — there are no Postgres RLS policies in the self-hosted DB; all enforcement moves to Express middleware.
- Keep `jwt-decode`/`@react-oauth/google` only if a later flow needs them; default is removal in Phase 5.
