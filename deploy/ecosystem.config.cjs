// PM2 ecosystem config for the Cached Info API. CommonJS (.cjs) on purpose:
// the server package is "type":"module", so a plain .js here would be treated
// as ESM and PM2's require() would fail.
//
// Two apps, one per environment, both on this single droplet behind separate
// nginx server blocks:
//   cinfo-api-production -> 127.0.0.1:5000
//   cinfo-api-staging    -> 127.0.0.1:5001
//
// Secrets are NOT in this file. They live in a root-owned env file written from
// GitHub on every deploy (see deploy/README.md):
//   /etc/cinfo/api-<env>.env   (chmod 600)
// We read that file here and merge it into the app's `env`, so a plain
// `pm2 startOrReload ecosystem.config.cjs --only cinfo-api-<env> --update-env`
// picks up the latest secrets with no extra shell sourcing. The server's
// config.js then reads them from process.env (process env always wins over any
// committed .env file).

const fs = require('node:fs');
const path = require('node:path');

// Minimal dotenv-style parser — avoids adding a dependency to the deploy config.
// Handles `KEY=value`, ignores blanks/comments, strips surrounding quotes.
function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

// server/ lives one level up from deploy/. App code is rsynced to the per-env
// API app dir (/var/www/<site>-api/server), and this config is run with cwd
// there. Paths here are relative (__dirname), so the app dir name doesn't matter.
const serverEntry = path.resolve(__dirname, '..', 'server', 'src', 'index.js');

function appFor(env, port) {
  return {
    name: `cinfo-api-${env}`,
    script: serverEntry,
    cwd: path.resolve(__dirname, '..', 'server'),
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '400M', // 1 GB box hosts both apps + Postgres + nginx
    env: {
      NODE_ENV: env,
      PORT: String(port),
      // Secrets/vars sourced from GitHub, written to the root-owned env file.
      ...readEnvFile(`/etc/cinfo/api-${env}.env`),
    },
  };
}

module.exports = {
  apps: [appFor('production', 5000), appFor('staging', 5001)],
};
