import { before, after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;
let mongod;

const loadApp = async () => {
  return (await import("../server.js")).default;
};

before(async () => {
  mongod = await MongoMemoryServer.create();

  process.env.MONGO_URI = mongod.getUri();
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.BASE_URL = "http://localhost:5000";
  process.env.SESSION_SECRET = "test_session_secret";
  process.env.ACCESS_TOKEN_SECRET = "test_access_token_secret_must_be_64_characters_long_for_production_aa";
  process.env.NODE_ENV = "test";
  
  app = await loadApp();
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

const createVerifiedUser = async (email = "test@example.com", password = "Password123!") => {
  const hashed = await bcrypt.hash(password, 10);
  const result = await mongoose.connection.collection("users").insertOne({
    email,
    name: "Test User",
    password: hashed,
    isVerified: true,
  });
  return result.insertedId;
};

const loginAndGetCookiesRaw = async (email, password) => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.headers["set-cookie"] || [];
};

const getCookieString = (rawCookies) => {
    return Array.isArray(rawCookies) ? rawCookies.map(c => c.split(";")[0]).join("; ") : rawCookies.split(";")[0];
};

describe("POST /api/auth/refresh", () => {
  
  it("1. Valid refresh token", async () => {
    await createVerifiedUser("valid@example.com", "Password123!");
    const rawCookies = await loginAndGetCookiesRaw("valid@example.com", "Password123!");
    const cookies = getCookieString(rawCookies);

    // Initial access token
    const oldAccessTokenMatch = cookies.match(/accessToken=([^;]+)/);
    const oldAccessToken = oldAccessTokenMatch ? oldAccessTokenMatch[1] : null;

    // Small delay to ensure 'iat' claim in JWT changes (seconds precision)
    await new Promise(resolve => setTimeout(resolve, 1100));

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookies)
      .send();

    assert.equal(res.status, 200, "Should return HTTP 200 OK");
    assert.equal(res.body.success, true, "Should return success: true");
    assert.ok(res.body.token, "Should return new access token in payload");
    assert.notEqual(res.body.token, oldAccessToken, "New token must be different than old one");

    // Check cookies to ensure both access and refresh tokens are rotated
    const newRawCookies = res.headers["set-cookie"] || [];
    const newCookies = getCookieString(newRawCookies);
    
    // Check old token is invalidated conceptually by issuing new ones mapping to previous session rules
    assert.match(newCookies, /refreshToken=/, "Should set a new refresh token cookie");
    assert.notEqual(newCookies, cookies, "New cookie string should be completely distinct from original");
  });

  it("2. Missing refresh token", async () => {
    // Call without any cookies
    const res = await request(app)
      .post("/api/auth/refresh")
      .send();

    assert.equal(res.status, 401, "Should return 401 Unauthorized for missing token");
    assert.match(res.body.message, /missing/i, "Message should indicate missing token");
  });

  it("3. Expired refresh token", async () => {
    const userId = await createVerifiedUser("expired@example.com", "Password123!");
    
    // Insert an expired refresh token into the database
    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const hashedRefresh = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
    
    await mongoose.connection.collection("refreshtokens").insertOne({
        user: userId,
        token: hashedRefresh,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        createdAt: new Date(),
        updatedAt: new Date()
    });

    const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", `refreshToken=${rawRefreshToken}`)
        .send();

    assert.equal(res.status, 403, "Expired token should be rejected (403 or 401)");
    assert.match(res.body.message, /invalid or expired/i, "Should complain about expiration");
    
    // Test that the framework clears the unauthorized cookie string
    const cookiesReturned = res.headers["set-cookie"] || [];
    assert.ok(cookiesReturned.length > 0, "Cookie should be explicitly cleared safely");
  });

  it("4. Tampered token", async () => {
    await createVerifiedUser("tampered@example.com", "Password123!");
    const rawCookies = await loginAndGetCookiesRaw("tampered@example.com", "Password123!");
    
    const cookies = getCookieString(rawCookies);
    const tampered = cookies.replace(/refreshToken=[a-zA-Z0-9]+/, "refreshToken=abadf00dtampered000token000here000"); // manual edit

    const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", tampered)
        .send();

    assert.equal(res.status, 403, "Tampered token should not be accepted (403)");
    assert.match(res.body.message, /invalid or expired/i, "Should complain about token validity");
  });

  it("5. Multiple refresh calls & Idempotency", async () => {
    await createVerifiedUser("multi@example.com", "Password123!");
    const rawCookies = await loginAndGetCookiesRaw("multi@example.com", "Password123!");
    const cookies = getCookieString(rawCookies);

    // Call /refresh 3 times using the SAME original token concurrently (common in multi-tab initial loads)
    const reqs = Array.from({ length: 3 }).map(() => {
        return request(app)
            .post("/api/auth/refresh")
            .set("Cookie", cookies)
            .send();
    });

    const results = await Promise.all(reqs);

    // We verify "No duplicate sessions or crashes" & Grace Window logic
    // The first one might rotate successfully (200)
    // The subsequent requests hit the exact same token inside the "grace window"
    // So they should return 200 as well and the DB should handle it safely
    let crashes = 0;
    
    for (const res of results) {
        if (res.status >= 500) crashes++;
        // Check for 200s (since grace window allows concurrent old requests briefly) or 403s
        assert.ok([200, 403].includes(res.status), `Concurrency should return 200/403, got ${res.status}`);
    }

    assert.equal(crashes, 0, "Repeated concurrent requests MUST not crash the server");
    
    // Check there are no massive duplicated sessions mapping to the user
    const dbTokens = await mongoose.connection.collection("refreshtokens").find({ replacedBy: { $exists: false } }).toArray();
    
    // Should roughly be bounded indicating DB was not catastrophically leaked
    assert.ok(dbTokens.length < 5, "Database shouldn't leak excessive tokens");
  });

  it("6. Security checks", async () => {
    await createVerifiedUser("security@example.com", "Password123!");
    const rawCookies = await loginAndGetCookiesRaw("security@example.com", "Password123!");
    const cookies = getCookieString(rawCookies);

    const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookies)
        .send();

    // Verify successful Request
    assert.equal(res.status, 200, "Should be HTTP 200");

    // Sensitive data
    assert.ok(res.body.data === undefined, "No sensitive raw user data is pushed in a refresh cycle");
    
    // Cookies security
    const newRawCookies = res.headers["set-cookie"] || [];
    let refreshChecked = false;

    // Both access & refresh are rotated
    for (const cookie of newRawCookies) {
        if (cookie.startsWith("refreshToken=")) {
            refreshChecked = true;
            assert.match(cookie.toLowerCase(), /httponly/, "Refresh token MUST specifically be HTTPOnly");
        }
    }
    
    if (!refreshChecked) {
        console.error("DEBUG-FAIL: newRawCookies are: ", newRawCookies);
    }
    assert.ok(refreshChecked, "Refresh token should exist safely in the response");
  });

});
