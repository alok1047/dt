# Day 3 – MongoDB Schemas, Validation & Indexes

## Context: API Monitoring Dashboard
An API monitoring system tracking API health, latency percentiles (`average`, `p50`, `p95`, `p99`, `max`), error rate percentages, and automated SLA alert thresholds for microservices (such as `payment-api`).

---

## 1. Two Related Entities & Schemas

### Entity 1: `Service` (`services` collection)
Represents a monitored microservice or API target and its active alerting rules and SLA thresholds.

```javascript
// src/models/Service.js
const serviceSchema = new Schema({
  name: {
    type: String,
    required: [true, "Service name is required"],
    trim: true,
    lowercase: true,
    minlength: 2,
    maxlength: 50,
    match: [/^[a-z0-9-_]+$/, "Only lowercase alphanumeric characters, dashes, and underscores allowed"]
  },
  environment: {
    type: String,
    enum: ["production", "staging", "development"],
    default: "production",
    required: true
  },
  status: {
    type: String,
    enum: ["healthy", "degraded", "down"],
    default: "healthy",
    required: true
  },
  alert_thresholds: {
    latency_threshold_ms: {
      type: Number,
      required: true,
      min: [1, "Latency threshold must be a positive integer (> 0 ms)"],
      validate: { validator: Number.isInteger, message: "Must be an integer" }
    },
    error_rate_threshold_percent: {
      type: Number,
      required: true,
      min: [0, "Error rate cannot be negative"],
      max: [100, "Error rate cannot exceed 100%"]
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true
    },
    evaluation_window: {
      type: String,
      enum: ["1m", "5m", "15m", "1h"],
      default: "5m"
    },
    notification_channels: {
      type: [String],
      default: ["slack-alerts", "email"]
    }
  },
  metadata: {
    team: { type: String, default: "platform-engineering" },
    repository: { type: String, trim: true },
    version: { type: String, default: "1.0.0" }
  }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "services"
});

// Enforce unique service per environment
serviceSchema.index({ name: 1, environment: 1 }, { unique: true, name: "idx_services_name_environment_unique" });
```

---

### Entity 2: `MetricSnapshot` (`metric_snapshots` collection)
Represents periodic time-series performance rollups (e.g. 15m, 1h, 24h) for a specific monitored service.

```javascript
// src/models/MetricSnapshot.js
const metricSnapshotSchema = new Schema({
  service_id: {
    type: Schema.Types.ObjectId,
    ref: "Service",
    required: [true, "service_id reference is required"],
    index: true
  },
  timestamp: {
    type: Date,
    required: [true, "Observation timestamp is required"],
    default: Date.now,
    index: true
  },
  window: {
    type: String,
    required: true,
    enum: ["15m", "1h", "24h"],
    default: "1h"
  },
  total_requests: {
    type: Number,
    required: true,
    min: [0, "total_requests cannot be negative"],
    validate: { validator: Number.isInteger, message: "Must be an integer" }
  },
  error_count: {
    type: Number,
    required: true,
    min: [0, "error_count cannot be negative"],
    validate: { validator: Number.isInteger, message: "Must be an integer" }
  },
  error_rate_percent: {
    type: Number,
    required: true,
    min: [0, "error_rate cannot be negative"],
    max: [100, "error_rate cannot exceed 100%"]
  },
  latency_ms: {
    average: { type: Number, required: true, min: 0 },
    p50: { type: Number, min: 0, default: 0 },
    p95: { type: Number, required: true, min: 0 },
    p99: { type: Number, min: 0, default: 0 },
    max: { type: Number, min: 0, default: 0 }
  },
  status_code_breakdown: {
    "2xx": { type: Number, default: 0, min: 0 },
    "3xx": { type: Number, default: 0, min: 0 },
    "4xx": { type: Number, default: 0, min: 0 },
    "5xx": { type: Number, default: 0, min: 0 }
  },
  alert_triggered: {
    type: Boolean,
    default: false,
    index: true
  },
  breached_thresholds: {
    type: [String],
    default: []
  }
}, {
  timestamps: { createdAt: "created_at", updatedAt: false },
  collection: "metric_snapshots"
});

// Cross-field validation: error_count cannot exceed total_requests
metricSnapshotSchema.pre("validate", function () {
  if (this.error_count != null && this.total_requests != null && this.error_count > this.total_requests) {
    this.invalidate("error_count", `error_count (${this.error_count}) cannot exceed total_requests (${this.total_requests})`);
  }
});
```

---

## 2. Validation Strategy

Validation is implemented at two distinct layers:

1. **Application Layer (Mongoose ODM)**:
   - Type validation, enum checks (`["15m", "1h", "24h"]`, `["healthy", "degraded", "down"]`).
   - Range bounds: `latency_threshold_ms > 0`, `error_rate_threshold_percent` between `0` and `100`.
   - Positive integer validators on request counts and error counts.
   - Cross-field business validation: `error_count <= total_requests`.
   - String regex sanitization for service names (`/^[a-z0-9-_]+$/`).

