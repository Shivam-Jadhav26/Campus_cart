import { before, after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
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
  await mongoose.connection.collection("users").insertOne({
    email,
    name: "Test User",
    password: hashed,
    isVerified: true,
  });
};

describe("POST /api/auth/login", () => {
  
  it("1. Valid credentials", async () => {
    await createVerifiedUser("valid@example.com", "Secret123!");
    
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "valid@example.com", password: "Secret123!" });

    // Expect: success=true
    assert.equal(res.status, 200, "Should return HTTP 200 OK");
    assert.equal(res.body.success, true, "Success should be true");
    
    // Expect: user object returned
    assert.ok(res.body.data, "Expected a data object containing user in response");
    assert.equal(res.body.data.email, "valid@example.com", "Email in user data should match");
    
    // Verify: Password is NOT returned
    assert.ok(!res.body.data.password, "Password MUST NOT be returned in response");
    assert.ok(!res.body.password, "Password MUST NOT be returned at root level either");

    // Expect: authentication cookie set (Verify: Cookie is httpOnly)
    const cookies = res.headers["set-cookie"] || [];
    assert.ok(cookies.length > 0, "Authentication cookies should be set");
    
    let accessTokenCookieFound = false;
    for (const cookie of cookies) {
      if (cookie.startsWith("accessToken=")) {
        accessTokenCookieFound = true;
      }
      assert.match(cookie.toLowerCase(), /httponly/, "Cookies must be httpOnly");
    }
    assert.ok(accessTokenCookieFound, "Should set an accessToken cookie");
  });

  it("2. Wrong password", async () => {
    await createVerifiedUser("wrongpass@example.com", "RealPass123!");
    
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrongpass@example.com", password: "FakePass123!" });

    // Expect: 401 error
    assert.equal(res.status, 401, "Wrong password should return 401 HTTP status");
    // Proper error message
    assert.match(res.body.message, /invalid email or password/i, "Should contain proper error message");
  });

  it("3. Non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nope@example.com", password: "SomePassword1!" });

    // Expect: error (user not found) - same status as wrong pass
    assert.equal(res.status, 401, "Non-existent user should result in 401 error");
    assert.match(res.body.message, /invalid email or password/i, "Should contain proper error message");
  });

  it("4. Missing fields", async () => {
    // No email
    const resNoEmail = await request(app)
      .post("/api/auth/login")
      .send({ password: "SomePassword1!" });

    assert.equal(resNoEmail.status, 400, "Missing email should return 400 Bad Request");
    assert.match(resNoEmail.body.message, /email and password are required/i);

    // No password
    const resNoPass = await request(app)
      .post("/api/auth/login")
      .send({ email: "valid@example.com" });

    assert.equal(resNoPass.status, 400, "Missing password should return 400 Bad Request");
    assert.match(resNoPass.body.message, /email and password are required/i);
  });

  it("5. Invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "invalid-email-format", password: "Password123!" });

    // Expect validation error
    assert.equal(res.status, 400, "Invalid email format should return 400");
    assert.match(res.body.message, /invalid email format/i, "Should contain validation error message");
  });

  it("6. Security test (NoSQL injection payload)", async () => {
    await createVerifiedUser("victim@example.com", "Password123!");

    // Send an object instead of a string to try and bypass the matching
    const res = await request(app)
      .post("/api/auth/login")
      .send({ 
        email: { "$eq": "victim@example.com" }, 
        password: { "$gt": "" } 
      });

    // Check No server crash — it should handle gracefully
    assert.ok(res.status < 500, "Should not crash the server and return 500");
    // And it definitely shouldn't authenticate successfully using injection
    assert.notEqual(res.status, 200, "Should not authenticate with NoSQL payload");
  });
});
