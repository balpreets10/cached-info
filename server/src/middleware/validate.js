/**
 * Validation middleware factory. Pass a Zod schema describing any of body /
 * query / params; the matching parts of the request are parsed and REPLACED
 * with the typed, coerced result. A failed parse throws a ZodError, which the
 * central errorHandler converts into a 400 with field-level details.
 *
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 * @returns Express middleware
 *
 * @example
 *   router.post('/', validate({ body: createResourceSchema }), controller.create);
 */
export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body);
    next();
  } catch (err) {
    next(err); // ZodError -> handled centrally
  }
};

export default validate;
