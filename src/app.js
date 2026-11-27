const express = require("express");
const requestIdMiddleware = require("./middlewares/requestId");
const { requestLoggerMiddleware } = require("./middlewares/logger");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");
const { router: fitnessRouter } = require("./routes/fitnessRoutes");

function createApp(options = {}) {
  const app = express();

  // 1. JSON parsing middleware
  app.use(express.json({ limit: "1mb" }));

  // 2. Custom Middleware 1: Request ID generation & propagation
  app.use(requestIdMiddleware);

  // 3. Custom Middleware 2: Structured Request Logging with correlated req.id
  app.use(requestLoggerMiddleware({ silent: options.silentLogger || false }));

  // 4. Fitness Coaching App Routes (Day 4 Context)
  app.use("/api/v1/fitness", fitnessRouter);

  // 5. Preserved Legacy Monitoring Routes (Day 1-2 Context)
  let thresholds = {
    latency_threshold_ms: 500,
    error_rate_threshold_percent: 5,
    enabled: true,
  };

  const metrics = [
    { timestamp: new Date().toISOString(), latency_ms: 120, error_rate_percent: 1.2 },
    { timestamp: new Date().toISOString(), latency_ms: 180, error_rate_percent: 2 },
  ];

  app.get("/api/v1/monitoring/summary", (req, res) => {
    res.json({
      service: "payment-api",
      status: "healthy",
      latency_ms: { average: 150, p95: 180 },
      error_rate_percent: 1.6,
      total_requests: 1000,
      requestId: req.id,
    });
  });

  app.get("/api/v1/monitoring/metrics", (req, res) => {
    const window = req.query.window || "1h";
    if (!["15m", "1h", "24h"].includes(window)) {
      return res.status(400).json({ error: "Invalid window", requestId: req.id });
    }
    res.json({ window, metrics, requestId: req.id });
  });

  app.get("/api/v1/alerts/thresholds", (req, res) => {
    res.json({ ...thresholds, requestId: req.id });
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), requestId: req.id });
  });

  // 6. 404 Not Found Middleware
  app.use(notFoundHandler);

  // 7. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
