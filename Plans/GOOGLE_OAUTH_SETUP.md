# Google OAuth Setup Guide

A step-by-step guide for wiring up Google OAuth credentials so the backend-driven
login flow works end-to-end. **This is for you to do** while I implement the frontend.
Nothing here touches code — it's all Google Cloud Console + `server/.env.development`.

## How the flow works (so the config makes sense)

The Express API owns the entire OAuth handshake. The React client never sees a Google
client secret. The flow:

```
1. User clicks "Sign in with Google" in the SPA
       → browser navigates to  GET http://localhost:5000/api/auth/google
2. Express (Passport) redirects to Google's consent screen
3. User approves → Google redirects to the CALLBACK URL:
       GET http://localhost:5000/api/auth/google/callback?code=...
4. Express exchanges the code, find-or-creates our user, issues:
       - a short-lived JWT access token
       - an opaque refresh token (httpOnly cookie `cinfo_rt`)
5. Express redirects the browser back to the SPA:
       http://localhost:3000/auth/callback#access_token=<JWT>
6. The SPA reads the token from the URL fragment, stores it in memory,
   and calls GET /api/auth/me to hydrate the user.
```

The **only** URL Google needs to know about is the callback in step 3:
`http://localhost:5000/api/auth/google/callback`. Note it points at the **API (port
5000)**, not the React app (port 3000).

---

## Step 1 — Create a Google Cloud project

1. Go to <https://console.cloud.google.com/>.
2. Top bar → project dropdown → **New Project**.
   - Name: `cachedinfo` (or whatever you like).
   - Click **Create**, then select the project.

## Step 2 — Configure the OAuth consent screen

OAuth credentials can't be created until the consent screen exists.

1. Left menu → **APIs & Services → OAuth consent screen**.
2. **User Type: External** → **Create**. (External is correct even for a private app;
   Internal requires a Google Workspace org.)
3. Fill the required fields:
   - **App name:** `Cached Info`
   - **User support email:** your email
   - **Developer contact email:** your email
   - Logo / homepage / privacy URLs are optional for testing — leave blank.
4. **Scopes** step → click **Add or Remove Scopes** and select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - (`openid` is added automatically.)
   These match the `['profile', 'email']` scope the backend requests.
5. **Test users** step → **Add Users** → add the Google account(s) you'll log in with.
   While the app is in "Testing" mode, only listed test users can sign in. **Add
   `biggsthegamer@gmail.com`** (and any account whose email matches
   `BOOTSTRAP_ADMIN_EMAIL` — see Step 5).
6. Save and go back to the dashboard. You can leave it in **Testing** mode; no need to
   publish for local development.

## Step 3 — Create OAuth client credentials

1. Left menu → **APIs & Services → Credentials**.
2. **+ Create Credentials → OAuth client ID**.
3. **Application type: Web application**.
4. **Name:** `cachedinfo-local` (any label).
5. **Authorized JavaScript origins** — add:
   - `http://localhost:3000`  (the React dev server)
   - `http://localhost:5000`  (the API)
6. **Authorized redirect URIs** — add **exactly** (no trailing slash):
   - `http://localhost:5000/api/auth/google/callback`

   ⚠️ This must match `GOOGLE_CALLBACK_URL` in `.env.development` character-for-character.
   A mismatch is the #1 cause of `redirect_uri_mismatch` errors.
7. Click **Create**. A dialog shows your **Client ID** and **Client Secret** — copy both
   (you can always retrieve them again from the Credentials list).

## Step 4 — Put the credentials in `server/.env.development`

If `server/.env.development` doesn't exist yet, copy it from the template:

```powershell
Copy-Item server\.env.example server\.env.development
```

Then set these values (leave the DB/JWT lines as they already are):

```ini
# Google OAuth
GOOGLE_CLIENT_ID=<paste the Client ID>
GOOGLE_CLIENT_SECRET=<paste the Client Secret>
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Where Express sends the browser after login. The SPA must serve /auth/callback.
CLIENT_ORIGIN=http://localhost:3000
```

If you don't yet have a `JWT_ACCESS_SECRET`, generate one:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Step 5 — Pick the bootstrap admin (management role)

New users get the **student** role automatically. To get a **management** account, set
`BOOTSTRAP_ADMIN_EMAIL` to the Google email you'll log in with, then run the seed:

```ini
BOOTSTRAP_ADMIN_EMAIL=biggsthegamer@gmail.com
```

```powershell
cd server
npm run seed:dev      # idempotent — grants the management role to that email
```

> The seed grants the role by email. The user row is created on first login, so the
> grant applies whether you seed before or after your first sign-in (re-run seed after
> first login if it reports the user wasn't found).

## Step 6 — Smoke-test the flow

1. Start the API (terminal 1):
   ```powershell
   cd server
   npm run start:dev
   ```
2. Start the React app (terminal 2) — I'll confirm the exact command once the client is
   wired, but it'll be:
   ```powershell
   cd client
   npm start
   ```
3. In the browser, open the app, click **Sign in with Google**, approve consent.
4. You should land back on the app, logged in. If you open DevTools:
   - **Application → Cookies → localhost** should show an httpOnly `cinfo_rt` cookie.
   - **Network**: `GET /api/auth/me` returns `{ data: { user, roles, permissions } }`.

You can also test just the backend half before the frontend is ready by visiting
`http://localhost:5000/api/auth/google` directly — it should redirect you to Google and,
after consent, bounce to `http://localhost:3000/auth/callback#access_token=...` (that
page 404s until I finish the client, but seeing the token in the URL confirms the
backend works).

---

## Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `Error 400: redirect_uri_mismatch` | The redirect URI in Google Console ≠ `GOOGLE_CALLBACK_URL`. Compare exactly, including `http` vs `https`, port, and no trailing slash. |
| `Access blocked: app not verified` / `This app isn't verified` | Normal in Testing mode. Either add your email under **Test users**, or click **Advanced → Go to Cached Info (unsafe)**. |
| `403: access_denied` | Your Google account isn't in the **Test users** list. Add it (Step 2.5). |
| Console warns `[auth] Google OAuth not configured` on server start | `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are empty/missing in `.env.development`. |
| Redirected to `/api/auth/failure` (401) | Passport handshake failed — usually a wrong client secret or the consent screen is misconfigured. |
| Cookie not set / login doesn't stick | In dev the cookie is `SameSite=Lax`, `Secure=false` over `http://localhost` — fine. If you serve the client from a different host/port than expected, update `CLIENT_ORIGIN`. |

## When you deploy (later — Phase 7)

Add **two more redirect URIs** to the same OAuth client (or a separate prod client):

- staging: `https://staging.cachedinfo.gamingdronzz.com/api/auth/google/callback`
- prod:    `https://cachedinfo.gamingdronzz.com/api/auth/google/callback`

and set the matching `GOOGLE_CALLBACK_URL` / `CLIENT_ORIGIN` per environment. Before going
live for non-test users, **publish** the consent screen (or keep it Internal if you move
to a Workspace org).
