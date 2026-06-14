import { z } from 'zod';
import { ROLES } from '../auth/rbac.constants.js';

/** Replace a user's roles with this set (by name). */
export const setUserRolesBody = z.object({
  roles: z.array(z.enum(Object.values(ROLES))).min(1, 'At least one role is required'),
});

export default { setUserRolesBody };
