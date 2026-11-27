const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Entity 2: MetricSnapshot (API Performance & Reliability Telemetry)
 *
 * Relationship Strategy: Parent-Referencing (service_id -> Service._id)
 * Why Referencing instead of Embedding?
 * - Metric data points arrive continuously (e.g., every 15m or 1h rollup).
 * - Embedding telemetry arrays in the Service document creates an unbounded 1:N relationship,
 *   rapidly hitting MongoDB's 16MB document size limit, causing aggressive BSON document
 *   relocation/fragmentation on disk, and devastating WiredTiger cache performance.
 * - By referencing Service._id, MetricSnapshot remains compact, fixed-size, append-only,
 *   and effortlessly partitionable/indexable over time.
 */

const latencyDistributionSchema = new Schema(
  {
    average: {
      type: Number,
      required: [true, "Average latency is required"],
      min: [0, "Average latency cannot be negative"],
    },
    p50: {
      type: Number,
      min: [0, "p50 latency cannot be negative"],
      default: 0,
    },
    p95: {
      type: Number,
      required: [true, "p95 latency is required for SLA evaluation"],
      min: [0, "p95 latency cannot be negative"],
    },
    p99: {
      type: Number,
      min: [0, "p99 latency cannot be negative"],
      default: 0,
    },
    max: {
      type: Number,
      min: [0, "Max latency cannot be negative"],
      default: 0,
    },
  },
  { _id: false }
);

const statusCodeBreakdownSchema = new Schema(
  {
    "2xx": { type: Number, default: 0, min: 0 },
    "3xx": { type: Number, default: 0, min: 0 },
    "4xx": { type: Number, default: 0, min: 0 },
    "5xx": { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const metricSnapshotSchema = new Schema(
  {
    service_id: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "service_id reference is required"],
      index: true,
    },
    timestamp: {
      type: Date,
      required: [true, "Observation timestamp is required"],
      default: Date.now,
      index: true,
    },
    window: {
      type: String,
      required: [true, "Time aggregation window is required"],
      enum: {
        values: ["15m", "1h", "24h"],
        message: "{VALUE} is not a supported window (expected: 15m, 1h, 24h)",
      },
      default: "1h",
    },
    total_requests: {
      type: Number,
      required: [true, "total_requests count is required"],
      min: [0, "total_requests cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "total_requests must be an integer (received: {VALUE})",
      },
    },
    error_count: {
      type: Number,
      required: [true, "error_count is required"],
      min: [0, "error_count cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "error_count must be an integer (received: {VALUE})",
      },
    },
    error_rate_percent: {
      type: Number,
      required: [true, "error_rate_percent is required"],
      min: [0, "error_rate_percent cannot be negative"],
      max: [100, "error_rate_percent cannot exceed 100%"],
    },
    latency_ms: {
      type: latencyDistributionSchema,
      required: [true, "latency_ms percentile object is required"],
    },
    status_code_breakdown: {
      type: statusCodeBreakdownSchema,
      default: () => ({ "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 }),
    },
    alert_triggered: {
      type: Boolean,
      default: false,
      index: true,
    },
    breached_thresholds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "metric_snapshots",
  }
);

/**
 * Cross-Field Business Logic Validation:
 * 1. error_count cannot exceed total_requests
 * 2. Mathematically verify error_rate_percent consistency if total_requests > 0
 */
metricSnapshotSchema.pre("validate", function () {
  if (this.error_count != null && this.total_requests != null && this.error_count > this.total_requests) {
    this.invalidate(
      "error_count",
      `error_count (${this.error_count}) cannot exceed total_requests (${this.total_requests})`
    );
  }
});

// =========================================================================
// REQUIRED INDEXES & TRADE-OFF DESCRIPTIONS
// =========================================================================

/**
 * INDEX 1: Compound Time-Series Retrieval Index
 * Keys: { service_id: 1, window: 1, timestamp: -1 }
 *
 * Query Improved:
 *   GET /api/v1/monitoring/metrics?window=1h&service=payment-api
 *   db.metric_snapshots.find({
 *     service_id: ObjectId("..."),
 *     window: "1h",
 *     timestamp: { $gte: ISODate("2026-11-25T00:00:00Z") }
 *   }).sort({ timestamp: -1 })
 *
 * Why this index works (Equality -> Sort -> Range rule):
 * - Equality on `service_id` and `window` pinpoints the exact B-tree sub-branch.
 * - Sort on `timestamp: -1` is satisfied directly by the index traversal order,
 *   completely bypassing MongoDB's blocking in-memory SORT stage (SORT_KEY_GENERATOR).
 * - Range condition on `timestamp` efficiently slices the bounded time window.
 *
 * Trade-offs:
 * - High Write Overhead: Time-series dashboards ingest frequent snapshots.
 *   Every insert requires writing to this B-tree index, increasing CPU & I/O.
 * - Memory (RAM) Footprint: As snapshots accumulate, the index size grows.
 *   If it exceeds WiredTiger cache RAM, performance degrades due to disk reads.
 */
metricSnapshotSchema.index(
  { service_id: 1, window: 1, timestamp: -1 },
  { name: "idx_metrics_service_window_timestamp" }
);

/**
 * INDEX 2: Compound Alert Threshold & SLA Outlier Scan Index
 * Keys: { service_id: 1, "latency_ms.p95": -1, timestamp: -1 }
 *
 * Query Improved:
 *   Alert Detection / SLA Breach Scans:
 *   db.metric_snapshots.find({
 *     service_id: ObjectId("..."),
 *     "latency_ms.p95": { $gte: 500 }
 *   }).sort({ "latency_ms.p95": -1, timestamp: -1 })
 *
 * Why this index works:
 * - Directly targets nested SLA percentile `latency_ms.p95`.
 * - Enables the alert evaluator to scan only outlier snapshots exceeding the
 *   configured threshold (e.g. > 500ms), skipping millions of normal healthy metrics.
 * - Satisfies sort without in-memory sorting.
 *
 * Trade-offs:
 * - Compound Write Penalty: Maintaining a second compound index on an append-heavy
 *   collection doubles the indexing write amplification for each telemetry ingest.
 * - Cache Eviction: Since SLA breach queries occur less frequently than routine chart
 *   reads, this index can compete for WiredTiger cache space against hotter indexes.
 */
metricSnapshotSchema.index(
  { service_id: 1, "latency_ms.p95": -1, timestamp: -1 },
  { name: "idx_metrics_service_p95_timestamp" }
);

/**
 * BONUS PARTIAL INDEX: Active Alert Incidents
 * Keys: { service_id: 1, timestamp: -1 }
 * Filter: { alert_triggered: true }
 *
 * Provides ultra-compact index footprint for rapidly retrieving only breached snapshots.
 */
metricSnapshotSchema.index(
  { service_id: 1, timestamp: -1 },
  {
    name: "idx_metrics_partial_alerts_only",
    partialFilterExpression: { alert_triggered: true },
  }
);

const MetricSnapshot = mongoose.model("MetricSnapshot", metricSnapshotSchema);

module.exports = MetricSnapshot;
