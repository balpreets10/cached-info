import resourceService from '../services/resource.service.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Public + student + management resource handlers. */

export const listApproved = asyncHandler(async (req, res) => {
  const result = await resourceService.listApproved(req.query);
  res.json(result); // { data, meta }
});

export const getApproved = asyncHandler(async (req, res) => {
  const data = await resourceService.getApprovedById(req.params.id);
  res.json({ data });
});

export const search = asyncHandler(async (req, res) => {
  const data = await resourceService.search(req.query);
  res.json({ data });
});

export const submit = asyncHandler(async (req, res) => {
  const data = await resourceService.submit(req.body, req.user.id);
  res.status(201).json({ data });
});

// --- Management ---
export const adminCreate = asyncHandler(async (req, res) => {
  const data = await resourceService.adminCreate(req.body, req.user.id);
  res.status(201).json({ data });
});

export const adminUpdate = asyncHandler(async (req, res) => {
  const data = await resourceService.adminUpdate(req.params.id, req.body);
  res.json({ data });
});

export const setApproval = asyncHandler(async (req, res) => {
  const data = await resourceService.setApproval(req.params.id, req.body.isApproved, req.user.id);
  res.json({ data });
});

export const remove = asyncHandler(async (req, res) => {
  await resourceService.remove(req.params.id);
  res.status(204).end();
});

export const listPending = asyncHandler(async (req, res) => {
  const result = await resourceService.listPending(req.query);
  res.json(result);
});

export default {
  listApproved,
  getApproved,
  search,
  submit,
  adminCreate,
  adminUpdate,
  setApproval,
  remove,
  listPending,
};
