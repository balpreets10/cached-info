# Phase 7 (partial): server CI/CD + GitHub-injected runtime secrets

## Context

Login was failing in dev with `secretOrPrivateKey must have a value` because
`JWT_ACCESS_SECRET` was unset (fixed in dev via `server/.env.development`). Staging +
prod JWT secrets now exist and the user wants them — and every other server runtime
secret — **stored in GitHub and injected at deploy time**, *not* hand-placed on the
droplet.

**The gap:** `.github/workflows/deploy.yml` only builds the **client** and rsyncs the
static `build/` to the droplet web root. There is **no server job**, no server env
provisioning, and no API restart. So GitHub Secrets alone never reach the running API.
The server today runs manually on the droplet from `server/.env.{staging,production}`
files that live *on the server* — exactly what we're replacing. This is the pending
**Phase 7** (server deployment automation) from CLAUDE.md.

**Goal of this change (per the user):**
1. Stop maintaining secrets on the server by hand — source them from GitHub.
2. Add the server process to the deploy pipeline (ship code, inject env, migrate,
   restart) alongside the existing client deploy.

**Decisions confirmed with the user:**
- **Process manager: PM2** (per env), not systemd.
- **Secret delivery: a root-owned env file written from GitHub each deploy**
  (`/etc/cinfo/api-<env>.env`, `chmod 600`, outside the app dir), consumed by PM2.
  Secrets *originate in GitHub*; the on-disk copy is a deploy artifact, root-only,
  never committed and never living in the app directory.
- **Migrations run on every server deploy** (`npm run migrate` before restart).

## Key facts established (verified in repo)

- Server: ESM, entry `server/src/index.js`; `app.js` exports `createApp()` (factory),
  `index.js` only `listen()`s. Health route is `GET /api/health` →
  `{ status, env }` (no DB), in `server/src/routes/system.routes.js`. There's also
  `GET /api/db-ping`.
- `server/src/config.js` loads `server/.env.<NODE_ENV>` **but real process env always
  wins** (dotenv does not override). So injected env vars take effect with no app
  changes — PM2/the env file feed `process.env` and `config.js` reads them.
- `npm run migrate` = `node-pg-migrate up -m src/db/migrations -j js`. node-pg-migrate
  reads **`DATABASE_URL` from the process env** by default → the deploy step just needs
  `DATABASE_URL` exported (no `--envPath`). `db.js` uses `connectionString` from the
  same `DATABASE_URL`, `ssl:false` (loopback).
- Start scripts already exist: `start:staging` / `start:prod`
  (`cross-env NODE_ENV=<env> node src/index.js`).
- Full server env contract (`server/.env.example`): `NODE_ENV`, `PORT`,
  `CLIENT_ORIGIN`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`,
  `JWT_REFRESH_TTL_DAYS`, `REFRESH_COOKIE_NAME`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `BOOTSTRAP_ADMIN_EMAIL`. The TTL /
  cookie-name / PORT fields all have safe defaults in `config.js`.
- DB is loopback-only on the droplet — the API runs *on* the droplet, so it connects
  directly to `127.0.0.1:5432` (no SSH tunnel).
- Existing deploy secrets in use: `DO_SSH_HOST`, `DO_SSH_USER`, `DO_SSH_PRIVATE_KEY`
  (repo-level). Client build vars already use **Environment-scoped** `vars.*` /
  `secrets.*` under `staging` and `production` environments. The `prepare` job emits
  `deploy_staging` / `deploy_production` gating outputs we will reuse.
- PM2 / systemd / ecosystem are **not** present anywhere yet (only referenced in the
  Plans dir). This is greenfield on the droplet.

---

## Part A — Store the server secrets in GitHub (Environment-scoped)

Matches the existing per-env pattern in the workflow. Values differ per environment, so
**Environment** scoping (Settings → Environments → `staging` / `production`) is correct
and prevents staging values leaking into prod.

Per environment (`staging`, then `production`), add these **secrets**:

| Secret name            | Value                                                |
|------------------------|------------------------------------------------------|
| `JWT_ACCESS_SECRET`    | the env-specific secret you generated                |
| `DATABASE_URL`         | `postgresql://…@127.0.0.1:5432/…` (env-specific DB)  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                           |

And these **variables** (non-secret, Environment → Variables):

| Variable name           | staging                                                                | production                                                      |
|-------------------------|------------------------------------------------------------------------|----------------------------------------------------------------|
| `SERVER_CLIENT_ORIGIN`  | `https://staging.cachedinfo.gamingdronzz.com`                          | `https://cachedinfo.gamingdronzz.com`                          |
| `GOOGLE_CLIENT_ID`      | OAuth client id                                                        | OAuth client id                                                |
| `GOOGLE_CALLBACK_URL`   | `https://staging.cachedinfo.gamingdronzz.com/api/auth/google/callback` | `https://cachedinfo.gamingdronzz.com/api/auth/google/callback` |
| `BOOTSTRAP_ADMIN_EMAIL` | admin email                                                            | admin email                                                    |

> `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL_DAYS`, `REFRESH_COOKIE_NAME`, `PORT` have safe
> defaults in `config.js` — only add them as vars if you need non-defaults. (`PORT`
> *is* set explicitly by the deploy job below to separate the two envs.)

> Use a distinct env var name (`SERVER_CLIENT_ORIGIN`) for the server's `CLIENT_ORIGIN`
> so it doesn't collide with the client build's `REACT_APP_*` vars in the same
> Environment. The deploy job maps it onto `CLIENT_ORIGIN` when writing the env file.

**gh CLI** (run per environment — `--env` scopes it):
```
gh secret set JWT_ACCESS_SECRET    --env staging --body "<staging-secret>"
gh secret set DATABASE_URL         --env staging --body "<staging-db-url>"
gh secret set GOOGLE_CLIENT_SECRET --env staging --body "<staging-google-secret>"
gh variable set GOOGLE_CLIENT_ID     --env staging --body "<id>"
gh variable set GOOGLE_CALLBACK_URL  --env staging --body "https://staging.cachedinfo.gamingdronzz.com/api/auth/google/callback"
gh variable set SERVER_CLIENT_ORIGIN --env staging --body "https://staging.cachedinfo.gamingdronzz.com"
gh variable set BOOTSTRAP_ADMIN_EMAIL --env staging --body "<email>"
# …repeat all with --env production and prod values
```

> Storing secrets is harmless but **inert** until Part B ships. Part A alone does not
> get them onto the running API.

---

## Part B — Add the server to the deploy pipeline (PM2)

### Runtime model on the droplet (PM2, per environment)
- One PM2 app per env: `cinfo-api-staging` and `cinfo-api-production`.
- Each runs `node server/src/index.js` with `NODE_ENV=<env>`, a per-env `PORT`
  (**prod 5000, staging 5001**) on `127.0.0.1`, `Restart` handled by PM2,
  `max_memory_restart: '400M'` (fits the 1 GB box).
- A **committed ecosystem file** `deploy/ecosystem.config.cjs` (CommonJS `.cjs` because
  the server package is `"type":"module"`) defines both apps. PM2 is told to read the
  per-env secret file so all contract vars land in `process.env`:
  - either `pm2 start deploy/ecosystem.config.cjs --only cinfo-api-<env> --update-env`
    after the deploy step `export`s the env file, **or**
  - reference the file from the ecosystem config so PM2 loads it directly.
  Decide the exact mechanism at implementation time; both end with `config.js` seeing
  the GitHub-sourced values (process env wins).
- `pm2 save` + `pm2 startup` (one-time) so the apps survive a droplet reboot.
- nginx reverse-proxies `/api/* → 127.0.0.1:<port>` per host (staging → 5001, prod →
  5000).

### Secret file (written from GitHub each deploy)
- Path `/etc/cinfo/api-<env>.env`, **root-owned, `chmod 600`, outside the app dir.**
- Written fresh on every deploy from the injected GitHub `secrets.*` / `vars.*`. Keys:
  `NODE_ENV`, `PORT`, `CLIENT_ORIGIN` (from `SERVER_CLIENT_ORIGIN`), `DATABASE_URL`,
  `JWT_ACCESS_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`,
  `BOOTSTRAP_ADMIN_EMAIL`.
- This is the "secrets via GitHub" outcome: nothing is hand-edited on the server; the
  on-disk file is a regenerated deploy artifact, root-only.

### Deploy jobs (`deploy-server-staging`, `deploy-server-production`)
Mirror the existing client jobs. Each MUST declare
`environment: { name: staging | production }` so Part A's Environment-scoped
secrets/vars resolve, and gate on the `prepare` job's `deploy_staging` /
`deploy_production` outputs. Steps:

