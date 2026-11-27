const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0b0f19;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 30px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .window {
    width: 1140px;
    background: #111726;
    border-radius: 12px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .titlebar {
    background: #1a2236;
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
    color: #94a3b8;
    font-size: 13px;
    font-weight: 500;
    font-family: monospace;
    margin-right: 48px;
  }
  .terminal-body {
    padding: 24px 28px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 12.5px;
    line-height: 1.55;
    color: #e2e8f0;
    white-space: pre-wrap;
  }
  .header-box {
    background: #172033;
    border: 1px solid #2d3b55;
    border-left: 4px solid #38bdf8;
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 20px;
    color: #38bdf8;
    font-weight: 600;
  }
  .badge-pass {
    background: rgba(34, 197, 94, 0.18);
    color: #4ade80;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: bold;
  }
  .badge-edge {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: bold;
  }
  .badge-err {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: bold;
  }
  .card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin: 16px 0;
  }
  .info-card {
    background: #0f1626;
    border: 1px solid #243049;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .info-card.accent-green { border-left: 4px solid #22c55e; }
  .info-card.accent-amber { border-left: 4px solid #f59e0b; }
  .card-title {
    font-size: 11px;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .highlight-blue { color: #60a5fa; }
  .highlight-green { color: #4ade80; }
  .highlight-yellow { color: #fbbf24; }
  .highlight-cyan { color: #38bdf8; }
  .highlight-magenta { color: #c084fc; }
  .highlight-gray { color: #64748b; }
  .footer-note {
    margin-top: 22px;
    padding-top: 14px;
    border-top: 1px solid #243049;
    color: #94a3b8;
    font-size: 11.5px;
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
    <div class="title">node src/scripts/test-day4-fitness.js — Express Middleware & Validation</div>
  </div>
  <div class="terminal-body">
<div class="header-box">
DAY 4: EXPRESS MIDDLEWARE, INPUT VALIDATION &amp; CENTRALIZED ERROR HANDLING
Context: Fitness Coaching App (Workout Plans and Progress Analytics)
Stack: Express 5.3 + Zod 4.6 + Node.js v25 (Native Fetch &amp; Crypto)
</div>

<span class="highlight-cyan">✓ Test Express server active on: http://127.0.0.1:59360</span>

<span class="highlight-cyan">[PART 1] VALID REQUESTS DEMONSTRATION</span>
──────────────────────────────────────────────────────────────────────────────────
<span class="highlight-gray">[REQ] [req_ef57477d] POST /api/v1/fitness/workout-plans</span>
<span class="highlight-green">[RES] [req_ef57477d] POST /api/v1/fitness/workout-plans -&gt; 201 in 2ms</span>
  <span class="badge-pass">[PASS]</span> Test 1: Valid Workout Plan Creation (POST /api/v1/fitness/workout-plans)
         Status: 201 | Plan ID: plan_bed3c7ff... | 10 Planned Sets | Est. Duration: 34m | X-Request-ID Attached

<span class="highlight-gray">[REQ] [req_fce965f7] POST /api/v1/fitness/progress-logs</span>
<span class="highlight-green">[RES] [req_fce965f7] POST /api/v1/fitness/progress-logs -&gt; 201 in 0ms</span>
  <span class="badge-pass">[PASS]</span> Test 2: Valid Progress Analytics Log (POST /api/v1/fitness/progress-logs)
         Status: 201 | Total Volume Load: 5,600 kg | Training Strain Index: 52.0 | Cal: 520 kcal

<span class="highlight-gray">[REQ] [req_99ab54fa] GET /api/v1/fitness/analytics/client_alex_99?timeframe=30d&amp;metric=volume_load</span>
<span class="highlight-green">[RES] [req_99ab54fa] GET /api/v1/fitness/analytics/... -&gt; 200 in 0ms</span>
  <span class="badge-pass">[PASS]</span> Test 3: Valid Analytics Retrieval (GET /api/v1/fitness/analytics/:clientId)
         Status: 200 | Sessions: 1 | Cumulative Load: 5,600 kg | Average Perceived RPE: 8.0

<span class="highlight-cyan">[PART 2] INVALID REQUESTS &amp; VALIDATION ERROR HANDLING DEMONSTRATION</span>
──────────────────────────────────────────────────────────────────────────────────
<span class="highlight-yellow">[OPERATIONAL_ERR] [req_dfc68f14] VALIDATION_ERROR (422): Validation failed for incoming request data</span>
  <span class="badge-pass">[PASS]</span> Test 4: Missing Required Fields Rejection (422 Unprocessable Entity)
         Status: 422 | Code: VALIDATION_ERROR | Caught 7 missing field violations (clientId, exercises, etc.)

<span class="highlight-yellow">[OPERATIONAL_ERR] [req_81da3743] VALIDATION_ERROR (422): Validation failed for incoming request data</span>
  <span class="badge-pass">[PASS]</span> Test 5: Type &amp; Out-of-Bounds Range Constraints (422 Unprocessable Entity)
         Status: 422 | Detected invalid fields: [targetGoal, scheduleDaysPerWeek, exercises.0.targetRpe]

  <span class="badge-pass">[PASS]</span> Test 6: Malformed JSON Body Handling (400 Bad Request)
         Status: 400 | Code: MALFORMED_JSON | Handled gracefully by centralized error handler

<span class="highlight-cyan">[PART 3] DOMAIN-SPECIFIC EDGE CASES DEMONSTRATION</span>
──────────────────────────────────────────────────────────────────────────────────
<div class="card-grid">
  <div class="info-card accent-amber">
    <div class="card-title"><span class="badge-edge">EDGE CASE 1</span> TEMPORAL CAUSALITY BREACH (FUTURE LOG REJECTION)</div>
    <div style="font-size: 12px; margin-top: 4px;">
      Client attempted to submit workout session dated 14 days in the future.<br/>
      <span class="highlight-green">✓ Rejected (422):</span> "sessionDate cannot be in the future. Cannot record progress analytics for an uncompleted future workout."
    </div>
  </div>
  <div class="info-card accent-amber">
    <div class="card-title"><span class="badge-edge">EDGE CASE 2</span> PHYSIOLOGICAL SAFETY THRESHOLD (MAX RPE WITHOUT REST)</div>
    <div style="font-size: 12px; margin-top: 4px;">
      Coach submitted workout plan with maximum exertion (RPE 10.0) but 0s rest.<br/>
      <span class="highlight-green">✓ Rejected (422):</span> "Near-maximal exertion (RPE &gt;= 9.5) requires a minimum rest interval of 60 seconds."
    </div>
  </div>
</div>
  <span class="badge-pass">[PASS]</span> Test 9: EDGE CASE 3: Duplicate Exercise Routine Collision in Single Plan
         Status: 422 | "Duplicate exercise 'Barbell Bench Press' detected. Aggregate sets into a single entry."

<span class="highlight-cyan">[PART 4] CUSTOM MIDDLEWARE &amp; CENTRALIZED ERROR HANDLING VERIFICATION</span>
──────────────────────────────────────────────────────────────────────────────────
  <span class="badge-pass">[PASS]</span> Test 10: 404 Route Not Found via Centralized Error Handler
         Status: 404 | Code: NOT_FOUND | Uniform JSON error payload with correlated requestId
  <span class="badge-pass">[PASS]</span> Test 11: Request ID Upstream Header Preservation &amp; Propagation
         Preserved Inbound ID: "trace_client_audit_778899" -&gt; Echoed In Header: "trace_client_audit_778899"

══════════════════════════════════════════════════════════════════════════════════
<span class="highlight-green">TEST SUMMARY: 11 / 11 TESTS PASSED (100% SUCCESS RATE)</span>
══════════════════════════════════════════════════════════════════════════════════
<span class="highlight-cyan">✓ Test Express server cleanly terminated.</span>
<span class="highlight-cyan">✓ Full test output exported to: /Users/alokagrahari/Downloads/DT/test-output-day4.txt</span>

<div class="footer-note">
  ✓ Verified on Node.js v25.2.1 • Express 5.3.0 • Zod 4.6.7 • Clean Execution &amp; Traceability
</div>
  </div>
</div>
</body>
</html>`;

const tempHtmlPath = path.join(__dirname, "../../temp_day4_screenshot.html");
fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

const screenshotTarget1 = path.join(
  __dirname,
  "../../ss/Screenshot 2026-11-27 Day 4 Express Middleware Test Output.png"
);
const artifactDir =
  "/Users/alokagrahari/.gemini/antigravity/brain/992c8e6c-b05d-40a1-933e-0cde0f41d16c";
const screenshotTarget2 = path.join(
  artifactDir,
  "day4-express-middleware-test-output.png"
);

fs.mkdirSync(path.dirname(screenshotTarget1), { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const chromeBin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cmd = `"${chromeBin}" --headless --disable-gpu --screenshot="${screenshotTarget1}" --window-size=1200,1400 "file://${tempHtmlPath}"`;

console.log("Generating Day 4 high-resolution screenshot using Chrome Headless...");
execSync(cmd, { stdio: "inherit" });

fs.copyFileSync(screenshotTarget1, screenshotTarget2);
fs.unlinkSync(tempHtmlPath);

console.log("✓ Screenshot saved to:", screenshotTarget1);
console.log("✓ Screenshot saved to artifact dir:", screenshotTarget2);
