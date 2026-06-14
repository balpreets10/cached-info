# Server deployment (DigitalOcean droplet)

The Cached Info **API** is deployed by `.github/workflows/deploy.yml` (jobs
`deploy-server-staging` / `deploy-server-production`) alongside the static client.
Two API instances run on this one droplet under **PM2**, behind separate nginx
server blocks:

| Env        | PM2 app                 | Port (127.0.0.1) | App dir                                              | Secret file                  |
|------------|-------------------------|------------------|-----------------------------------------------------|------------------------------|
| production | `cinfo-api-production`  | 5000             | `/var/www/cachedinfo.gamingdronzz.com-api`          | `/etc/cinfo/api-production.env` |
| staging    | `cinfo-api-staging`     | 5001             | `/var/www/staging.cachedinfo.gamingdronzz.com-api`  | `/etc/cinfo/api-staging.env`    |

## Secret model — secrets live in GitHub, never hand-edited on the box

Runtime secrets are stored as **GitHub Environment** secrets/vars (`staging` /
`production` environments) and injected at deploy time. Each deploy rewrites a
**root-owned `/etc/cinfo/api-<env>.env` (chmod 600, outside the app dir)** from those
values. PM2 reads that file via [`ecosystem.config.cjs`](ecosystem.config.cjs) and
merges it into the app's environment; the server's `config.js` reads them from
`process.env` (process env always wins over any committed `.env`).

Nothing secret is committed, and nothing is edited by hand on the server.

### GitHub Environment config (do this once, per env)

Per environment (`staging`, then `production`) — **secrets**:

| Secret                 | Value                                                |
|------------------------|------------------------------------------------------|
| `JWT_ACCESS_SECRET`    | env-specific signing secret                          |
| `DATABASE_URL`         | `postgresql://…@127.0.0.1:5432/…` (env-specific DB)  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                           |

**Variables** (non-secret):

| Variable                | staging                                                                | production                                                      |
|-------------------------|------------------------------------------------------------------------|----------------------------------------------------------------|
| `SERVER_CLIENT_ORIGIN`  | `https://staging.cachedinfo.gamingdronzz.com`                          | `https://cachedinfo.gamingdronzz.com`                          |
| `GOOGLE_CLIENT_ID`      | OAuth client id                                                        | OAuth client id                                                |
| `GOOGLE_CALLBACK_URL`   | `https://staging.cachedinfo.gamingdronzz.com/api/auth/google/callback` | `https://cachedinfo.gamingdronzz.com/api/auth/google/callback` |
| `BOOTSTRAP_ADMIN_EMAIL` | bootstrap admin email                                                 | bootstrap admin email                                          |

`SERVER_CLIENT_ORIGIN` is named distinctly so it doesn't collide with the client
build's `REACT_APP_*` vars in the same Environment; the deploy job maps it onto
`CLIENT_ORIGIN`. `PORT` is set by the workflow (5000 prod / 5001 staging);
`JWT_ACCESS_TTL`, `JWT_REFRESH_TTL_DAYS`, `REFRESH_COOKIE_NAME` use `config.js`
defaults.

```bash
gh secret set JWT_ACCESS_SECRET    --env staging --body "<staging-secret>"
gh secret set DATABASE_URL         --env staging --body "<staging-db-url>"
gh secret set GOOGLE_CLIENT_SECRET --env staging --body "<staging-google-secret>"
gh variable set GOOGLE_CLIENT_ID      --env staging --body "<id>"
gh variable set GOOGLE_CALLBACK_URL   --env staging --body "https://staging.cachedinfo.gamingdronzz.com/api/auth/google/callback"
gh variable set SERVER_CLIENT_ORIGIN  --env staging --body "https://staging.cachedinfo.gamingdronzz.com"
gh variable set BOOTSTRAP_ADMIN_EMAIL --env staging --body "<email>"
# repeat all with --env production and prod values
```

## One-time droplet prep (manual)

Run these once on the droplet as a sudo-capable admin.

