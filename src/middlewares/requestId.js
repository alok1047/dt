const crypto = require("crypto");

/**
 * Custom Middleware: Request ID
 * - Reads existing 'X-Request-ID' from incoming request for distributed tracing
 * - Or generates a unique RFC 4122 v4 UUID with 'req_' prefix
 * - Attaches req.id and sets 'X-Request-ID' response header
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers["x-request-id"];
  const requestId =
    typeof incomingId === "string" && incomingId.trim().length > 0
      ? incomingId.trim()
      : `req_${crypto.randomUUID()}`;

  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
}

module.exports = requestIdMiddleware;
