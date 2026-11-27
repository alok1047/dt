const { AppError, NotFoundError } = require("../errors/AppError");

/**
 * 404 Route Not Found Middleware
 * Intercepts unhandled routes and forwards a NotFoundError to the centralized handler.
 */
function notFoundHandler(req, res, next) {
  next(
    new NotFoundError(
      `Route '${req.method} ${req.originalUrl}' does not exist on this server`
    )
  );
}

/**
 * Centralized Express Error Handling Middleware
 * Must have 4 arguments (err, req, res, next) for Express to recognize it as an error handler.
 */
function errorHandler(err, req, res, next) {
  const requestId = req.id || "req_unknown";
  const timestamp = new Date().toISOString();

  // 1. Handle JSON syntax errors thrown by express.json()
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON payload received in request body",
        requestId,
        details: [
          {
            location: "body",
            field: "syntax",
            message: err.message,
          },
        ],
      },
      timestamp,
    });
  }

  // 2. Identify if it is an operational AppError or an untracked bug
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : err.status || 500;
  const errorCode = isAppError ? err.errorCode : "INTERNAL_SERVER_ERROR";
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred"
      : err.message || "An unexpected error occurred";

  // 3. Log the error details with correlated Request ID
  if (statusCode >= 500) {
    console.error(`[FATAL_ERR] [${requestId}] ${err.stack || err.message}`);
  } else if (process.env.NODE_ENV !== "test_quiet") {
    console.warn(
      `[OPERATIONAL_ERR] [${requestId}] ${errorCode} (${statusCode}): ${message}`
    );
  }

  // 4. Return standardized, uniform JSON contract
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      requestId,
      ...(err.details ? { details: err.details } : {}),
      ...(process.env.NODE_ENV === "development" && err.stack ? { stack: err.stack } : {}),
    },
    timestamp,
  };

  res.status(statusCode).json(errorResponse);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
