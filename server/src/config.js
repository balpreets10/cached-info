import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

// Pick the environment. dev / staging / prod are the supported values.
const env = process.env.NODE_ENV || 'development';

// Load .env.<env> if present, otherwise fall back to a plain .env.
// Variables already set in the real process environment (e.g. injected by
// CI or the host) always win — dotenv does not override existing values.
const envFile = path.join(serverRoot, `.env.${env}`);
const fallbackFile = path.join(serverRoot, '.env');
const chosenFile = fs.existsSync(envFile) ? envFile : fallbackFile;

if (fs.existsSync(chosenFile)) {
  dotenv.config({ path: chosenFile });
} else {
  console.warn(`[config] No env file found (looked for ${envFile} and ${fallbackFile}). Relying on process env.`);
}

// Prefer a single DATABASE_URL; fall back to discrete PG* fields if absent.
const databaseUrl = process.env.DATABASE_URL || null;

const isProd = env === 'production';

const config = {
  env,
  isProd,
  port: Number(process.env.PORT) || 5000,
  // CORS origin for the React client. Comma-separated list supported.
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  // Where to send the browser after a successful OAuth login (first origin).
  clientUrl: (process.env.CLIENT_ORIGIN || 'http://localhost:3000').split(',')[0].trim(),
  databaseUrl,
  // Discrete fields used only when DATABASE_URL is not provided.
  pg: {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  },
  // JSON Web Tokens. accessSecret signs short-lived access tokens; refresh
  // tokens are opaque random strings stored (hashed) in the DB — no secret.
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS) || 30,
  },
  // Google OAuth (backend-driven via Passport).
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Full callback URL registered in Google Cloud Console.
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      `http://localhost:${Number(process.env.PORT) || 5000}/api/auth/google/callback`,
  },
  // httpOnly cookie that carries the refresh token.
  cookie: {
    name: process.env.REFRESH_COOKIE_NAME || 'cinfo_rt',
    secure: isProd, // HTTPS only in prod
    sameSite: isProd ? 'none' : 'lax',
  },
  // Email of the bootstrap management user, granted the management role on seed.
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || null,
};

export default config;
