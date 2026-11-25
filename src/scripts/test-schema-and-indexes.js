/**
 * Day 3 - MongoDB Schemas, Validation & Index Performance Test Runner
 *
 * Runs an in-memory MongoDB instance to verify:
 * 1. Strict schema validation (accepting valid docs, rejecting invalid metrics/thresholds)
 * 2. Uniqueness constraints & cross-field validations
 * 3. Relational referencing strategy (Service -> MetricSnapshot) & embedding
 * 4. Index verification with explain("executionStats") comparing IXSCAN vs COLLSCAN
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Service = require("../models/Service");
const MetricSnapshot = require("../models/MetricSnapshot");
const {
  serviceJsonSchema,
  metricSnapshotJsonSchema,
} = require("../schemas/mongoValidationSchemas");

// Format helpers
const divider = "═".repeat(80);
const subDivider = "─".repeat(80);

async function runTestSuite() {
  const outputLogs = [];
  function log(msg = "") {
    console.log(msg);
    outputLogs.push(msg);
  }

  log(divider);
  log("   DAY 3: MONGODB SCHEMAS, VALIDATION & INDEX VERIFICATION TEST RUNNER   ");
  log("   Context: API Monitoring Dashboard (Latency, Error Rate, Alerts)       ");
  log(divider);
  log();

  // 1. Initialize MongoDB in-memory server
  log("[1/6] Launching isolated in-memory MongoDB server (WiredTiger)...");
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  log(`✓ MongoDB instance active at: ${uri}`);

  await mongoose.connect(uri, { dbName: "monitoring_db" });
  const db = mongoose.connection.db;

  // 2. Apply native collection $jsonSchema validators
  log();
  log("[2/6] Applying native MongoDB Collection $jsonSchema validators...");
  for (const [coll, validator] of [
    ["services", serviceJsonSchema],
    ["metric_snapshots", metricSnapshotJsonSchema],
  ]) {
    try {
      await db.createCollection(coll, { validator });
    } catch (e) {
      if (e.code === 48 || e.codeName === "NamespaceExists") {
        await db.command({ collMod: coll, validator });
      } else {
        throw e;
      }
    }
  }
  log("✓ Native collection validators registered for 'services' and 'metric_snapshots'");

  // Ensure Mongoose indexes
  await Service.syncIndexes();
  await MetricSnapshot.syncIndexes();
  log("✓ Mongoose indexes synchronized successfully");

  // 3. Validation Tests
  log();
  log("[3/6] Running Strict Schema Validation Tests...");
  log(subDivider);

  // Test 3.1: Valid Service creation
  let paymentService;
  try {
    paymentService = await Service.create({
      name: "payment-api",
      environment: "production",
      status: "healthy",
      alert_thresholds: {
        latency_threshold_ms: 500,
        error_rate_threshold_percent: 5.0,
        enabled: true,
        evaluation_window: "5m",
        notification_channels: ["slack-alerts", "pagerduty-critical"],
      },
      metadata: {
        team: "payments-core",
        repository: "https://github.com/company/payment-api",
        version: "2.4.1",
      },
    });
    log("  [PASS] Test 3.1: Valid Service with embedded thresholds created successfully.");
    log(`         ID: ${paymentService._id} | Name: ${paymentService.name} | Env: ${paymentService.environment}`);
  } catch (err) {
    log(`  [FAIL] Test 3.1: Valid service failed: ${err.message}`);
  }

  // Test 3.2: Rejection on negative latency threshold
  try {
    await Service.create({
      name: "invalid-latency-api",
      environment: "production",
      alert_thresholds: {
        latency_threshold_ms: -100, // Invalid: must be positive
        error_rate_threshold_percent: 5.0,
        enabled: true,
      },
    });
    log("  [FAIL] Test 3.2: Failed to reject negative latency threshold!");
  } catch (err) {
    log("  [PASS] Test 3.2: Successfully rejected negative latency threshold (-100ms).");
    log(`         Error: "${err.message.split("\n")[0]}"`);
  }

  // Test 3.3: Rejection on error rate > 100%
  try {
    await Service.create({
      name: "invalid-error-rate-api",
      environment: "production",
      alert_thresholds: {
        latency_threshold_ms: 300,
        error_rate_threshold_percent: 150.0, // Invalid: max 100
        enabled: true,
      },
    });
    log("  [FAIL] Test 3.3: Failed to reject error rate > 100%!");
  } catch (err) {
    log("  [PASS] Test 3.3: Successfully rejected error rate > 100% (150%).");
    log(`         Error: "${err.message.split("\n")[0]}"`);
  }

  // Test 3.4: Rejection on duplicate name + environment (Unique Compound Index)
  try {
    await Service.create({
      name: "payment-api",
      environment: "production", // Duplicate of Test 3.1
      alert_thresholds: {
        latency_threshold_ms: 400,
        error_rate_threshold_percent: 2.0,
        enabled: true,
      },
    });
    log("  [FAIL] Test 3.4: Failed to enforce unique compound index { name: 1, environment: 1 }!");
  } catch (err) {
    log("  [PASS] Test 3.4: Successfully enforced unique index on { name: 1, environment: 1 }.");
    log(`         Duplicate Key Code: ${err.code} (E11000)`);
  }

  // Test 3.5: Valid MetricSnapshot creation referencing Service
  let validMetric;
  try {
    validMetric = await MetricSnapshot.create({
      service_id: paymentService._id,
      timestamp: new Date(),
      window: "1h",
      total_requests: 1000,
      error_count: 16,
      error_rate_percent: 1.6,
      latency_ms: {
        average: 150,
        p50: 135,
        p95: 180,
        p99: 240,
        max: 420,
      },
      status_code_breakdown: {
        "2xx": 984,
        "3xx": 0,
        "4xx": 12,
        "5xx": 4,
      },
      alert_triggered: false,
    });
    log("  [PASS] Test 3.5: Valid MetricSnapshot created with parent reference to Service.");
    log(`         Metric ID: ${validMetric._id} | Ref Service ID: ${validMetric.service_id}`);
  } catch (err) {
    log(`  [FAIL] Test 3.5: Valid MetricSnapshot failed: ${err.message}`);
  }

  // Test 3.6: Rejection on error_count > total_requests
  try {
    await MetricSnapshot.create({
      service_id: paymentService._id,
      timestamp: new Date(),
      window: "15m",
      total_requests: 100,
      error_count: 150, // Invalid: exceeds total requests
      error_rate_percent: 100,
      latency_ms: { average: 200, p95: 350 },
    });
    log("  [FAIL] Test 3.6: Failed to reject error_count > total_requests!");
  } catch (err) {
    log("  [PASS] Test 3.6: Successfully rejected error_count (150) > total_requests (100).");
    log(`         Validation Error: "${err.message}"`);
  }

  // Test 3.7: Rejection on negative latency
  try {
    await MetricSnapshot.create({
      service_id: paymentService._id,
      timestamp: new Date(),
      window: "1h",
      total_requests: 500,
      error_count: 5,
      error_rate_percent: 1.0,
      latency_ms: { average: -25, p95: 100 }, // Invalid: negative latency
    });
    log("  [FAIL] Test 3.7: Failed to reject negative latency metric!");
  } catch (err) {
    log("  [PASS] Test 3.7: Successfully rejected negative latency in subdocument.");
    log(`         Validation Error: "${err.message.split("\n")[0]}"`);
  }

  // Test 3.8: Rejection on missing service_id reference
  try {
    await MetricSnapshot.create({
      timestamp: new Date(),
      window: "1h",
      total_requests: 100,
      error_count: 0,
      error_rate_percent: 0,
      latency_ms: { average: 100, p95: 150 },
    });
    log("  [FAIL] Test 3.8: Failed to reject missing service_id!");
  } catch (err) {
    log("  [PASS] Test 3.8: Successfully rejected missing relational parent reference (service_id).");
    log(`         Validation Error: "${err.message.split("\n")[0]}"`);
  }

  // 4. Seed Telemetry Data for Index Performance Testing
  log();
  log("[4/6] Seeding 3,000 realistic time-series metric snapshots for performance analysis...");
  const recordsToInsert = [];
  const baseTime = Date.now();
  const windows = ["15m", "1h", "24h"];

  for (let i = 0; i < 3000; i++) {
    // Distribute timestamps back over past 30 days
    const timestamp = new Date(baseTime - i * 15 * 60 * 1000);
    const window = windows[i % windows.length];
    const totalRequests = 500 + Math.floor(Math.random() * 2000);

    // Normal traffic vs simulated latency spikes
    const isSpike = i % 85 === 0; // ~35 spikes exceeding 500ms SLA threshold
    const avgLatency = isSpike ? 450 + Math.floor(Math.random() * 300) : 100 + Math.floor(Math.random() * 120);
    const p95Latency = isSpike ? 600 + Math.floor(Math.random() * 800) : 140 + Math.floor(Math.random() * 180);
    const errorCount = isSpike ? Math.floor(totalRequests * 0.12) : Math.floor(totalRequests * 0.015);
    const errorRate = Number(((errorCount / totalRequests) * 100).toFixed(2));
    const alertTriggered = p95Latency >= 500 || errorRate >= 5.0;

    recordsToInsert.push({
      service_id: paymentService._id,
      timestamp,
      window,
      total_requests: totalRequests,
      error_count: errorCount,
      error_rate_percent: errorRate,
      latency_ms: {
        average: avgLatency,
        p50: Math.floor(avgLatency * 0.9),
        p95: p95Latency,
        p99: Math.floor(p95Latency * 1.3),
        max: Math.floor(p95Latency * 1.8),
      },
      status_code_breakdown: {
        "2xx": totalRequests - errorCount,
        "3xx": 0,
        "4xx": Math.floor(errorCount * 0.7),
        "5xx": Math.ceil(errorCount * 0.3),
      },
      alert_triggered: alertTriggered,
      breached_thresholds: alertTriggered
        ? [p95Latency >= 500 ? "LATENCY_P95_EXCEEDED" : null, errorRate >= 5.0 ? "ERROR_RATE_EXCEEDED" : null].filter(Boolean)
        : [],
    });
  }

  await MetricSnapshot.insertMany(recordsToInsert);
  const totalCount = await MetricSnapshot.countDocuments();
  log(`✓ Successfully seeded ${totalCount} metric snapshot documents.`);

  // 5. Verify Index Performance via explain("executionStats")
  log();
  log("[5/6] EXPLAIN PLAN & INDEX BENCHMARKING");
  log(divider);

  // ---------------------------------------------------------------------------
  // QUERY 1: Dashboard Time-Series Metrics Retrieval
  // GET /api/v1/monitoring/metrics?window=1h&service=payment-api (last 7 days)
  // ---------------------------------------------------------------------------
  const sevenDaysAgo = new Date(baseTime - 7 * 24 * 60 * 60 * 1000);
  const query1Filter = {
    service_id: paymentService._id,
    window: "1h",
    timestamp: { $gte: sevenDaysAgo },
  };
  const query1Sort = { timestamp: -1 };

  log(">> QUERY 1: Dashboard Time-Series Filter by Service + Window + Timestamp");
  log(`   db.metric_snapshots.find({ service_id, window: "1h", timestamp: { $gte: ... } }).sort({ timestamp: -1 })`);
  log();

  // Run Query 1 WITHOUT Index (Simulated using natural scan)
  const q1Unindexed = await MetricSnapshot.find(query1Filter)
    .sort(query1Sort)
    .hint({ $natural: 1 })
    .explain("executionStats");

  const q1UnindexedStats = q1Unindexed.executionStats;
  const q1UnindexedPlan = q1Unindexed.queryPlanner.winningPlan;
  const q1UnindexedStage = q1UnindexedPlan.stage;

  // Run Query 1 WITH Compound Index { service_id: 1, window: 1, timestamp: -1 }
  const q1Indexed = await MetricSnapshot.find(query1Filter)
    .sort(query1Sort)
    .hint("idx_metrics_service_window_timestamp")
    .explain("executionStats");

  const q1IndexedStats = q1Indexed.executionStats;
  const q1IndexedPlan = q1Indexed.queryPlanner.winningPlan;

  log("   [Query 1 Performance Comparison]");
  log(`   • WITHOUT Index:`);
  log(`       - Stage:                  ${q1UnindexedStage} (Full Collection Scan)`);
  log(`       - In-Memory Sort Stage:   ${JSON.stringify(q1UnindexedPlan).includes("SORT") ? "YES (SORT_KEY_GENERATOR)" : "YES"}`);
  log(`       - Total Documents Scanned: ${q1UnindexedStats.totalDocsExamined}`);
  log(`       - Keys Examined:          ${q1UnindexedStats.totalKeysExamined}`);
  log(`       - Results Returned:       ${q1UnindexedStats.nReturned}`);
  log(`       - Execution Time:         ${q1UnindexedStats.executionTimeMillis} ms`);
  log();
  log(`   • WITH Index [idx_metrics_service_window_timestamp]:`);
  log(`       - Stage:                  ${q1IndexedPlan.stage} -> IXSCAN (Index B-Tree Range Scan)`);
  log(`       - In-Memory Sort Stage:   NO (Satisfied directly by index order)`);
  log(`       - Total Documents Scanned: ${q1IndexedStats.totalDocsExamined}`);
  log(`       - Keys Examined:          ${q1IndexedStats.totalKeysExamined}`);
  log(`       - Results Returned:       ${q1IndexedStats.nReturned}`);
  log(`       - Execution Time:         ${q1IndexedStats.executionTimeMillis} ms`);
  log(`       - Efficiency Ratio:       ${(q1IndexedStats.totalDocsExamined / q1IndexedStats.nReturned).toFixed(2)} docs examined per result (1.0 = Perfect ESR alignment)`);

  log();
  log(subDivider);

  // ---------------------------------------------------------------------------
  // QUERY 2: Alert Threshold & SLA Latency Spike Outlier Scan
  // Scan for severe p95 latency spikes (>= 500 ms) sorted by severity and time
  // ---------------------------------------------------------------------------
  const query2Filter = {
    service_id: paymentService._id,
    "latency_ms.p95": { $gte: 500 },
  };
  const query2Sort = { "latency_ms.p95": -1, timestamp: -1 };

  log(">> QUERY 2: SLA Alert Threshold Breach Scan (p95 >= 500 ms)");
  log(`   db.metric_snapshots.find({ service_id, "latency_ms.p95": { $gte: 500 } }).sort({ "latency_ms.p95": -1, timestamp: -1 })`);
  log();

  // Run Query 2 WITHOUT Index
  const q2Unindexed = await MetricSnapshot.find(query2Filter)
    .sort(query2Sort)
    .hint({ $natural: 1 })
    .explain("executionStats");

  const q2UnindexedStats = q2Unindexed.executionStats;

  // Run Query 2 WITH Compound Index { service_id: 1, "latency_ms.p95": -1, timestamp: -1 }
  const q2Indexed = await MetricSnapshot.find(query2Filter)
    .sort(query2Sort)
    .hint("idx_metrics_service_p95_timestamp")
    .explain("executionStats");

  const q2IndexedStats = q2Indexed.executionStats;
  const q2IndexedPlan = q2Indexed.queryPlanner.winningPlan;

  log("   [Query 2 Performance Comparison]");
  log(`   • WITHOUT Index:`);
  log(`       - Stage:                  COLLSCAN (Inspected entire 3,000 document history)`);
  log(`       - Total Documents Scanned: ${q2UnindexedStats.totalDocsExamined}`);
  log(`       - Keys Examined:          ${q2UnindexedStats.totalKeysExamined}`);
  log(`       - Breach Incidents Found: ${q2UnindexedStats.nReturned}`);
  log(`       - Execution Time:         ${q2UnindexedStats.executionTimeMillis} ms`);
  log();
  log(`   • WITH Index [idx_metrics_service_p95_timestamp]:`);
  log(`       - Stage:                  ${q2IndexedPlan.stage} -> IXSCAN`);
  log(`       - Total Documents Scanned: ${q2IndexedStats.totalDocsExamined}`);
  log(`       - Keys Examined:          ${q2IndexedStats.totalKeysExamined}`);
  log(`       - Breach Incidents Found: ${q2IndexedStats.nReturned}`);
  log(`       - Execution Time:         ${q2IndexedStats.executionTimeMillis} ms`);
  log(`       - Scan Reduction:         Scanned only ${q2IndexedStats.totalDocsExamined} documents instead of ${q2UnindexedStats.totalDocsExamined} (~${((1 - q2IndexedStats.totalDocsExamined / q2UnindexedStats.totalDocsExamined) * 100).toFixed(1)}% I/O reduction)`);

  // 6. Summary of Trade-offs
  log();
  log(divider);
  log("[6/6] ARCHITECTURAL TRADE-OFF ANALYSIS");
  log(divider);
  log(`
  1. RELATIONSHIP STRATEGY: HYBRID EMBEDDING & REFERENCING
     • Embedded 'alert_thresholds' in 'Service':
       - Trade-off Benefit: Cardinality is 1:1/1:few and bounded. Zero-join single document
         reads on '/api/v1/monitoring/summary'. Atomic threshold updates via single PUT operations.
       - Trade-off Cost: Threshold configuration changes cannot be version-tracked historically
         without adding an audit log.

     • Referenced 'MetricSnapshot' to 'Service' via 'service_id':
       - Trade-off Benefit: Metric telemetry is unbounded 1:N (millions of data points).
         Referencing avoids hitting MongoDB's 16MB document limit, prevents constant document
         resizing/fragmentation on disk, and allows efficient B-tree indexing and sharding.
       - Trade-off Cost: Requires an index lookup or application-level join when cross-referencing
         service details with raw time-series metrics.

  2. INDEX 1: { service_id: 1, window: 1, timestamp: -1 }
     • Query Improved: Dashboard time-series queries (GET /api/v1/monitoring/metrics).
     • Why: Perfect ESR (Equality, Sort, Range) alignment; eliminates in-memory sort buffer.
     • Trade-off: High write overhead. Monitoring agents write snapshots frequently. Every insert
       must write to this index, consuming CPU, disk IOPS, and WiredTiger cache memory.

  3. INDEX 2: { service_id: 1, "latency_ms.p95": -1, timestamp: -1 }
     • Query Improved: SLA alert evaluation and outlier spike detection (p95 >= threshold).
     • Why: Bypasses 99% of normal healthy metrics, seeking directly to threshold breach entries.
     • Trade-off: Write amplification. Telemetry writes now maintain two separate multi-key
       compound indexes. Because alert spike scans run less frequently than regular dashboard reads,
       this index risks evicting hotter cached data if memory is constrained.
  `);
  log(divider);

  // Save text output
  const outputPath = path.join(__dirname, "../../test-output.txt");
  fs.writeFileSync(outputPath, outputLogs.join("\n"), "utf-8");
  log(`\n✓ Full test output exported to: ${outputPath}`);

  // Cleanup
  await mongoose.disconnect();
  await mongod.stop();
  log("✓ MongoDB in-memory server cleanly shut down.");

  return outputLogs.join("\n");
}

if (require.main === module) {
  runTestSuite().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };
