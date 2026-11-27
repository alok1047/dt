const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Subdocument Schema: AlertThresholdSchema
 * Embedded within Service because:
 * 1. Cardinality is 1:1 (or 1:few per service).
 * 2. It is always accessed along with the service summary/health check.
 * 3. Atomic updates avoid distributed multi-document transaction overhead.
 */
const alertThresholdSchema = new Schema(
  {
    latency_threshold_ms: {
      type: Number,
      required: [true, "Latency threshold in milliseconds is required"],
      min: [1, "Latency threshold must be a positive integer (> 0 ms)"],
      validate: {
        validator: Number.isInteger,
        message: "Latency threshold must be an integer (received: {VALUE} ms)",
      },
    },
    error_rate_threshold_percent: {
      type: Number,
      required: [true, "Error rate threshold percentage is required"],
      min: [0, "Error rate threshold cannot be negative"],
      max: [100, "Error rate threshold cannot exceed 100%"],
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true,
    },
    evaluation_window: {
      type: String,
      enum: {
        values: ["1m", "5m", "15m", "1h"],
        message: "{VALUE} is not a valid evaluation window",
      },
      default: "5m",
    },
    notification_channels: {
      type: [String],
      default: ["slack-alerts", "email"],
    },
  },
  { _id: false }
);

/**
 * Entity 1: Service (Monitored API Service)
 * Represents a registered API/microservice being monitored (e.g. payment-api, auth-api).
 */
const serviceSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      lowercase: true,
      minlength: [2, "Service name must be at least 2 characters"],
      maxlength: [50, "Service name cannot exceed 50 characters"],
      match: [
        /^[a-z0-9-_]+$/,
        "Service name can only contain lowercase letters, numbers, hyphens, and underscores",
      ],
    },
    environment: {
      type: String,
      enum: {
        values: ["production", "staging", "development"],
        message: "{VALUE} is not a supported environment",
      },
      default: "production",
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ["healthy", "degraded", "down"],
        message: "{VALUE} is not a valid service status",
      },
      default: "healthy",
      required: true,
    },
    alert_thresholds: {
      type: alertThresholdSchema,
      required: [true, "Alert threshold configuration is required for monitoring"],
    },
    metadata: {
      team: { type: String, default: "platform-engineering" },
      repository: { type: String, trim: true },
      version: { type: String, default: "1.0.0" },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "services",
  }
);

// Enforce unique service name per environment
serviceSchema.index(
  { name: 1, environment: 1 },
  { unique: true, name: "idx_services_name_environment_unique" }
);

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