2. **Database Engine Layer (Native MongoDB `$jsonSchema`)**:
   - Registered at the collection level via `db.createCollection(..., { validator: $jsonSchema })` (see [mongoValidationSchemas.js](file:///Users/alokagrahari/Downloads/DT/src/schemas/mongoValidationSchemas.js)).
   - Ensures strict database-level data integrity even for raw MongoDB drivers, direct CLI operations, or third-party background ingestion pipelines.

---

## 3. Relationship Strategy: Hybrid Embedding & Referencing

| Relationship | Design Pattern | Cardinality | Justification |
| :--- | :--- | :--- | :--- |
| **`Service` ➔ `alert_thresholds`** | **Embedding** (Subdocument) | 1 : 1 (or 1 : few bounded) | Alert thresholds are tightly coupled to the service definition and always read together with service status (`/api/v1/monitoring/summary`). Embedding eliminates expensive `$lookup` joins, guarantees single-document atomic updates (`PUT /api/v1/alerts/thresholds`), and has a negligible footprint (~100 bytes). |
| **`Service` ➔ `MetricSnapshot`** | **Parent-Referencing** (`service_id`) | 1 : N (Unbounded time-series) | A production API produces telemetry snapshots continuously (thousands to millions per month). Embedding metric records in the `Service` document would rapidly breach MongoDB's **16MB document size limit**, trigger aggressive BSON document relocation and disk fragmentation, degrade WiredTiger memory cache, and make time-window pagination slow and inefficient. Parent-referencing keeps metric documents small, append-only, and easily partitionable. |

---

## 4. Two Primary Indexes & Trade-off Analysis

### Index 1: Compound Time-Series Index
```javascript
db.metric_snapshots.createIndex(
  { service_id: 1, window: 1, timestamp: -1 },
  { name: "idx_metrics_service_window_timestamp" }
);
```

#### Query Improved:
Serves the primary dashboard metric API:
```javascript
// GET /api/v1/monitoring/metrics?window=1h&service=payment-api
db.metric_snapshots.find({
  service_id: ObjectId("6b071828148a93f8a81900fe"),
  window: "1h",
  timestamp: { $gte: ISODate("2026-11-18T00:00:00Z") }
}).sort({ timestamp: -1 });
```

#### Why it improves this query:
- Follows the **ESR (Equality, Sort, Range)** design rule:
  1. **Equality**: Direct hash seek on `service_id` and `window`.
  2. **Sort**: Reverse chronological ordering (`timestamp: -1`) is satisfied directly by the index B-tree walk. This completely avoids MongoDB's in-memory sort buffer (`SORT_KEY_GENERATOR`), preventing `Sort exceeded memory limit of 33554432 bytes` errors.
  3. **Range**: Slices the time interval efficiently with `$gte`.
- Execution plan switches from `COLLSCAN` + `SORT` to `FETCH` ➔ `IXSCAN`. Documents examined matches results returned (efficiency ratio: `1.00`).

#### Trade-off:
- **Write Overhead on High Ingestion**: Monitoring systems write metric snapshots at high velocity. Every single batch ingestion requires updating this index B-tree.
- **RAM Footprint**: As time-series data grows into millions of records, this index must reside in WiredTiger cache RAM to avoid disk paging.

---

### Index 2: Compound Alert Threshold & SLA Outlier Scan Index
```javascript
db.metric_snapshots.createIndex(
  { service_id: 1, "latency_ms.p95": -1, timestamp: -1 },
  { name: "idx_metrics_service_p95_timestamp" }
);
```

#### Query Improved:
Serves SLA monitoring, breach reporting, and alert threshold evaluation:
```javascript
// Scan for p95 latency spikes violating service threshold (> 500ms)
db.metric_snapshots.find({
  service_id: ObjectId("6b071828148a93f8a81900fe"),
  "latency_ms.p95": { $gte: 500 }
}).sort({ "latency_ms.p95": -1, timestamp: -1 });
```

#### Why it improves this query:
- Directly indexes the nested `latency_ms.p95` field.
- During SLA evaluations, it skips 98%+ of normal, healthy traffic records and seeks straight to the high-latency tail.
- In our benchmark of 3,001 documents with 36 breaches, the query examined **only 36 documents** with the index versus scanning all **3,001 documents** without it (**98.8% reduction in disk/cache I/O**).

#### Trade-off:
- **Index Write Amplification**: Adding a second compound index on an append-heavy telemetry collection doubles the B-tree write workload per ingestion.
- **Cache Contention**: Alert spike queries are executed periodically (e.g. every minute or five minutes), meaning this index may occasionally evict hotter, more frequently read dashboard indexes from the WiredTiger cache if RAM is limited.

---

## 5. Test Output & Execution Stats

Run the complete test suite:
```bash
npm test
```

### Benchmark Results (`explain("executionStats")`):
```text
════════════════════════════════════════════════════════════════════════════════
   DAY 3: MONGODB SCHEMAS, VALIDATION & INDEX VERIFICATION TEST RUNNER   
   Context: API Monitoring Dashboard (Latency, Error Rate, Alerts)       
════════════════════════════════════════════════════════════════════════════════

[1/6] Launching isolated in-memory MongoDB server (WiredTiger)...
✓ MongoDB instance active at: mongodb://127.0.0.1:51852/

[2/6] Applying native MongoDB Collection $jsonSchema validators...
✓ Native collection validators registered for 'services' and 'metric_snapshots'
✓ Mongoose indexes synchronized successfully

[3/6] Running Strict Schema Validation Tests...
────────────────────────────────────────────────────────────────────────────────
  [PASS] Test 3.1: Valid Service with embedded thresholds created successfully.
         ID: 6b071828148a93f8a81900fe | Name: payment-api | Env: production
  [PASS] Test 3.2: Successfully rejected negative latency threshold (-100ms).
         Error: "Service validation failed: alert_thresholds.latency_threshold_ms: Latency threshold must be a positive integer (> 0 ms)"
  [PASS] Test 3.3: Successfully rejected error rate > 100% (150%).
         Error: "Service validation failed: alert_thresholds.error_rate_threshold_percent: Error rate threshold cannot exceed 100%"
  [PASS] Test 3.4: Successfully enforced unique index on { name: 1, environment: 1 }.
         Duplicate Key Code: 11000 (E11000)
  [PASS] Test 3.5: Valid MetricSnapshot created with parent reference to Service.
         Metric ID: 6b071828148a93f8a8190102 | Ref Service ID: 6b071828148a93f8a81900fe
  [PASS] Test 3.6: Successfully rejected error_count (150) > total_requests (100).
         Validation Error: "MetricSnapshot validation failed: error_count: error_count (150) cannot exceed total_requests (100)"
  [PASS] Test 3.7: Successfully rejected negative latency in subdocument.
         Validation Error: "MetricSnapshot validation failed: latency_ms.average: Average latency cannot be negative"
  [PASS] Test 3.8: Successfully rejected missing relational parent reference (service_id).
         Validation Error: "MetricSnapshot validation failed: service_id: service_id reference is required"

[4/6] Seeding 3,000 realistic time-series metric snapshots for performance analysis...
✓ Successfully seeded 3001 metric snapshot documents.

[5/6] EXPLAIN PLAN & INDEX BENCHMARKING
════════════════════════════════════════════════════════════════════════════════
>> QUERY 1: Dashboard Time-Series Filter by Service + Window + Timestamp
   db.metric_snapshots.find({ service_id, window: "1h", timestamp: { $gte: ... } }).sort({ timestamp: -1 })

   [Query 1 Performance Comparison]
   • WITHOUT Index:
       - Stage:                  SORT (Full Collection Scan)
       - In-Memory Sort Stage:   YES (SORT_KEY_GENERATOR)
       - Total Documents Scanned: 3001
       - Keys Examined:          0
       - Results Returned:       225
       - Execution Time:         3 ms

   • WITH Index [idx_metrics_service_window_timestamp]:
       - Stage:                  FETCH -> IXSCAN (Index B-Tree Range Scan)
       - In-Memory Sort Stage:   NO (Satisfied directly by index order)
       - Total Documents Scanned: 225
       - Keys Examined:          225
       - Results Returned:       225
       - Execution Time:         1 ms
       - Efficiency Ratio:       1.00 docs examined per result (1.0 = Perfect ESR alignment)

────────────────────────────────────────────────────────────────────────────────
>> QUERY 2: SLA Alert Threshold Breach Scan (p95 >= 500 ms)
   db.metric_snapshots.find({ service_id, "latency_ms.p95": { $gte: 500 } }).sort({ "latency_ms.p95": -1, timestamp: -1 })

   [Query 2 Performance Comparison]
   • WITHOUT Index:
       - Stage:                  COLLSCAN (Inspected entire 3,000 document history)
       - Total Documents Scanned: 3001
       - Keys Examined:          0
       - Breach Incidents Found: 36
       - Execution Time:         1 ms

   • WITH Index [idx_metrics_service_p95_timestamp]:
       - Stage:                  FETCH -> IXSCAN
       - Total Documents Scanned: 36
       - Keys Examined:          36
       - Breach Incidents Found: 36
       - Execution Time:         0 ms
       - Scan Reduction:         Scanned only 36 documents instead of 3001 (~98.8% I/O reduction)
```

---

## 6. Screenshot Proof

A high-resolution visual proof of the test execution and benchmark metrics is saved at:
- [Screenshot 2026-11-25 Day 3 MongoDB Test Output.png](file:///Users/alokagrahari/Downloads/DT/ss/Screenshot%202026-11-25%20Day%203%20MongoDB%20Test%20Output.png)
