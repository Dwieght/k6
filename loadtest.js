import http from "k6/http";
import { sleep, check } from "k6";

// 🔹 Load Test Options
export let options = {
  stages: [
    { duration: "30s", target: 5 }, // ramp up to 10 users
    { duration: "1m", target: 5 }, // hold 10 users
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests under 1000ms
    http_req_failed: ["rate<0.1"], // Error rate under 10%
  },
  tags: {
    testname: "Betting API Load Test",
    environment: "staging",
    version: "v1.0",
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL;

  if (!BASE_URL) {
    throw new Error("⚠️ BASE_URL environment variable is not set!");
  }

  // 🔹 STEP 1: LOGIN AND GET TOKEN
  console.log("🔐 Logging in to get bearer token...");

  const loginPayload = JSON.stringify({
    username: "dwieght",
    password: "1234",
  });

  const loginHeaders = {
    "Content-Type": "application/json",
  };

  // Login request (should be POST, not GET)
  let loginResponse = http.post(`${BASE_URL}/api/mobile/login`, loginPayload, {
    headers: loginHeaders,
  });

  // Check login success and extract token
  let bearerToken = null;

  check(loginResponse, {
    "Login successful": (r) => r.status === 200 || r.status === 201,
    "Login response has body": (r) => r.body && r.body.length > 0,
  });

  if (loginResponse.status === 200 || loginResponse.status === 201) {
    try {
      const loginData = JSON.parse(loginResponse.body);
      // Common token field names - adjust based on your API response
      bearerToken =
        loginData.token ||
        loginData.accessToken ||
        loginData.access_token ||
        loginData.bearerToken ||
        loginData.authToken ||
        loginData.jwt;

      console.log(`✅ Token extracted: ${bearerToken ? "SUCCESS" : "FAILED"}`);

      if (!bearerToken) {
        console.log("❌ Token not found in response:", loginResponse.body);
        return; // Exit early if no token
      }
    } catch (e) {
      console.log("❌ Failed to parse login response:", e.message);
      return;
    }
  } else {
    console.log(`❌ Login failed with status: ${loginResponse.status}`);
    console.log("Response body:", loginResponse.body);
    return;
  }

  sleep(1);

  // 🔹 STEP 2: USE TOKEN FOR AUTHENTICATED REQUESTS
  const authenticatedHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearerToken}`,
  };

  // 🔹 STEP 3: GET BETS
  console.log("🔍 Testing GET bets...");

  let getBetsResponse = http.get(`${BASE_URL}/api/mobile/bets`, {
    headers: authenticatedHeaders,
  });

  check(getBetsResponse, {
    "GET bets - status is 200": (r) => r.status === 200,
    "GET bets - response time < 1000ms": (r) => r.timings.duration < 1000,
    "GET bets - has response body": (r) => r.body && r.body.length > 0,
  });

  sleep(1);

  // 🔹 STEP 4: ADD/CREATE BET
  console.log("📝 Testing ADD bet...");

  const addBetPayload = JSON.stringify({
    gameType: "THREEDIGITS",
    number: "123",
    amount: 10,
    betType: "STRAIGHT",
  });

  let addBetResponse = http.post(`${BASE_URL}/api/mobile/bets`, addBetPayload, {
    headers: authenticatedHeaders,
  });

  check(addBetResponse, {
    "ADD bet - status is 200 or 201": (r) =>
      r.status === 200 || r.status === 201,
    "ADD bet - response time < 1000ms": (r) => r.timings.duration < 1000,
    "ADD bet - bet created successfully": (r) => {
      if (r.status === 200 || r.status === 201) {
        try {
          const json = JSON.parse(r.body);
          return (
            json &&
            (json.success === true || json.id || json.betId || json.message)
          );
        } catch (e) {
          return r.body.length > 0;
        }
      }
      return false;
    },
  });

  sleep(2);
}

// 🔹 Setup function (runs once before test starts)
export function setup() {
  console.log("🚀 Starting Betting API Load Test");
  console.log(`📍 Base URL: ${__ENV.BASE_URL}`);
  console.log("🔑 Will login dynamically to get bearer token");
  return {};
}

// 🔹 Teardown function (runs once after test completes)
export function teardown(data) {
  console.log("✅ Betting API Load Test completed");
}
