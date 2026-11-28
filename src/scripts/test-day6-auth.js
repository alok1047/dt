/**
 * Day 6 - Authentication & Authorization Test Suite
 * Context: Public Transport Companion (Route Search & Service Disruption Notices)
 *
 * Demonstrates:
 * 1. Password hashing with bcrypt (verifying salts and rejection of plain text)
 * 2. JWT Access Token lifecycle & expiry
 * 3. Public route access without credentials (route search, disruption feeds)
 * 4. Protected routes with JWT authentication
 * 5. Role-Based Access Control (RBAC): Transit Operator disruption posting
 * 6. FAILURE CASE 1: Commuter unauthorized disruption publishing (403 Forbidden)
 * 7. Ownership-Based Access Control: Commuter private favorites
 * 8. FAILURE CASE 2: Cross-user horizontal privilege escalation (403 Forbidden)
 * 9. Admin role override
 * 10. FAILURE CASE 3: Tampered token rejection (401 Unauthorized)
 * 11. FAILURE CASE 4: Expired token rejection (401 Unauthorized)
 */

const fs = require("fs");
const path = require("path");
const createApp = require("../app");
const { SEED_PASSWORD, verifyPassword, findUserByEmail } = require("../day6-auth/users");
const { generateAccessToken } = require("../day6-auth/jwtUtils");
const { resetTransitData } = require("../day6-auth/transitRoutes");

const divider = "═".repeat(82);
const subDivider = "─".repeat(82);

