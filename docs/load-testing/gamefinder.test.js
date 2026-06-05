/**
 * GameFinder — Load Test
 * Usage:
 *   k6 run gamefinder.test.js                        # 100 users (default)
 *   k6 run -e SCENARIO=medium gamefinder.test.js     # 500 users
 *   k6 run -e SCENARIO=large  gamefinder.test.js     # 1000 users
 *   k6 run -e SCENARIO=all    gamefinder.test.js     # ramp 100→500→1000
 *
 * Requires k6: brew install k6
 */

import http from "k6/http";
import ws from "k6/ws";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom metrics ───────────────────────────────────────────────────────────
const loginSuccess    = new Rate("login_success");
const lobbyListTime   = new Trend("lobby_list_duration");
const lobbyCreateTime = new Trend("lobby_create_duration");
const wsConnectTime   = new Trend("ws_connect_duration");
const authErrors      = new Counter("auth_errors");

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "https://localhost:8443";

// Disable TLS verification for self-signed cert
export const options = {
  insecureSkipTLSVerify: true,
  thresholds: {
    http_req_failed:        ["rate<0.05"],          // <5% errors
    http_req_duration:      ["p(95)<2000"],          // 95th percentile <2s
    login_success:          ["rate>0.95"],            // >95% login success
    lobby_list_duration:    ["p(95)<1500"],
    lobby_create_duration:  ["p(95)<2000"],
  },
  scenarios: buildScenarios(),
};

function buildScenarios() {
  const scenario = __ENV.SCENARIO || "small";

  const small = {
    default: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },  // ramp-up
        { duration: "2m",  target: 100 },  // steady
        { duration: "30s", target: 0   },  // ramp-down
      ],
    },
  };

  const medium = {
    default: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m",  target: 500 },
        { duration: "3m",  target: 500 },
        { duration: "30s", target: 0   },
      ],
    },
  };

  const large = {
    default: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m",  target: 1000 },
        { duration: "5m",  target: 1000 },
        { duration: "1m",  target: 0    },
      ],
    },
  };

  // Full ramp: 100 → 500 → 1000 → down
  const all = {
    default: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m",  target: 100  },
        { duration: "2m",  target: 100  },
        { duration: "1m",  target: 500  },
        { duration: "3m",  target: 500  },
        { duration: "2m",  target: 1000 },
        { duration: "5m",  target: 1000 },
        { duration: "1m",  target: 0    },
      ],
    },
  };

  return { small, medium, large, all }[scenario] || small;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const headers = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uniqueUser() {
  // __VU (1-N) guarantees one stable account per virtual user for the whole test
  const id = `${__VU}`;
  return { username: `k6_${id}`, email: `k6_${id}@loadtest.dev`, password: "TestPass123!" };
}

// ─── VU-scoped state ──────────────────────────────────────────────────────────
// Each VU is an isolated JS context: this token persists across the VU's iterations.
// A real user authenticates ONCE then browses many times — we model exactly that,
// so register/login cost is amortized instead of paid on every iteration (no bcrypt bias).
let vuToken = null;

function authenticateOnce() {
  if (vuToken) return vuToken; // already logged in this VU → reuse token

  const user = uniqueUser();

  group("auth", () => {
    // Register (idempotent across test re-runs: 400 "already exists" is fine, we just login)
    const regRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({ username: user.username, email: user.email, password: user.password }),
      { headers: headers(), tags: { name: "register" } }
    );
    check(regRes, { "register 201 or already-exists": (r) => r.status === 201 || r.status === 400 });

    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: headers(), tags: { name: "login" } }
    );
    const loginOk = check(loginRes, {
      "login 200/201": (r) => r.status === 200 || r.status === 201,
      "has token":     (r) => {
        try { return !!JSON.parse(r.body).accessToken; } catch { return false; }
      },
    });
    loginSuccess.add(loginOk);
    if (!loginOk) { authErrors.add(1); return; }

    try { vuToken = JSON.parse(loginRes.body).accessToken; } catch {}
  });

  return vuToken;
}

// ─── Steady-state journey: authenticate once, then browse repeatedly ──────────
export default function () {
  let lobbyId = null;

  // Authenticate once per VU; every later iteration reuses the cached token
  const token = authenticateOnce();
  if (!token) { sleep(1); return; }

  sleep(randomInt(1, 2));

  // 3. Get own profile
  group("profile", () => {
    const meRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: headers(token),
      tags: { name: "auth/me" },
    });
    check(meRes, { "profile 200": (r) => r.status === 200 });
  });

  sleep(randomInt(1, 2));

  // 4. Browse lobbies
  group("lobbies_browse", () => {
    const start = Date.now();
    const listRes = http.get(`${BASE_URL}/api/lobbies`, {
      headers: headers(token),
      tags: { name: "lobbies/list" },
    });
    lobbyListTime.add(Date.now() - start);
    check(listRes, { "lobbies list 200": (r) => r.status === 200 });
  });

  sleep(randomInt(1, 3));

  // 5. Create a lobby (only ~30% of users to avoid DB flooding)
  if (Math.random() < 0.3) {
    group("lobby_create", () => {
      const start = Date.now();
      const createRes = http.post(
        `${BASE_URL}/api/lobbies`,
        JSON.stringify({
          name:       `Lobby_${__VU}_${__ITER}`,
          maxPlayers: randomInt(2, 4),   // DTO: Min(2) Max(4)
        }),
        { headers: headers(token), tags: { name: "lobbies/create" } }
      );
      lobbyCreateTime.add(Date.now() - start);
      const ok = check(createRes, { "lobby created 201": (r) => r.status === 201 });
      if (ok) {
        try { lobbyId = JSON.parse(createRes.body).id; } catch {}
      }
    });
  }

  sleep(randomInt(1, 2));

  // 6. Search users
  group("user_search", () => {
    const searchRes = http.get(`${BASE_URL}/api/users/search?q=user`, {
      headers: headers(token),
      tags: { name: "users/search" },
    });
    check(searchRes, { "search 200": (r) => r.status === 200 });
  });

  sleep(randomInt(1, 2));

  // 7. WebSocket connection — NestJS gateway listens on backend port directly
  if (Math.random() < 0.2) {
    group("websocket", () => {
      // Backend WS is exposed on port 3001 (not proxied through nginx)
      const WS_URL = __ENV.WS_URL || "ws://localhost:3001";
      const start = Date.now();

      const res = ws.connect(
        `${WS_URL}/socket.io/?EIO=4&transport=websocket`,
        {
          headers: { Authorization: `Bearer ${token}` },
          tags: { name: "websocket" },
        },
        (socket) => {
          wsConnectTime.add(Date.now() - start);
          socket.on("open",  () => check(null, { "ws connected": () => true }));
          socket.on("error", () => check(null, { "ws connected": () => false }));
          socket.setTimeout(() => socket.close(), 5000);
        }
      );
      check(res, { "ws status 101": (r) => r && r.status === 101 });
    });
  }

  // 8. Ping (last-seen update)
  http.patch(`${BASE_URL}/api/users/me/ping`, null, {
    headers: headers(token),
    tags: { name: "users/ping" },
  });

  sleep(randomInt(2, 5));
}