1. **Checkout** (`actions/checkout@v4`).
2. **Ship server code** via `burnett01/rsync-deployments` (same action the client uses)
   to the per-env API app dir's `server/` (staging
   `/var/www/staging.cachedinfo.gamingdronzz.com-api`, production
   `/var/www/cachedinfo.gamingdronzz.com-api`), `--delete`, excluding `node_modules`, `.env*`,
   `.git`. (Reuses `DO_SSH_*` secrets.)
3. **One `appleboy/ssh-action` step** (same action already used for the clean step),
   passing values via its `envs:` from `${{ secrets.* }}` / `${{ vars.* }}`, running on
   the droplet:
   - write `/etc/cinfo/api-<env>.env` (root, `chmod 600`) from the injected values;
   - `cd <api-app-dir>/server && npm ci --omit=dev`;
   - `set -a; . /etc/cinfo/api-<env>.env; set +a` then `npm run migrate` (so
     `DATABASE_URL` is in the env for node-pg-migrate);
   - `pm2 startOrReload deploy/ecosystem.config.cjs --only cinfo-api-<env> --update-env`
     (or `restart … --update-env`); `pm2 save`;
   - `curl -fsS http://127.0.0.1:<port>/api/health` smoke check — **fail the job** if
     not `ok`.

### Files to change / add
- `.github/workflows/deploy.yml` — add `deploy-server-staging` + `deploy-server-production`
  jobs (reuse `prepare` gating + `DO_SSH_*`); add both to the `notify` job's `needs`.
- `deploy/ecosystem.config.cjs` — committed PM2 config (both apps, ports, `NODE_ENV`,
  `max_memory_restart`, reference to the per-env secret file).
- `deploy/README.md` — one-time droplet setup + the secret-file model.
- Update `server/README.md` (Run/Deploy section) + CLAUDE.md Phase 7 notes once shipped.

### One-time droplet prep (manual, outside CI — document in deploy/README.md)
- Install **Node 20** and **PM2** (`npm i -g pm2`) on the droplet; run `pm2 startup`
  and follow its printed command so PM2 resurrects on reboot.
- `mkdir -p /etc/cinfo` (root, `chmod 700`) — CI writes the per-env env files here.
- Create `/var/www/staging.cachedinfo.gamingdronzz.com-api` and
  `/var/www/cachedinfo.gamingdronzz.com-api` owned by the deploy user.
- Grant the deploy user tightly-scoped passwordless `sudo` for **only** writing
  `/etc/cinfo/*` (e.g. via a helper) so the SSH step isn't full root. (PM2 runs as the
  deploy user, so no sudo needed for it.)
- nginx: reverse-proxy `/api/* → 127.0.0.1:5001` (staging host) and `→ 127.0.0.1:5000`
  (prod host); confirm the Google callback URLs are registered in Google Cloud Console.
- First deploy per env: after the first code+env push, run `npm run seed` once against
  that env's DB (roles/permissions/grants; bootstraps `BOOTSTRAP_ADMIN_EMAIL`).

---

## Still to confirm during implementation
- **PM2 env mechanism**: ecosystem `env_file`-style reference vs. `source`-then-`--update-env`.
  Pick whichever reliably lands all contract vars in `process.env` (verify with the
  health/db-ping checks below).
- **Deploy-user sudo scope**: exact sudoers entry for the `/etc/cinfo/*` write.
- **Ports**: confirm prod 5000 / staging 5001, both APIs on this one droplet behind
  separate nginx server blocks.

---

## Verification

1. **Part A**: `gh secret list --env staging` / `gh variable list --env staging` (and
   `production`) show the new entries.
2. **Part B** — trigger a staging deploy (push to `staging` or `workflow_dispatch`):
   the server job ships code, writes the env file, migrates, and PM2-reloads.
3. On the droplet: `pm2 list` shows `cinfo-api-staging` online; `pm2 env <id>` (or the
   log) confirms `JWT_ACCESS_SECRET` / `DATABASE_URL` present.
   `curl http://127.0.0.1:5001/api/health` → `{ status: "ok", env: "staging" }`;
   `curl http://127.0.0.1:5001/api/db-ping` → `{ connected: true, … }`. No
   `secretOrPrivateKey` error in the log.
4. Browser: visit `https://staging.cachedinfo.gamingdronzz.com`, click Sign In →
   Google → returns to `/auth/callback`, header shows the user. No JWT error.
5. Reboot test (once): the PM2 apps come back up automatically (`pm2 resurrect`).
6. Repeat 2–5 for production (push to `main` / `workflow_dispatch` → production).
