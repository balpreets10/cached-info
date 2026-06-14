import pg from 'pg';
import config from './config.js';

const { Pool } = pg;

// Single shared connection pool. The DB is loopback-only (via SSH tunnel for
// remote dev, or directly when the app runs on the droplet), so SSL is disabled.
const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, ssl: false })
  : new Pool({ ...config.pg, ssl: false });

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error:', err.message);
});

/**
 * Run a parameterized query against the pool.
 * Copy this pattern when building real routes.
 * @param {string} text - SQL with $1, $2 placeholders.
 * @param {Array} [params] - Values for the placeholders.
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
