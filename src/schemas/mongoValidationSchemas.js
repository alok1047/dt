/**
 * MongoDB Collection-level JSON Schema Validators ($jsonSchema)
 * Provides database-enforced integrity independent of application-level ODM/ORM.
 *
 * Context: API Monitoring Dashboard (latency, error rate, and alert thresholds).
 */

const serviceJsonSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["name", "environment", "status", "alert_thresholds"],
    properties: {
      _id: { bsonType: "objectId" },
      name: {
        bsonType: "string",
        pattern: "^[a-z0-9-_]+$",
        description: "Must be a lowercase alphanumeric string with hyphens or underscores (e.g. payment-api)"
      },
      environment: {
        enum: ["production", "staging", "development"],
        description: "Deployment environment (production, staging, development)"
      },
      status: {
        enum: ["healthy", "degraded", "down"],
        description: "Current operational health status"
      },
      alert_thresholds: {
        bsonType: "object",
        required: ["latency_threshold_ms", "error_rate_threshold_percent", "enabled"],
        description: "Embedded SLA and alert configuration (1:1 / 1:few bounded relationship)",
        properties: {
          latency_threshold_ms: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 1,
            description: "Latency threshold in milliseconds; must be a strictly positive number (> 0)"
          },
          error_rate_threshold_percent: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 0,
            maximum: 100,
            description: "Error rate threshold percentage; must be between 0 and 100 inclusive"
          },
          enabled: {
            bsonType: "bool",
            description: "Flag indicating whether active alerting is enabled for this service"
          },
          evaluation_window: {
            enum: ["1m", "5m", "15m", "1h"],
            description: "Time window for evaluating alert conditions"
          },
          notification_channels: {
            bsonType: "array",
            items: { bsonType: "string" },
            description: "Alert dispatch destinations (e.g., ['slack-devops', 'pagerduty-oncall'])"
          }
        }
      },
      metadata: {
        bsonType: "object",
        description: "Optional metadata such as team owner, repo URL, or tier"
      },
      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" }
    }
  }
};

const metricSnapshotJsonSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "service_id",
      "timestamp",
      "window",
      "total_requests",
      "error_count",
      "error_rate_percent",
      "latency_ms"
    ],
    properties: {
      _id: { bsonType: "objectId" },
      service_id: {
        bsonType: "objectId",
        description: "Foreign reference to the parent Service._id (Parent-Referencing Strategy)"
      },
      timestamp: {
        bsonType: "date",
        description: "Observation or rollup end timestamp (required for time-series range queries)"
      },
      window: {
        enum: ["15m", "1h", "24h"],
        description: "Metric aggregation window matching API query parameters"
      },
      total_requests: {
        bsonType: ["int", "double", "long", "number"],
        minimum: 0,
        description: "Total incoming HTTP requests handled during this window"
      },
      error_count: {
        bsonType: ["int", "double", "long", "number"],
        minimum: 0,
        description: "Total 4xx/5xx error responses during this window"
      },
      error_rate_percent: {
        bsonType: ["int", "double", "long", "number"],
        minimum: 0,
        maximum: 100,
        description: "Error rate percentage bounded between 0 and 100"
      },
      latency_ms: {
        bsonType: "object",
        required: ["average", "p95"],
        description: "Latency distribution percentiles in milliseconds",
        properties: {
          average: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 0,
            description: "Average latency (ms)"
          },
          p50: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 0,
            description: "Median (50th percentile) latency (ms)"
          },
          p95: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 0,
            description: "95th percentile latency (ms); primary SLA metric"
          },
          p99: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 0,
            description: "99th percentile tail latency (ms)"
          },
          max: {
            bsonType: ["int", "double", "long", "number"],
            minimum: 0,
            description: "Maximum observed latency (ms)"
          }
        }
      },
      status_code_breakdown: {
        bsonType: "object",
        description: "HTTP status code distribution counters (e.g. 2xx, 3xx, 4xx, 5xx)"
      },
      alert_triggered: {
        bsonType: "bool",
        description: "Flag indicating whether this snapshot breached the service alert thresholds"
      },
      breached_thresholds: {
        bsonType: "array",
        items: { bsonType: "string" },
        description: "List of breached rule identifiers (e.g., ['LATENCY_P95_EXCEEDED'])"
      }
    }
  }
};

module.exports = {
  serviceJsonSchema,
  metricSnapshotJsonSchema,
};
