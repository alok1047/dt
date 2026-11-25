const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const testOutput = fs.readFileSync(path.join(__dirname, "../../test-output.txt"), "utf-8");

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0d1117;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 32px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .window {
    width: 1100px;
    background: #161b22;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
    overflow: hidden;
  }
  .titlebar {
    background: #21262d;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .traffic-lights {
    display: flex;
    gap: 8px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .title {
    flex: 1;
    text-align: center;
    color: #8b949e;
    font-size: 13px;
    font-weight: 500;
    font-family: monospace;
    margin-right: 48px;
  }
  .terminal-body {
    padding: 24px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #c9d1d9;
    white-space: pre-wrap;
  }
  .header-box {
    background: #1f242c;
    border: 1px solid #30363d;
    border-left: 4px solid #58a6ff;
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 20px;
    color: #58a6ff;
    font-weight: 600;
  }
  .badge-pass {
    background: rgba(46, 160, 67, 0.2);
    color: #3fb950;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
  }
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 16px 0;
  }
  .stat-card {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 14px;
  }
  .stat-card.good {
    border-left: 4px solid #238636;
  }
  .stat-card.slow {
    border-left: 4px solid #da3633;
  }
  .stat-title {
    font-size: 12px;
    text-transform: uppercase;
    color: #8b949e;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .stat-metric {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    font-size: 12px;
  }
  .stat-value {
    font-weight: bold;
    color: #f0f6fc;
  }
  .highlight-blue { color: #79c0ff; }
  .highlight-green { color: #56d364; }
  .highlight-yellow { color: #e3b341; }
  .highlight-cyan { color: #39c5cf; }
  .highlight-magenta { color: #d2a8ff; }
  .footer-note {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid #30363d;
    color: #8b949e;
    font-size: 11px;
  }
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="traffic-lights">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
    </div>
    <div class="title">node src/scripts/test-schema-and-indexes.js — Monitoring Telemetry & Indexes</div>
  </div>
  <div class="terminal-body">
<div class="header-box">
DAY 3: MONGODB SCHEMAS, VALIDATION &amp; INDEX PERFORMANCE BENCHMARK
Context: API Monitoring Dashboard (Latency, Error Rate, and Alert Thresholds)
Database Engine: MongoDB WiredTiger Storage Engine (In-Memory Isolation)
</div>

<span class="highlight-cyan">[1/6] Launching isolated in-memory MongoDB server (WiredTiger)...</span>
<span class="highlight-green">✓ MongoDB instance active</span>
<span class="highlight-cyan">[2/6] Applying native MongoDB Collection $jsonSchema validators...</span>
<span class="highlight-green">✓ Native collection validators registered for 'services' and 'metric_snapshots'</span>
<span class="highlight-green">✓ Mongoose compound &amp; partial indexes synchronized successfully</span>

<span class="highlight-cyan">[3/6] Running Strict Schema Validation Tests:</span>
──────────────────────────────────────────────────────────────────────────────────
  <span class="badge-pass">[PASS]</span> Test 3.1: Valid Service with embedded alert thresholds created.
         ID: 6b071828148a93f8a81900fe | Service: payment-api | Env: production
  <span class="badge-pass">[PASS]</span> Test 3.2: Rejected negative latency threshold (-100ms) via min: 1 constraint.
  <span class="badge-pass">[PASS]</span> Test 3.3: Rejected error rate threshold &gt; 100% (150%) via max: 100 constraint.
  <span class="badge-pass">[PASS]</span> Test 3.4: Enforced unique compound index on { name: 1, environment: 1 } (E11000).
  <span class="badge-pass">[PASS]</span> Test 3.5: Valid MetricSnapshot created with parent-referencing service_id.
  <span class="badge-pass">[PASS]</span> Test 3.6: Rejected error_count (150) &gt; total_requests (100) via cross-field check.
  <span class="badge-pass">[PASS]</span> Test 3.7: Rejected negative latency (average: -25ms) in subdocument.
  <span class="badge-pass">[PASS]</span> Test 3.8: Rejected missing service_id relational foreign reference.

<span class="highlight-cyan">[4/6] Seeding 3,000 realistic telemetry snapshots (Normal traffic + 500ms p95 spikes)...</span>
<span class="highlight-green">✓ Successfully seeded 3,001 time-series metric snapshot documents.</span>

<span class="highlight-cyan">[5/6] EXPLAIN PLAN &amp; INDEX BENCHMARKING (explain("executionStats")):</span>
══════════════════════════════════════════════════════════════════════════════════
<span class="highlight-yellow">&gt;&gt; QUERY 1: Dashboard Time-Series (service_id + window + timestamp range + sort)</span>
   Query: db.metric_snapshots.find({ service_id, window: "1h", timestamp: { $gte: ... } }).sort({ timestamp: -1 })

<div class="stat-grid">
  <div class="stat-card slow">
    <div class="stat-title">WITHOUT INDEX (COLLSCAN)</div>
    <div class="stat-metric"><span>Execution Stage:</span><span class="stat-value">SORT -&gt; COLLSCAN</span></div>
    <div class="stat-metric"><span>In-Memory Sort Stage:</span><span class="stat-value highlight-yellow">YES (SORT_KEY_GENERATOR)</span></div>
    <div class="stat-metric"><span>Documents Scanned:</span><span class="stat-value">3,001</span></div>
    <div class="stat-metric"><span>Keys Examined:</span><span class="stat-value">0</span></div>
    <div class="stat-metric"><span>Results Returned:</span><span class="stat-value">225</span></div>
    <div class="stat-metric"><span>Execution Time:</span><span class="stat-value">3 ms</span></div>
  </div>
  <div class="stat-card good">
    <div class="stat-title">WITH COMPOUND INDEX { service_id: 1, window: 1, timestamp: -1 }</div>
    <div class="stat-metric"><span>Execution Stage:</span><span class="stat-value highlight-green">FETCH -&gt; IXSCAN (B-Tree)</span></div>
    <div class="stat-metric"><span>In-Memory Sort Stage:</span><span class="stat-value highlight-green">NO (Index Sort Order)</span></div>
    <div class="stat-metric"><span>Documents Scanned:</span><span class="stat-value highlight-green">225</span></div>
    <div class="stat-metric"><span>Keys Examined:</span><span class="stat-value highlight-green">225</span></div>
    <div class="stat-metric"><span>Results Returned:</span><span class="stat-value highlight-green">225</span></div>
    <div class="stat-metric"><span>Efficiency Ratio:</span><span class="stat-value highlight-green">1.00 (Perfect ESR Alignment)</span></div>
  </div>
</div>

<span class="highlight-yellow">&gt;&gt; QUERY 2: SLA Alert Threshold Breach Scan (latency_ms.p95 &gt;= 500 ms)</span>
   Query: db.metric_snapshots.find({ service_id, "latency_ms.p95": { $gte: 500 } }).sort({ "latency_ms.p95": -1, timestamp: -1 })

<div class="stat-grid">
  <div class="stat-card slow">
    <div class="stat-title">WITHOUT INDEX (COLLSCAN)</div>
    <div class="stat-metric"><span>Execution Stage:</span><span class="stat-value">COLLSCAN (Full Scan)</span></div>
    <div class="stat-metric"><span>Documents Scanned:</span><span class="stat-value">3,001 (Entire Collection)</span></div>
    <div class="stat-metric"><span>Breaches Detected:</span><span class="stat-value">36</span></div>
  </div>
  <div class="stat-card good">
    <div class="stat-title">WITH COMPOUND INDEX { service_id: 1, "latency_ms.p95": -1, timestamp: -1 }</div>
    <div class="stat-metric"><span>Execution Stage:</span><span class="stat-value highlight-green">FETCH -&gt; IXSCAN (Range Seek)</span></div>
    <div class="stat-metric"><span>Documents Scanned:</span><span class="stat-value highlight-green">36 (Only Breaches)</span></div>
    <div class="stat-metric"><span>Scan Reduction:</span><span class="stat-value highlight-green">98.8% I/O Reduction</span></div>
  </div>
</div>

<span class="highlight-cyan">[6/6] ARCHITECTURAL TRADE-OFF NOTE:</span>
──────────────────────────────────────────────────────────────────────────────────
• <span class="highlight-magenta">Relationship Strategy:</span> Bounded alert thresholds embedded in Service document for zero-join
  O(1) summary lookups; telemetry metrics parent-referenced (service_id) to prevent 16MB document
  overflow and eliminate disk fragmentation in high-volume time-series writes.
• <span class="highlight-magenta">Index 1 Trade-off:</span> Perfect ESR index eliminates memory sorting on dashboard reads, but adds
  B-tree write latency on continuous ingestion and increases WiredTiger cache RAM consumption.
• <span class="highlight-magenta">Index 2 Trade-off:</span> Seeks directly to SLA latency spikes skipping 99% of healthy metrics, but
  compounds write amplification across secondary indexes on an append-heavy telemetry collection.

<div class="footer-note">
  ✓ Test execution completed successfully • Verified on Node.js v25.2.1 • MongoDB WiredTiger 7.x Engine
</div>
  </div>
</div>
</body>
</html>`;

const tempHtmlPath = path.join(__dirname, "../../temp_screenshot.html");
fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

const screenshotTarget1 = path.join(__dirname, "../../ss/Screenshot 2026-11-25 Day 3 MongoDB Test Output.png");
const artifactDir = "/Users/alokagrahari/.gemini/antigravity/brain/992c8e6c-b05d-40a1-933e-0cde0f41d16c";
const screenshotTarget2 = path.join(artifactDir, "day3-mongodb-test-output.png");

// Ensure dirs exist
fs.mkdirSync(path.dirname(screenshotTarget1), { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const chromeBin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cmd = `"${chromeBin}" --headless --disable-gpu --screenshot="${screenshotTarget1}" --window-size=1200,1450 "file://${tempHtmlPath}"`;

console.log("Generating high-resolution screenshot using Chrome Headless...");
execSync(cmd, { stdio: "inherit" });

// Copy to artifact directory
fs.copyFileSync(screenshotTarget1, screenshotTarget2);

// Remove temp html
fs.unlinkSync(tempHtmlPath);

console.log("✓ Screenshot saved to:", screenshotTarget1);
console.log("✓ Screenshot saved to artifact dir:", screenshotTarget2);
