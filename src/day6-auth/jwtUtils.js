const jwt = require("jsonwebtoken");

/**
 * JWT Token Utilities for Public Transport Companion
 *
 * Secret Handling Rule:
 * - In production, JWT_SECRET MUST be provided via secure environment variables.
 * - Never commit raw production secrets to version control.
 */
const JWT_SECRET =
  process.env.JWT_SECRET || "public_transport_companion_dev_secret_2026_do_not_commit_in_prod";

const DEFAULT_EXPIRY = "15m"; // 15-minute short-lived access token

/**
 * Generates signed JWT Access Token with commuter/operator claims
 * @param {Object} user
 * @param {string|number} [expiresIn]
 * @returns {string} Signed JWT
 */
function generateAccessToken(user, expiresIn = DEFAULT_EXPIRY) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: "public-transport-companion-auth",
    audience: "public-transport-companion-api",
  });
}

/**
 * Verifies JWT token and decodes claims
 * @param {string} token
 * @returns {Object} Decoded payload
 */
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: "public-transport-companion-auth",
    audience: "public-transport-companion-api",
  });
}

module.exports = {
  JWT_SECRET,
  DEFAULT_EXPIRY,
  generateAccessToken,
  verifyAccessToken,
};