1. **Node 20 + PM2** (PM2 runs as the deploy user, not root):
   ```bash
   # Node 20 via nodesource if not already present, then:
   sudo npm i -g pm2
   pm2 startup        # run the printed `sudo env … pm2 startup` command it gives you
   ```

2. **Directories** — app dirs owned by the deploy user, secret dir root-only:
   ```bash
   sudo mkdir -p /etc/cinfo && sudo chmod 700 /etc/cinfo          # CI writes env files here
   sudo mkdir -p /var/www/staging.cachedinfo.gamingdronzz.com-api /var/www/cachedinfo.gamingdronzz.com-api
   sudo chown -R "$DEPLOY_USER":"$DEPLOY_USER" /var/www/staging.cachedinfo.gamingdronzz.com-api /var/www/cachedinfo.gamingdronzz.com-api
   ```

3. **Scoped passwordless sudo for the deploy user.** The SSH deploy step needs root
   for *only* writing/reading the secret files — nothing else. Add a sudoers drop-in
   (`sudo visudo -f /etc/sudoers.d/cinfo-deploy`), replacing `deploy` with the actual
   user:
   ```
   deploy ALL=(root) NOPASSWD: /usr/bin/install -m 600 -o root -g root /dev/null /etc/cinfo/api-staging.env, \
                               /usr/bin/install -m 600 -o root -g root /dev/null /etc/cinfo/api-production.env, \
                               /usr/bin/tee /etc/cinfo/api-staging.env, \
                               /usr/bin/tee /etc/cinfo/api-production.env, \
                               /usr/bin/cat /etc/cinfo/api-staging.env, \
                               /usr/bin/cat /etc/cinfo/api-production.env
   ```
   > Verify the binary paths with `command -v install tee cat` — they're usually under
   > `/usr/bin` but adjust if your distro differs. PM2 needs **no** sudo.

4. **nginx** — reverse-proxy `/api/*` to the per-env port on each host:
   ```nginx
   # staging server block
   location /api/ { proxy_pass http://127.0.0.1:5001; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
   # production server block
   location /api/ { proxy_pass http://127.0.0.1:5000; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
   ```
   Register both `GOOGLE_CALLBACK_URL`s as authorized redirect URIs in Google Cloud
   Console.

5. **First deploy + seed.** Push to `staging` (or `workflow_dispatch`) so the job ships
   code, writes the env file, migrates, and starts PM2. Then seed roles/permissions
   once per env DB (grants `management` to `BOOTSTRAP_ADMIN_EMAIL` after that user has
   signed in once):
   ```bash
   cd /var/www/staging.cachedinfo.gamingdronzz.com-api/server
   set -a; sudo cat /etc/cinfo/api-staging.env > /tmp/e && . /tmp/e && rm -f /tmp/e; set +a
   npm run seed
   ```
   Repeat for production after pushing to `main`.

## What each deploy does (automated)

1. rsync `server/` → the per-env API app dir's `server/` (staging:
   `/var/www/staging.cachedinfo.gamingdronzz.com-api`; production:
   `/var/www/cachedinfo.gamingdronzz.com-api`) — excludes `node_modules`, `.env*`, `.git`.
2. rsync `deploy/ecosystem.config.cjs` → that same app dir's `deploy/`.
3. Write `/etc/cinfo/api-<env>.env` (root, 600) from GitHub secrets/vars.
4. `npm ci --omit=dev`.
5. `npm run migrate` (with `DATABASE_URL` sourced from the env file).
6. `pm2 startOrReload … --only cinfo-api-<env> --update-env && pm2 save`.
7. `curl -fsS http://127.0.0.1:<port>/api/health` — fails the job if not healthy.

## Operating

```bash
pm2 list                         # both apps + status
pm2 logs cinfo-api-staging       # tail logs
pm2 restart cinfo-api-staging    # manual restart (deploy does this for you)
curl http://127.0.0.1:5001/api/health    # staging liveness
curl http://127.0.0.1:5001/api/db-ping   # staging DB connectivity
```

After a droplet reboot PM2 resurrects both apps automatically (from step 1's
`pm2 startup` + the `pm2 save` each deploy runs).
