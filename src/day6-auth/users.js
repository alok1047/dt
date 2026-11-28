const bcrypt = require("bcryptjs");

/**
 * Public Transport Companion - User Repository & Password Hashing
 * Context: Authentication & Authorization for Commuters, Operators, and Admins
 *
 * Password Security:
 * - Uses bcrypt with 10 salt rounds to defend against offline rainbow-table and brute-force attacks.
 * - Passwords are NEVER stored in plaintext.
 */

const SALT_ROUNDS = 10;

// Pre-computed hashes for default seed users (password for all seed accounts: "TransitPass2026!")
const SEED_PASSWORD = "TransitPass2026!";
const SEED_PASSWORD_HASH = bcrypt.hashSync(SEED_PASSWORD, SALT_ROUNDS);

const USERS = [
  {
    id: "usr_alice",
    name: "Alice Commuter",
    email: "alice@commuter.transit",
    passwordHash: SEED_PASSWORD_HASH,
    role: "commuter", // Commuter role: can search routes, view disruptions, manage personal favorites
    favoriteRoutes: ["subway_line_1_red", "express_bus_42"],
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "usr_bob",
    name: "Bob Commuter",
    email: "bob@commuter.transit",
    passwordHash: SEED_PASSWORD_HASH,
    role: "commuter",
    favoriteRoutes: ["tram_line_7_green"],
    createdAt: "2026-02-10T09:30:00Z",
  },
  {
    id: "usr_dan",
    name: "Dan Dispatcher",
    email: "dan@metro.transit",
    passwordHash: SEED_PASSWORD_HASH,
    role: "operator", // Transit Operator: can publish and update real-time service disruption notices
    badgeNumber: "DISP-4091",
    department: "Rail Operations Command",
    createdAt: "2025-11-01T07:00:00Z",
  },
  {
    id: "usr_sarah",
    name: "Sarah SuperAdmin",
    email: "sarah@transitauthority.gov",
    passwordHash: SEED_PASSWORD_HASH,
    role: "admin", // Admin: full system override & user management
    createdAt: "2025-08-01T00:00:00Z",
  },
];

function findUserByEmail(email) {
  if (!email) return null;
  return USERS.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

function findUserById(id) {
  if (!id) return null;
  return USERS.find((u) => u.id === id) || null;
}

function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compareSync(plainPassword, passwordHash);
}

function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

function updateUserFavorites(userId, favoriteRoutes) {
  const user = findUserById(userId);
  if (!user) return null;
  user.favoriteRoutes = favoriteRoutes;
  return user;
}

module.exports = {
  USERS,
  SEED_PASSWORD,
  findUserByEmail,
  findUserById,
  verifyPassword,
  hashPassword,
  updateUserFavorites,
};
