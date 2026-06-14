/**
 * Wraps an async route handler so any rejected promise is forwarded to Express's
 * error pipeline (next(err)) instead of crashing or hanging the request. This
 * removes the need for try/catch in every controller.
 *
 * @param {(req, res, next) => Promise<unknown>} fn
 * @returns {(req, res, next) => void}
 *
 * @example
 *   router.get('/:id', asyncHandler(async (req, res) => {
 *     const item = await service.getById(req.params.id); // may throw ApiError
 *     res.json({ data: item });
 *   }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
