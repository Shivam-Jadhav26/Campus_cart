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

describe("Offer and Chat Integration", () => {

  it("1. Conversation creation & 5. Data integrity & 4. Navigation", async () => {
    const sellerId = await seedUser("seller@chat.com", "Chat Seller");
    const buyerId = await seedUser("buyer@chat.com", "Chat Buyer");
    const listingId = await seedListing(sellerId);
    
    const cookiesBuyer = await loginAndGetCookies("buyer@chat.com");

    const offerRes = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookiesBuyer)
      .send({ amount: 450, message: "Will buy today!" });

    assert.equal(offerRes.status, 201);
    
    // 4. Navigation Test Requirement: Should return conversationId natively from offer response
    const conversationId = offerRes.body.data.conversationId;
    assert.ok(conversationId, "Server must expose conversationId payload securely mapping navigation workflows");

    // 1. Conversation creation & 5. Data integrity check
    const conversation = await mongoose.connection.collection("conversations").findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
    assert.ok(conversation, "Conversation physically exists mapping MongoDB storage");
    
    assert.equal(conversation.listing.toString(), listingId.toString(), "Data Integrity: conversation listing correctly matches offer listing");
    assert.equal(conversation.participants.length, 2);
    
    const participantsStr = conversation.participants.map(p => p.toString());
    assert.ok(participantsStr.includes(sellerId.toString()), "Includes Seller");
    assert.ok(participantsStr.includes(buyerId.toString()), "Includes Buyer");
    
    // Attempting a manual fetch similar to double routing logic
    const chatRes = await request(app)
        .post("/api/chat/conversations")
        .set("Cookie", cookiesBuyer)
        .send({ listingId: listingId.toString(), otherUserId: sellerId.toString() });

    assert.equal(chatRes.status, 200, "Should naturally fetch same conversation instantly without inserting duplicates");
    assert.equal(chatRes.body.data._id.toString(), conversationId.toString(), "API cleanly synced the returned duplicate instance");
  });

  it("2. Offer message sync", async () => {
    const sellerId = await seedUser("seller2@chat.com");
    const buyerId = await seedUser("buyer2@chat.com");
    const listingId = await seedListing(sellerId);
    const cookiesBuyer = await loginAndGetCookies("buyer2@chat.com");

    const offerRes = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookiesBuyer)
      .send({ amount: 375, message: "Take it or leave it" });

    const conversationId = offerRes.body.data.conversationId;

    // Open chat messages
    const msgRes = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set("Cookie", cookiesBuyer);

    assert.equal(msgRes.status, 200);
    const messages = msgRes.body.data;
    
    assert.equal(messages.length, 1, "Exactly one starting message should be integrated into the timeline");
    assert.equal(messages[0].type, "offer", "Message mapping matches specialized type");
    assert.match(messages[0].text, /375/, "Message contains dynamic data attributes mapping system events");
    assert.match(messages[0].text, /Take it or leave it/, "Message forwards description naturally");
  });

  it.only("3. Double request (High Frequency Chat Checks)", async () => {
    const sellerId = await seedUser("seller3@chat.com");
    const buyerId = await seedUser("buyer3@chat.com");
    const listingId = await seedListing(sellerId);
    const cookiesBuyer = await loginAndGetCookies("buyer3@chat.com");

    // Attack mapping Double Spam
    const reqs = Array.from({ length: 5 }).map(() => {
        return request(app)
            .post(`/api/chat/conversations`)
            .set("Cookie", cookiesBuyer)
            .send({ listingId: listingId.toString(), otherUserId: sellerId.toString() });
    });

    const results = await Promise.all(reqs);

    for (const res of results) {
        if (res.status !== 200) {
            console.error("FAIL", res.body, res.status);
        }
        assert.equal(res.status, 200);
    }
    
    const dbSize = await mongoose.connection.collection("conversations").countDocuments({ listing: new mongoose.Types.ObjectId(listingId) });
    assert.equal(dbSize, 1, "MongoDB natively repelled duplicate conversation instantiation loops mapping single entities via upsert schema index constraints");
  });

});
