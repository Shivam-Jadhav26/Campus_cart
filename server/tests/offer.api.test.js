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
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Helper functions for easy DB seeding
const seedUser = async (email, name = "Test User") => {
  const hashed = await bcrypt.hash("Password123!", 10);
  const result = await mongoose.connection.collection("users").insertOne({
    email,
    name,
    password: hashed,
    isVerified: true,
  });
  return result.insertedId;
};

const seedListing = async (sellerId, title = "Test iPhone") => {
  const result = await mongoose.connection.collection("listings").insertOne({
    sellerId,
    title,
    description: "Mint condition",
    price: 500,
    category: "Electronics",
    condition: "Like New",
    imageUrl: "http://example.com/img.jpg",
    status: "available",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return result.insertedId;
};

const loginAndGetCookies = async (email) => {
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  const rawCookies = res.headers["set-cookie"] || [];
  return Array.isArray(rawCookies) ? rawCookies.map(c => c.split(";")[0]).join("; ") : rawCookies.split(";")[0];
};

describe("POST /api/offers/:listingId", () => {
  
  it("1. Valid offer", async () => {
    // Setup Data
    const sellerId = await seedUser("seller@example.com", "Seller");
    const buyerId = await seedUser("buyer@example.com", "Buyer");
    const listingId = await seedListing(sellerId);
    
    const cookies = await loginAndGetCookies("buyer@example.com");

    const res = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookies)
      .send({ amount: 450, message: "Will buy today!" });

    // Expects
    assert.equal(res.status, 201, "Should return HTTP 201 Created");
    assert.equal(res.body.success, true);
    
    // Verifications (DB check & payload response check)
    assert.ok(res.body.data, "Should return the parsed offer");
    assert.equal(res.body.data.amount, 450);
    assert.equal(res.body.data.message, "Will buy today!", "Message optionally created");
    assert.equal(res.body.data.status, "pending", "Status should intrinsically be pending");
    
    // Check linkage
    assert.equal(res.body.data.buyer._id.toString(), buyerId.toString(), "Offer linked to buyer");
    assert.equal(res.body.data.listing._id.toString(), listingId.toString(), "Offer linked to listing");
    
    const offerInDb = await mongoose.connection.collection("offers").findOne({ _id: new mongoose.Types.ObjectId(res.body.data._id) });
    assert.ok(offerInDb, "Offer securely created in DB");
    assert.equal(offerInDb.seller.toString(), sellerId.toString(), "Offer natively holds seller linkage too");
  });

  it("2. Invalid amount", async () => {
    const sellerId = await seedUser("seller2@example.com");
    const buyerId = await seedUser("buyer2@example.com");
    const listingId = await seedListing(sellerId);
    const cookies = await loginAndGetCookies("buyer2@example.com");

    const res = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookies)
      .send({ amount: -10, message: "Lowballing heavily!" });

    assert.equal(res.status, 400, "Validation should reject amounts <= 0 natively");
    assert.match(res.body.message || "", /amount/i, "Validation error explains why");
  });

  it("3. Buyer = Seller (rejected)", async () => {
    const sellerId = await seedUser("cheatseller@example.com");
    const listingId = await seedListing(sellerId);
    const cookies = await loginAndGetCookies("cheatseller@example.com");

    const res = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookies)
      .send({ amount: 500 });
    
    assert.equal(res.status, 403, "Forbidden logic intercepts self-offers");
    assert.match(res.body.message, /own listing/i, "Reason specified correctly");
  });

  it("4. Duplicate pending offer", async () => {
    const sellerId = await seedUser("seller4@example.com");
    const buyerId = await seedUser("buyer4@example.com");
    const listingId = await seedListing(sellerId);
    const cookies = await loginAndGetCookies("buyer4@example.com");

    // First
    await request(app).post(`/api/offers/${listingId}`).set("Cookie", cookies).send({ amount: 480 });

    // Subsequent normal attempt mimicking typical UI interaction
    const res = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookies)
      .send({ amount: 490 });

    assert.equal(res.status, 400, "Duplicate tracking identifies multiple UI level spam");
    assert.match(res.body.message, /already have a pending/i);
    
    const offers = await mongoose.connection.collection("offers").countDocuments({ buyer: buyerId, listing: listingId });
    assert.equal(offers, 1, "Only one strictly allowed entry appended to DB");
  });

  it("5. Unauthorized", async () => {
    const sellerId = await seedUser("seller5@example.com");
    const listingId = await seedListing(sellerId);
    
    // No token (no cookies sent)
    const res = await request(app)
      .post(`/api/offers/${listingId}`)
      .send({ amount: 500 });

    assert.equal(res.status, 401, "Expected 401 for unauthorized endpoint hit");
    assert.match(res.body.message, /not authenticated/i);
  });

  it("6. High frequency / No Race Conditions", async () => {
    const sellerId = await seedUser("seller6@example.com");
    const buyerId = await seedUser("bots6@example.com");
    const listingId = await seedListing(sellerId);
    const cookies = await loginAndGetCookies("bots6@example.com");

    // Attack: Send multiple concurrent requests to identical pipeline
    const reqs = Array.from({ length: 5 }).map(() => {
        return request(app)
            .post(`/api/offers/${listingId}`)
            .set("Cookie", cookies)
            .send({ amount: 450 });
    });

    const results = await Promise.all(reqs);

    // Identify passes vs crashes (11000 parsing) vs locks
    let successes = 0;
    
    for (const res of results) {
        if (res.status === 201) successes++;
        // DB constraints correctly flag Duplicate Keys as 400 Client Errors rather than 500s directly protecting against crashes!
        assert.ok([201, 400].includes(res.status), `Server correctly identified race conditions seamlessly, Status: ${res.status}`);
    }

    assert.equal(successes, 1, "Exactly 1 successful entry persisted across 5 concurrent strikes");
    
    // DB raw check to ensure DB atomic index blocked overlapping transactions
    const dbSize = await mongoose.connection.collection("offers").countDocuments({ buyer: buyerId, listing: listingId });
    assert.equal(dbSize, 1, "Database correctly strictly guarded identical multi-thread insertions!");
  });

});
