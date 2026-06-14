import { query } from '../db.js';

/**
 * Data access for per-user activity: saved resources and resource requests.
 */

// --- Saved resources ---------------------------------------------------------

export const listSavedResourceIds = async (userId, db = query) => {
  const { rows } = await db(
    'SELECT resource_id FROM user_saved_resources WHERE user_id = $1',
    [userId],
  );
  return rows.map((r) => r.resource_id);
};

export const saveResource = async (userId, resourceId, db = query) => {
  await db(
    `INSERT INTO user_saved_resources (user_id, resource_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, resourceId],
  );
};

export const unsaveResource = async (userId, resourceId, db = query) => {
  await db('DELETE FROM user_saved_resources WHERE user_id = $1 AND resource_id = $2', [
    userId,
    resourceId,
  ]);
};

// --- Resource requests -------------------------------------------------------

export const createRequest = async ({ userId, title, description, context }, db = query) => {
  const { rows } = await db(
    `INSERT INTO user_resource_requests (user_id, title, description, context)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, title, description ?? null, context ?? null],
  );
  return rows[0];
};

export const listRequestsByUser = async (userId, db = query) => {
  const { rows } = await db(
    'SELECT * FROM user_resource_requests WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows;
};

export const listAllRequests = async ({ status } = {}, db = query) => {
  if (status) {
    const { rows } = await db(
      'SELECT * FROM user_resource_requests WHERE status = $1 ORDER BY created_at DESC',
      [status],
    );
    return rows;
  }
  const { rows } = await db('SELECT * FROM user_resource_requests ORDER BY created_at DESC');
  return rows;
};

export const updateRequestStatus = async (id, status, db = query) => {
  const { rows } = await db(
    `UPDATE user_resource_requests SET status = $2, updated_at = now()
      WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] ?? null;
};

export default {
  listSavedResourceIds,
  saveResource,
  unsaveResource,
  createRequest,
  listRequestsByUser,
  listAllRequests,
  updateRequestStatus,
};