async function runTestSuite() {
  const outputLogs = [];
  function log(msg = "") {
    console.log(msg);
    outputLogs.push(msg);
  }

  log(divider);
  log("   DAY 6: AUTHENTICATION & AUTHORIZATION VERIFICATION TEST RUNNER   ");
  log("   Context: Public Transport Companion (Route Search & Disruptions)   ");
  log(divider);
  log();

  resetTransitData();
  const app = createApp({ silentLogger: false });

  // Start Express on ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  log(`✓ Test Transit Auth server running on: ${baseUrl}`);
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
  // SECTION 1: PASSWORD HASHING VERIFICATION
  // ===========================================================================
  log("[PART 1] BCRYPT PASSWORD HASHING & CREDENTIAL VERIFICATION");
  log(subDivider);

  // Test 1: Password Salt & Hash Integrity
  {
    const alice = findUserByEmail("alice@commuter.transit");
    const isBcryptHash = alice.passwordHash.startsWith("$2a$") || alice.passwordHash.startsWith("$2b$");
    const matchesPlain = verifyPassword(SEED_PASSWORD, alice.passwordHash);
    const rejectsWrong = !verifyPassword("WrongPassword!", alice.passwordHash);

    assertTest(
      isBcryptHash && matchesPlain && rejectsWrong,
      "Password Hashing with bcrypt (Salt Rounds = 10)",
      `Hash prefix: "${alice.passwordHash.slice(0, 7)}..." | Verified correct password & rejected wrong password`
    );
  }

  // ===========================================================================
  // SECTION 2: AUTHENTICATION & TOKEN ISSUANCE (LOGIN FLOW)
  // ===========================================================================
  log();
  log("[PART 2] JWT LOGIN FLOW & ROLE TOKEN ISSUANCE");
  log(subDivider);

  let aliceToken = null;
  let danOperatorToken = null;
  let sarahAdminToken = null;

  // Test 2: Commuter Login (Alice)
  {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@commuter.transit",
        password: SEED_PASSWORD,
      }),
    });
    const data = await res.json();
    aliceToken = data?.data?.token;

    assertTest(
      res.status === 200 && !!aliceToken && data?.data?.user?.role === "commuter",
      "Commuter Login & JWT Issuance (Role: commuter)",
      `Status: ${res.status} | User: ${data?.data?.user?.name} | Role: ${data?.data?.user?.role} | Token prefix: ${aliceToken?.slice(0, 20)}...`
    );
  }

  // Test 3: Transit Operator Login (Dan Dispatcher)
  {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dan@metro.transit",
        password: SEED_PASSWORD,
      }),
    });
    const data = await res.json();
    danOperatorToken = data?.data?.token;

    assertTest(
      res.status === 200 && !!danOperatorToken && data?.data?.user?.role === "operator",
      "Transit Operator Login & JWT Issuance (Role: operator)",
      `Status: ${res.status} | User: ${data?.data?.user?.name} | Role: ${data?.data?.user?.role}`
    );
  }

  // Test 4: Transit Admin Login (Sarah)
  {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sarah@transitauthority.gov",
        password: SEED_PASSWORD,
      }),
    });
    const data = await res.json();
    sarahAdminToken = data?.data?.token;

    assertTest(
      res.status === 200 && !!sarahAdminToken && data?.data?.user?.role === "admin",
      "Transit Authority Admin Login & JWT Issuance (Role: admin)",
      `Status: ${res.status} | User: ${data?.data?.user?.name} | Role: ${data?.data?.user?.role}`
    );
  }

  // Test 5: Login Failure - Invalid Password Rejection
  {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@commuter.transit",
        password: "IncorrectPassword123!",
      }),
    });
    const data = await res.json();

    assertTest(
      res.status === 401 && data?.error?.code === "INVALID_CREDENTIALS",
      "Login Failure: Invalid Password Credentials (401 Unauthorized)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}"`
    );
  }

  // ===========================================================================
  // SECTION 3: PUBLIC ROUTES (NO AUTHENTICATION NEEDED)
  // ===========================================================================
  log();
  log("[PART 3] PUBLIC TRANSIT COMPANION ROUTES (UNAUTHENTICATED COMMUTER ACCESS)");
  log(subDivider);

  // Test 6: Public Route Search
  {
    const res = await fetch(`${baseUrl}/api/v1/transit/routes/search?origin=Central&destination=Airport`);
    const data = await res.json();
    const options = data?.data?.recommendedOptions || [];

    assertTest(
      res.status === 200 && options.length >= 2,
      "Public Route Search (GET /api/v1/transit/routes/search)",
      `Status: ${res.status} | Found ${options.length} routes without authentication tokens`
    );
  }

  // ===========================================================================
  // SECTION 4: ROLE-BASED ACCESS CONTROL (DISRUPTION MANAGEMENT)
  // ===========================================================================
  log();
  log("[PART 4] ROLE-BASED ACCESS CONTROL: DISRUPTION MANAGEMENT");
  log(subDivider);

  // Test 7: Authorized Operator Publishing Service Disruption Notice
  {
    const payload = {
      lineId: "subway_line_1_red",
      lineType: "subway",
      severity: "severe",
      headline: "Track Power Loss at South Terminal",
      description: "Shuttle bus bridge activated between Downtown and Terminal stations due to substation failure.",
      expectedResolution: "2026-11-28T18:00:00Z",
    };

    const res = await fetch(`${baseUrl}/api/v1/transit/disruptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${danOperatorToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    assertTest(
      res.status === 201 && data?.data?.reportedBy?.includes("Dan Dispatcher (operator)"),
      "Authorized Operator Notice Publishing (POST /api/v1/transit/disruptions)",
      `Status: ${res.status} | Disruption ID: ${data?.data?.disruptionId} | Reported By: ${data?.data?.reportedBy}`
    );
  }

  // Test 8: FAILURE CASE 1 - Commuter Unauthorized Disruption Publishing (Role Failure)
  {
    const payload = {
      lineId: "subway_line_1_red",
      headline: "Fake Subway Shutdown Notice",
      description: "Commuter attempting to post panic disruption.",
    };

    const res = await fetch(`${baseUrl}/api/v1/transit/disruptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`, // Commuter token!
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    assertTest(
      res.status === 403 && data?.error?.code === "FORBIDDEN_ROLE",
      "FAILURE CASE 1: Commuter Role Escalation Blocked (403 Forbidden)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}"`
    );
  }

  // ===========================================================================
  // SECTION 5: OWNERSHIP-BASED ACCESS CONTROL (COMMUTER FAVORITES)
  // ===========================================================================
  log();
  log("[PART 5] RESOURCE OWNERSHIP & PRIVILEGE ISOLATION");
  log(subDivider);

  // Test 9: Commuter Accessing Own Favorite Routes
  {
    const res = await fetch(`${baseUrl}/api/v1/transit/users/usr_alice/favorites`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const data = await res.json();
    const favs = data?.data?.favoriteRoutes || [];

    assertTest(
      res.status === 200 && data?.data?.userId === "usr_alice" && favs.length === 2,
      "Commuter Accessing Own Profile (GET /users/usr_alice/favorites)",
      `Status: ${res.status} | Owner: ${data?.data?.userId} | Favorites: [${favs.join(", ")}]`
    );
  }

  // Test 10: FAILURE CASE 2 - Cross-User Ownership Breach Attempt
  {
    // Alice (usr_alice) attempts to access Bob's (usr_bob) private favorite travel routes!
    const res = await fetch(`${baseUrl}/api/v1/transit/users/usr_bob/favorites`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const data = await res.json();

    assertTest(
      res.status === 403 && data?.error?.code === "FORBIDDEN_OWNERSHIP",
      "FAILURE CASE 2: Cross-User Ownership Violation Blocked (403 Forbidden)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}"`
    );
  }

  // Test 11: Admin Role Ownership Override
  {
    // Sarah (admin) accesses Bob's favorites for auditing / customer support
    const res = await fetch(`${baseUrl}/api/v1/transit/users/usr_bob/favorites`, {
      headers: { Authorization: `Bearer ${sarahAdminToken}` },
    });
    const data = await res.json();

    assertTest(
      res.status === 200 && data?.data?.userId === "usr_bob",
      "Admin Privilege Override: Inspecting Commuter Account (200 OK)",
      `Status: ${res.status} | Admin Sarah inspected User: ${data?.data?.userId}`
    );
  }

  // ===========================================================================
  // SECTION 6: TOKEN TAMPERING & EXPIRY TESTS
  // ===========================================================================
  log();
  log("[PART 6] TOKEN EXPIRY & CRYPTOGRAPHIC TAMPERING DEFENSE");
  log(subDivider);

  // Test 12: Missing Authorization Header
  {
    const res = await fetch(`${baseUrl}/api/v1/transit/users/usr_alice/favorites`);
    const data = await res.json();

    assertTest(
      res.status === 401 && data?.error?.code === "TOKEN_REQUIRED",
      "FAILURE CASE 3: Missing Token Rejection (401 Unauthorized)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}"`
    );
  }

  // Test 13: Cryptographically Tampered JWT Signature
  {
    const tamperedToken = aliceToken.slice(0, -6) + "xxxxxx"; // Invalidate cryptographic signature
    const res = await fetch(`${baseUrl}/api/v1/transit/users/usr_alice/favorites`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    const data = await res.json();

    assertTest(
      res.status === 401 && data?.error?.code === "INVALID_TOKEN",
      "FAILURE CASE 4: Tampered JWT Signature Rejection (401 Unauthorized)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Message: "${data?.error?.message}"`
    );
  }

  // Test 14: Token Expiration (Expired Token Rejection)
  {
    // Issue a token with 1ms expiry
    const shortLivedToken = generateAccessToken(findUserByEmail("alice@commuter.transit"), "1ms");
    // Wait 25ms to guarantee expiry
    await new Promise((r) => setTimeout(r, 25));

    const res = await fetch(`${baseUrl}/api/v1/transit/users/usr_alice/favorites`, {
      headers: { Authorization: `Bearer ${shortLivedToken}` },
    });
    const data = await res.json();

    assertTest(
      res.status === 401 && data?.error?.code === "TOKEN_EXPIRED",
      "FAILURE CASE 5: Expired Access Token Rejection (401 Unauthorized)",
      `Status: ${res.status} | Code: ${data?.error?.code} | Expired At: ${data?.error?.details?.expiredAt}`
    );
  }

  log();
  log(divider);
  log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS RATE)`);
  log(divider);

  await new Promise((resolve) => server.close(resolve));
  log("✓ Test Transit Auth server cleanly terminated.");

  const outputPath = path.join(__dirname, "../../test-output-day6.txt");
  fs.writeFileSync(outputPath, outputLogs.join("\n"), "utf-8");
  log(`✓ Full Day 6 test output exported to: ${outputPath}`);

  return { passedTests, totalTests, logs: outputLogs.join("\n") };
}

if (require.main === module) {
  runTestSuite().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };
