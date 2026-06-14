import { Router } from 'express';
import { query } from '../db.js';
import asyncHandler from '../utils/asyncHandler.js';
import config from '../config.js';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Liveness check (no DB involved).
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is up.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 env: { type: string, example: development }
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.env });
});

/**
 * @openapi
 * /api/db-ping:
 *   get:
 *     summary: Verify the backend can reach Postgres.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Connected — returns the database name.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected: { type: boolean, example: true }
 *                 database: { type: string, example: gamingdronzz_cachedinfo }
 */
router.get(
  '/db-ping',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT current_database() AS database, 1 AS ok');
    res.json({ connected: true, database: rows[0].database });
  }),
);

export default router;
