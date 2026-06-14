import rateLimit from 'express-rate-limit';

/**
 * Limiter for sensitive auth endpoints (login, refresh, logout). Keeps brute
 * force and token-refresh abuse in check. Disabled in the test env so the
 * suite isn't throttled.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, try again later.' } },
});

export default authLimiter;
