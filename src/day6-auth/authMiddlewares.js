const { verifyAccessToken } = require("./jwtUtils");
const { AppError } = require("../errors/AppError");

/**
 * Authentication Middleware: authenticateToken
 * Extracts and cryptographically verifies JWT Access Token from Authorization Header.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return next(
      new AppError(
        "Authentication required. Missing 'Authorization: Bearer <token>' header.",
        401,
        "TOKEN_REQUIRED"
      )
    );
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return next(
      new AppError(
        "Invalid Authorization header format. Expected 'Bearer <token>'.",
        401,
        "INVALID_AUTH_FORMAT"
      )
    );
  }

  const token = parts[1];

  try {
    const decoded = verifyAccessToken(token);

    // Normalize user identity
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(
        new AppError(
          "Access token has expired. Please log in again to acquire a fresh token.",
          401,
          "TOKEN_EXPIRED",
          { expiredAt: err.expiredAt }
        )
      );
    }

    if (err.name === "JsonWebTokenError") {
      return next(
        new AppError(
          "Invalid or tampered access token signature.",
          401,
          "INVALID_TOKEN"
        )
      );
    }

    return next(new AppError("Authentication failed.", 401, "AUTH_FAILED"));
  }
}

/**
 * Authorization Middleware: requireRole
 * Role-Based Access Control (RBAC). Restricts routes to specified roles.
 *
 * @param  {...string} allowedRoles - E.g. 'operator', 'admin'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("User is not authenticated.", 401, "TOKEN_REQUIRED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden. This action requires one of the following roles: [${allowedRoles.join(
            ", "
          )}]. Current user role: '${req.user.role}'.`,
          403,
          "FORBIDDEN_ROLE",
          {
            userRole: req.user.role,
            requiredRoles: allowedRoles,
          }
        )
      );
    }

    next();
  };
}

/**
 * Authorization Middleware: requireOwnership
 * Resource-Based Ownership Check.
 * Ensures users can only access or modify their OWN resources.
 * (Admins can bypass ownership checks for support/auditing).
 *
 * @param {string} [paramKey="userId"] - The route param containing the target user ID
 */
function requireOwnership(paramKey = "userId") {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("User is not authenticated.", 401, "TOKEN_REQUIRED"));
    }

    const targetUserId = req.params[paramKey];

    // Ownership check: User ID in token MUST match target user ID (unless Admin)
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return next(
        new AppError(
          `Access forbidden. You do not have permission to view or modify another commuter's private travel data.`,
          403,
          "FORBIDDEN_OWNERSHIP",
          {
            authenticatedUser: req.user.id,
            targetResourceOwner: targetUserId,
          }
        )
      );
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
};
