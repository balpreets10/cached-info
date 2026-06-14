import userActivityRepository from '../repositories/userActivity.repository.js';
import resourceRepository from '../repositories/resource.repository.js';
import resourceService from './resource.service.js';
import ApiError from '../utils/ApiError.js';

/**
 * Saved resources + resource requests business logic.
 */

export async function listSaved(userId) {
  const ids = await userActivityRepository.listSavedResourceIds(userId);
  // Resolve each id to a serialized resource (skip any that were deleted).
  const resolved = await Promise.all(ids.map((id) => resourceRepository.getById(id)));
  return resolved.filter(Boolean).map(resourceService.serialize);
}

export async function save(userId, resourceId) {
  const resource = await resourceRepository.getById(resourceId);
  if (!resource) throw ApiError.notFound('Resource not found');
  await userActivityRepository.saveResource(userId, resourceId);
}

export async function unsave(userId, resourceId) {
  await userActivityRepository.unsaveResource(userId, resourceId);
}

export const createRequest = (userId, data) =>
  userActivityRepository.createRequest({ userId, ...data });

export const listMyRequests = (userId) => userActivityRepository.listRequestsByUser(userId);

export const listAllRequests = (opts) => userActivityRepository.listAllRequests(opts);

export async function updateRequestStatus(id, status) {
  const row = await userActivityRepository.updateRequestStatus(id, status);
  if (!row) throw ApiError.notFound('Request not found');
  return row;
}

export default {
  listSaved,
  save,
  unsave,
  createRequest,
  listMyRequests,
  listAllRequests,
  updateRequestStatus,
};
