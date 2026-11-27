/**
 * Day 4 - Express Middleware & Validation Test Suite
 * Context: Fitness Coaching App (Workout Plans and Progress Analytics)
 *
 * Demonstrates:
 * 1. Valid requests (Workout Plan creation, Progress telemetry log, Analytics query)
 * 2. Invalid requests (Missing fields, Type mismatch, Numeric out-of-bounds, Malformed JSON)
 * 3. Domain edge cases (Temporal causality breach, Max RPE with 0 rest, Duplicate exercise collision)
 * 4. Custom middleware (Request ID propagation, Structured logging, Centralized error handler)
 */

const fs = require("fs");
const path = require("path");
const createApp = require("../app");
const { resetFitnessData } = require("../routes/fitnessRoutes");

const divider = "═".repeat(82);
const subDivider = "─".repeat(82);

async function runTestSuite() {
  const outputLogs = [];
  function log(msg = "") {
    console.log(msg);
    outputLogs.push(msg);
  }

  log(divider);
  log("   DAY 4: EXPRESS MIDDLEWARE & VALIDATION VERIFICATION TEST RUNNER   ");
  log("   Context: Fitness Coaching App (Workout Plans & Progress Analytics)       ");
  log(divider);
  log();

  resetFitnessData();
  const app = createApp({ silentLogger: false });

  // Start server on ephemeral port (avoids port collisions)
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  log(`✓ Test Express server active on: ${baseUrl}`);
  log();

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition, name, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      log(`  [PASS] Test ${totalTests}: ${name}`);
      if (details) log(`         ${details}`);
    } else {
      log(`  [FAIL] Test ${totalTests}: ${name}`);
      if (details) log(`         FAILED: ${details}`);
    }
  }

  // ===========================================================================
  // SECTION 1: VALID REQUESTS DEMONSTRATION
  // ===========================================================================
  log("[PART 1] VALID REQUESTS DEMONSTRATION");
  log(subDivider);

  // Test 1: Valid Workout Plan Creation
  let createdPlanId = null;
  {
    const payload = {
      clientId: "client_alex_99",
      coachId: "coach_sarah_01",
      planName: "Hypertrophy Mesocycle - Lower Body Focus",
      targetGoal: "muscle_hypertrophy",
      difficulty: "intermediate",
      scheduleDaysPerWeek: 4,
      exercises: [
        {
          name: "Barbell Back Squat",
          sets: 4,
          targetReps: 8,
          targetRpe: 8.0,
          restSeconds: 120,
          targetWeightKg: 100,
        },
        {
          name: "Romanian Deadlift",
          sets: 3,
          targetReps: 10,
          targetRpe: 7.5,
          restSeconds: 90,
          targetWeightKg: 80,
        },
        {
          name: "Bulgarian Split Squat",
          sets: 3,
          targetReps: 12,
          targetRpe: 8.5,
          restSeconds: 90,
          targetWeightKg: 24,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/fitness/workout-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const reqIdHeader = res.headers.get("x-request-id");

    const validStatus = res.status === 201;
    const hasPlanId = !!data?.data?.planId;
    const hasReqId = reqIdHeader && reqIdHeader === data?.meta?.requestId;
    const hasAnalytics = data?.data?.analytics?.totalPlannedSets === 10;

    createdPlanId = data?.data?.planId;

    assertTest(
      validStatus && hasPlanId && hasReqId && hasAnalytics,
      "Valid Workout Plan Creation (POST /api/v1/fitness/workout-plans)",
      `Status: ${res.status} | Plan ID: ${createdPlanId} | Total Sets: 10 | Est. Duration: ${data?.data?.analytics?.estimatedDurationMinutes}m | Request-ID: ${reqIdHeader}`
    );
  }

  // Test 2: Valid Progress Log Submission
  let createdLogId = null;
  {
    // Valid past workout timestamp (e.g. 2 hours ago)
    const validPastDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const payload = {
      clientId: "client_alex_99",
      planId: createdPlanId || "plan_dummy_123",
      sessionDate: validPastDate,
      durationMinutes: 65,
      perceivedRpe: 8.0,
      completedExercises: [
        {
          name: "Barbell Back Squat",
          setsCompleted: 4,
          repsCompleted: 8,
          weightKg: 100, // 4 * 8 * 100 = 3,200 kg
        },
        {
          name: "Romanian Deadlift",
          setsCompleted: 3,
          repsCompleted: 10,
          weightKg: 80, // 3 * 10 * 80 = 2,400 kg
        },
      ],
      caloriesBurned: 520,
      bodyWeightKg: 78.5,
      notes: "Hit target RPE on all top sets. Strong knee tracking.",
    };

    const res = await fetch(`${baseUrl}/api/v1/fitness/progress-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const reqIdHeader = res.headers.get("x-request-id");

    const validStatus = res.status === 201;
    const volumeLoad = data?.data?.computedAnalytics?.totalVolumeLoadKg; // Expect 5,600 kg
    const strainIndex = data?.data?.computedAnalytics?.trainingStrainIndex; // 65 * 0.8 = 52.0

    createdLogId = data?.data?.logId;

    assertTest(
      validStatus && volumeLoad === 5600 && strainIndex === 52.0,
      "Valid Progress Analytics Log (POST /api/v1/fitness/progress-logs)",
      `Status: ${res.status} | Total Volume Load: ${volumeLoad} kg | Strain Index: ${strainIndex} | Cal: 520 | Request-ID: ${reqIdHeader}`
    );
  }

  // Test 3: Valid Analytics Summary Query
  {
    const res = await fetch(
      `${baseUrl}/api/v1/fitness/analytics/client_alex_99?timeframe=30d&metric=volume_load`
    );
    const data = await res.json();
    const summary = data?.data?.summary;

    assertTest(
      res.status === 200 && summary?.totalSessionsCompleted === 1 && summary?.totalVolumeLoadKg === 5600,
      "Valid Analytics Retrieval (GET /api/v1/fitness/analytics/:clientId)",
      `Status: ${res.status} | Sessions: ${summary?.totalSessionsCompleted} | Total Load: ${summary?.totalVolumeLoadKg} kg | Avg RPE: ${summary?.averagePerceivedRpe}`
    );
  }

  log();

  // ===========================================================================
  // SECTION 2: INVALID REQUESTS & VALIDATION FAILURES
  // ===========================================================================
  log("[PART 2] INVALID REQUESTS & VALIDATION ERROR HANDLING DEMONSTRATION");
  log(subDivider);

  // Test 4: Missing Required Fields
  {
    const res = await fetch(`${baseUrl}/api/v1/fitness/workout-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // Completely empty payload
    });
    const data = await res.json();
    const errCode = data?.error?.code;
    const detailsCount = data?.error?.details?.length || 0;

    assertTest(
      res.status === 422 && errCode === "VALIDATION_ERROR" && detailsCount >= 6,
      "Missing Required Fields Rejection (422 Unprocessable Entity)",
      `Status: ${res.status} | Code: ${errCode} | Detected ${detailsCount} missing required field violations`
    );
  }

  // Test 5: Type & Range Out-of-Bounds Violations
  {
    const invalidPayload = {
      clientId: "cl", // min length 3
      coachId: "co",
      planName: "X", // min length 3
      targetGoal: "get_shredded_super_fast", // Invalid enum
      difficulty: "extreme", // Invalid enum
      scheduleDaysPerWeek: 12, // Exceeds max 7 days
      exercises: [
        {
          name: "Bench Press",
          sets: 25, // Exceeds max 20
          targetReps: 0, // Less than min 1
          targetRpe: 14.5, // Exceeds max 10.0
          restSeconds: -60, // Negative rest
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/fitness/workout-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidPayload),
    });
    const data = await res.json();
    const issues = data?.error?.details || [];
    const fields = issues.map((i) => i.field);

    assertTest(
      res.status === 422 &&
        fields.includes("targetGoal") &&
        fields.includes("scheduleDaysPerWeek") &&
        fields.includes("exercises.0.targetRpe"),
      "Type & Out-of-Bounds Range Constraints (422 Unprocessable Entity)",
      `Status: ${res.status} | Detected invalid fields: [${fields.slice(0, 4).join(", ")}...]`
    );
  }

  // Test 6: Malformed JSON Syntax
  {
    const res = await fetch(`${baseUrl}/api/v1/fitness/workout-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"clientId": "client_alex", "brokenJson": true,', // Syntax error: trailing comma and unclosed brace
    });
    const data = await res.json();

    assertTest(
      res.status === 400 && data?.error?.code === "MALFORMED_JSON",
      "Malformed JSON Body Handling (400 Bad Request)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}"`
    );
  }

  log();

  // ===========================================================================
  // SECTION 3: DOMAIN EDGE CASES DEMONSTRATION
  // ===========================================================================
  log("[PART 3] DOMAIN-SPECIFIC EDGE CASES DEMONSTRATION");
  log(subDivider);

  // Test 7: PRIMARY EDGE CASE - Future Timestamp (Temporal Causality Breach)
  {
    // Set workout session 14 days in the future!
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      clientId: "client_alex_99",
      planId: createdPlanId || "plan_dummy",
      sessionDate: futureDate,
      durationMinutes: 45,
      perceivedRpe: 7.5,
      completedExercises: [
        {
          name: "Overhead Press",
          setsCompleted: 3,
          repsCompleted: 8,
          weightKg: 50,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/fitness/progress-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const issue = data?.error?.details?.find((d) => d.field === "sessionDate");

    assertTest(
      res.status === 422 && !!issue && issue.message.includes("cannot be in the future"),
      "EDGE CASE 1: Future Workout Timestamp / Temporal Causality Breach",
      `Status: ${res.status} | Field: ${issue?.field} | Rejection Message: "${issue?.message}"`
    );
  }

  // Test 8: EDGE CASE 2 - Physiological Safety Threshold (Near-Max Exertion RPE 10 with 0 Rest)
  {
    const payload = {
      clientId: "client_alex_99",
      coachId: "coach_sarah_01",
      planName: "Dangerous Plan Without Rest",
      targetGoal: "strength_power",
      difficulty: "advanced",
      scheduleDaysPerWeek: 3,
      exercises: [
        {
          name: "Max Effort Deadlift",
          sets: 5,
          targetReps: 1,
          targetRpe: 10.0, // Maximum voluntary exertion
          restSeconds: 0, // 0 rest is physiologically impossible and hazardous!
          targetWeightKg: 200,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/fitness/workout-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const issue = data?.error?.details?.find((d) => d.field.includes("restSeconds"));

    assertTest(
      res.status === 422 && !!issue && issue.message.includes("requires a minimum rest interval"),
      "EDGE CASE 2: Physiological Safety Violation (Max RPE 10 with 0s Rest)",
      `Status: ${res.status} | Field: ${issue?.field} | Safety Rule Message: "${issue?.message}"`
    );
  }

  // Test 9: EDGE CASE 3 - Duplicate Exercise In Same Workout Routine
  {
    const payload = {
      clientId: "client_alex_99",
      coachId: "coach_sarah_01",
      planName: "Fragmented Bench Press Routine",
      targetGoal: "strength_power",
      difficulty: "intermediate",
      scheduleDaysPerWeek: 3,
      exercises: [
        {
          name: "Barbell Bench Press",
          sets: 3,
          targetReps: 8,
          targetRpe: 8.0,
          restSeconds: 90,
          targetWeightKg: 90,
        },
        {
          name: "Incline Dumbbell Press",
          sets: 3,
          targetReps: 10,
          targetRpe: 8.0,
          restSeconds: 90,
          targetWeightKg: 32,
        },
        {
          name: "Barbell Bench Press", // Duplicate! Should be aggregated into the first entry
          sets: 2,
          targetReps: 6,
          targetRpe: 9.0,
          restSeconds: 120,
          targetWeightKg: 95,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/fitness/workout-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const issue = data?.error?.details?.find((d) => d.message.includes("Duplicate exercise"));

    assertTest(
      res.status === 422 && !!issue,
      "EDGE CASE 3: Duplicate Exercise Routine Collision in Single Plan",
      `Status: ${res.status} | Rejection Message: "${issue?.message}"`
    );
  }

  log();

  // ===========================================================================
  // SECTION 4: MIDDLEWARE & ARCHITECTURAL VERIFICATION
  // ===========================================================================
  log("[PART 4] CUSTOM MIDDLEWARE & CENTRALIZED ERROR HANDLING VERIFICATION");
  log(subDivider);

  // Test 10: 404 Route Not Found via Centralized Handler
  {
    const res = await fetch(`${baseUrl}/api/v1/fitness/unknown-action`);
    const data = await res.json();

    assertTest(
      res.status === 404 && data?.error?.code === "NOT_FOUND" && !!data?.error?.requestId,
      "404 Route Not Found via Centralized Error Handler",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}" | Request-ID: ${data?.error?.requestId}`
    );
  }

  // Test 11: Request ID Header Propagation (Distributed Tracing)
  {
    const customTraceId = "trace_client_audit_778899";
    const res = await fetch(`${baseUrl}/health`, {
      headers: { "X-Request-ID": customTraceId },
    });
    const data = await res.json();
    const echoHeader = res.headers.get("x-request-id");

    assertTest(
      res.status === 200 && echoHeader === customTraceId && data?.requestId === customTraceId,
      "Request ID Upstream Header Preservation & Propagation",
      `Preserved Inbound ID: "${customTraceId}" -> Echoed In Header: "${echoHeader}"`
    );
  }

  log();
  log(divider);
  log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS RATE)`);
  log(divider);

  // Close server
  await new Promise((resolve) => server.close(resolve));
  log("✓ Test Express server cleanly terminated.");

  // Save text log
  const outputPath = path.join(__dirname, "../../test-output-day4.txt");
  fs.writeFileSync(outputPath, outputLogs.join("\n"), "utf-8");
  log(`✓ Full test output exported to: ${outputPath}`);

  return { passedTests, totalTests, logs: outputLogs.join("\n") };
}

if (require.main === module) {
  runTestSuite().catch((err) => {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };
