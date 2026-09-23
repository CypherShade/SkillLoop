const ApiError = require('../utils/ApiError');

// Validates req[source] against a zod schema and replaces it with the parsed (coerced, trimmed) value.
// Errors come back as { field: message } so the client can show them next to the inputs.
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_form';
        if (!fields[key]) fields[key] = issue.message;
      }
      return next(new ApiError(422, 'Please fix the highlighted fields', 'VALIDATION_ERROR', fields));
    }
    // Express 5 exposes req.query as a getter, so parsed query values are stored separately.
    if (source === 'query') req.validQuery = result.data;
    else req[source] = result.data;
    next();
  };

module.exports = validate;
