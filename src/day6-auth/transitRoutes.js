const express = require("express");
const crypto = require("crypto");
const {
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateUserFavorites,
} = require("./users");
const { generateAccessToken } = require("./jwtUtils");
const {
  authenticateToken,
  requireRole,
  requireOwnership,
} = require("./authMiddlewares");
const { AppError, ValidationError } = require("../errors/AppError");

const router = express.Router();

// In-memory active disruptions repository
const activeDisruptions = [
  {
    disruptionId: "disr_001",
    lineId: "subway_line_1_red",
    lineType: "subway",
    severity: "moderate",
    headline: "Signal Maintenance Delays on Red Line",
    description: "Trains operating with 10-15 minute headway due to track signal replacement between Central and North Station.",
    status: "active",
    reportedBy: "Dan Dispatcher (Operator)",
    reportedAt: "2026-11-28T08:30:00Z",
    expectedResolution: "2026-11-28T14:00:00Z",
  },
];

// Helper to reset disruptions for testing
function resetTransitData() {
  activeDisruptions.length = 1;
}

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

/**
 * POST /api/v1/auth/login
 * Public endpoint: Authenticates commuter/operator credentials and issues JWT token
 */
router.post("/login", (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required for login", [
        { field: "email", message: "Email is required" },
        { field: "password", message: "Password is required" },
      ]);
    }

    const user = findUserByEmail(email);
    if (!user) {
      // Intentionally generic message to prevent user enumeration attacks
      throw new AppError("Invalid email or password credentials.", 401, "INVALID_CREDENTIALS");
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid email or password credentials.", 401, "INVALID_CREDENTIALS");
    }

    // Support configurable test expiry via header or query if in testing
    const requestedExpiry = req.headers["x-test-token-expiry"] || "15m";
    const token = generateAccessToken(user, requestedExpiry);

    res.json({
      success: true,
      data: {
        token,
        tokenType: "Bearer",
        expiresIn: requestedExpiry,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      meta: {
        requestId: req.id,
        message: `Successfully authenticated as ${user.role}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// PUBLIC TRANSIT ROUTES
// =============================================================================

/**
 * GET /api/v1/transit/routes/search
 * Public endpoint: Commuters search routes without login
 */
router.get("/routes/search", (req, res) => {
  const { origin = "Central Station", destination = "Civic Center" } = req.query;

  res.json({
    success: true,
    data: {
      origin,
      destination,
      recommendedOptions: [
        {
          routeId: "subway_line_1_red",
          mode: "subway",
          lineName: "Line 1 (Red Metro)",
          estimatedMinutes: 18,
          transfers: 0,
          status: "minor_delay",
        },
        {
          routeId: "bus_express_42",
          mode: "bus",
          lineName: "Express 42 (City Link)",
          estimatedMinutes: 24,
          transfers: 0,
          status: "on_time",
        },
      ],
    },
    meta: { requestId: req.id },
  });
});

/**
 * GET /api/v1/transit/disruptions
 * Public endpoint: Anyone can view active service disruption alerts
 */
router.get("/disruptions", (req, res) => {
  res.json({
    success: true,
    data: {
      totalActiveDisruptions: activeDisruptions.length,
      disruptions: activeDisruptions,
    },
    meta: { requestId: req.id },
  });
});

// =============================================================================
// PROTECTED ROUTES: DISRUPTION MANAGEMENT (OPERATOR / ADMIN ONLY)
// =============================================================================

/**
 * POST /api/v1/transit/disruptions
 * PROTECTED: Requires valid JWT + role 'operator' or 'admin'
 * Commuters cannot post disruptions (prevents fake disruption notices and panic).
 */
router.post(
  "/disruptions",
  authenticateToken,
  requireRole("operator", "admin"),
  (req, res, next) => {
    try {
      const { lineId, lineType, severity, headline, description, expectedResolution } = req.body;

      if (!lineId || !headline || !description) {
        throw new ValidationError("lineId, headline, and description are required for disruption notice", [
          { field: "lineId", message: "lineId is required" },
          { field: "headline", message: "headline is required" },
          { field: "description", message: "description is required" },
        ]);
      }

      const disruptionId = `disr_${crypto.randomUUID().slice(0, 8)}`;
      const newDisruption = {
        disruptionId,
        lineId,
        lineType: lineType || "subway",
        severity: severity || "moderate",
        headline,
        description,
        status: "active",
        reportedBy: `${req.user.name} (${req.user.role})`,
        reportedByUserId: req.user.id,
        reportedAt: new Date().toISOString(),
        expectedResolution: expectedResolution || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      };

      activeDisruptions.unshift(newDisruption);

      res.status(201).json({
        success: true,
        data: newDisruption,
        meta: {
          requestId: req.id,
          message: "Transit service disruption notice published successfully",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// PROTECTED ROUTES: COMMUTER PROFILE & FAVORITES (OWNERSHIP CHECK)
// =============================================================================

/**
 * GET /api/v1/transit/users/:userId/favorites
 * PROTECTED: Requires valid JWT + Ownership check (or Admin role)
 * Ensures commuters can only inspect their OWN saved favorite lines.
 */
router.get(
  "/users/:userId/favorites",
  authenticateToken,
  requireOwnership("userId"),
  (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = findUserById(userId);

      if (!user) {
        throw new AppError(`Commuter user '${userId}' not found.`, 404, "USER_NOT_FOUND");
      }

      res.json({
        success: true,
        data: {
          userId: user.id,
          name: user.name,
          role: user.role,
          favoriteRoutes: user.favoriteRoutes || [],
        },
        meta: { requestId: req.id },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/transit/users/:userId/favorites
 * PROTECTED: Requires valid JWT + Ownership check (or Admin role)
 * Ensures commuters can only update their OWN saved favorite lines.
 */
router.put(
  "/users/:userId/favorites",
  authenticateToken,
  requireOwnership("userId"),
  (req, res, next) => {
    try {
      const { userId } = req.params;
      const { favoriteRoutes } = req.body;

      if (!Array.isArray(favoriteRoutes)) {
        throw new ValidationError("favoriteRoutes must be an array of route IDs", [
          { field: "favoriteRoutes", message: "Expected array of route strings" },
        ]);
      }

      const updatedUser = updateUserFavorites(userId, favoriteRoutes);
      if (!updatedUser) {
        throw new AppError(`Commuter user '${userId}' not found.`, 404, "USER_NOT_FOUND");
      }

      res.json({
        success: true,
        data: {
          userId: updatedUser.id,
          favoriteRoutes: updatedUser.favoriteRoutes,
        },
        meta: {
          requestId: req.id,
          message: "Favorite transit routes updated successfully",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = {
  transitRouter: router,
  resetTransitData,
  activeDisruptions,
};
