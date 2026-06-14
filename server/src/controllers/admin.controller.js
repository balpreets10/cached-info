import userActivityService from '../services/userActivity.service.js';
import adminUserService from '../services/adminUser.service.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Management-only handlers for users + resource requests triage. */

export const listUsers = asyncHandler(async (req, res) => {
  const data = await adminUserService.listUsers();
  res.json({ data });
});

export const setUserRoles = asyncHandler(async (req, res) => {
  const data = await adminUserService.setUserRoles(req.params.id, req.body.roles);
  res.json({ data });
});

export const listRequests = asyncHandler(async (req, res) => {
  const data = await userActivityService.listAllRequests({ status: req.query.status });
  res.json({ data });
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const data = await userActivityService.updateRequestStatus(req.params.id, req.body.status);
  res.json({ data });
});

export default { listUsers, setUserRoles, listRequests, updateRequestStatus };
