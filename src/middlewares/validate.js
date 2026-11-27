const { ValidationError } = require("../errors/AppError");

/**
 * Reusable Express Input Validation Middleware
 * Validates req.body, req.query, and/or req.params against Zod schemas.
 *
 * @param {Object} schemas
 * @param {import('zod').ZodTypeAny} [schemas.body] - Schema for req.body
 * @param {import('zod').ZodTypeAny} [schemas.query] - Schema for req.query
 * @param {import('zod').ZodTypeAny} [schemas.params] - Schema for req.params
 * @returns {import('express').RequestHandler}
 */
function validate(schemas = {}) {
  return async function (req, res, next) {
    const errorDetails = [];

    // Validate request body
    if (schemas.body) {
      const result = await schemas.body.safeParseAsync(req.body);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errorDetails.push({
            location: "body",
            field: issue.path.join(".") || "body",
            message: issue.message,
            code: issue.code,
          });
        });
      } else {
        req.body = result.data;
      }
    }

    // Validate query parameters
    if (schemas.query) {
      const result = await schemas.query.safeParseAsync(req.query);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errorDetails.push({
            location: "query",
            field: issue.path.join(".") || "query",
            message: issue.message,
            code: issue.code,
          });
        });
      } else {
        req.query = result.data;
      }
    }

    // Validate URL path parameters
    if (schemas.params) {
      const result = await schemas.params.safeParseAsync(req.params);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errorDetails.push({
            location: "params",
            field: issue.path.join(".") || "params",
            message: issue.message,
            code: issue.code,
          });
        });
      } else {
        req.params = result.data;
      }
    }

    if (errorDetails.length > 0) {
      return next(
        new ValidationError("Validation failed for incoming request data", errorDetails)
      );
    }

    next();
  };
}

module.exports = validate;
