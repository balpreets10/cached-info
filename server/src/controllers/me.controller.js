import userActivityService from '../services/userActivity.service.js';
import resourceService from '../services/resource.service.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Handlers for the authenticated user's own data (/api/me/*). */

export const listSaved = asyncHandler(async (req, res) => {
  const data = await userActivityService.listSaved(req.user.id);
  res.json({ data });
});

export const save = asyncHandler(async (req, res) => {
  await userActivityService.save(req.user.id, req.params.resourceId);
  res.status(201).json({ data: { ok: true } });
});

export const unsave = asyncHandler(async (req, res) => {
  await userActivityService.unsave(req.user.id, req.params.resourceId);
  res.status(204).end();
});

export const listSubmissions = asyncHandler(async (req, res) => {
  const data = await resourceService.listMySubmissions(req.user.id);
  res.json({ data });
});

export const createRequest = asyncHandler(async (req, res) => {
  const data = await userActivityService.createRequest(req.user.id, req.body);
  res.status(201).json({ data });
});

export const listRequests = asyncHandler(async (req, res) => {
  const data = await userActivityService.listMyRequests(req.user.id);
  res.json({ data });
});

export default { listSaved, save, unsave, listSubmissions, createRequest, listRequests };
