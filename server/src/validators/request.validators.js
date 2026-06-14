import { z } from 'zod';

/** "Request a Resource" form body. */
export const createRequestBody = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  context: z.string().trim().max(2000).optional(),
});

/** Management status update. */
export const updateRequestStatusBody = z.object({
  status: z.enum(['open', 'fulfilled', 'rejected']),
});

export const listRequestsQuery = z.object({
  status: z.enum(['open', 'fulfilled', 'rejected']).optional(),
});

export default { createRequestBody, updateRequestStatusBody, listRequestsQuery };
