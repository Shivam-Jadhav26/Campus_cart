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
    email: email.toLowerCase(),
    name,
    password: hashed,
    isVerified: true,
  });
  return result.insertedId;
};

const loginAndGetCookies = async (email) => {
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123!" });
  if (res.status !== 200) {
    console.error(`Login failed for ${email}:`, res.status, res.body);
  }
  const rawCookies = res.headers["set-cookie"] || [];
  return Array.isArray(rawCookies) ? rawCookies.map(c => c.split(";")[0]).join("; ") : rawCookies.split(";")[0];
};

describe("Full E2E Journey - Marketplace to Chat", () => {

  it("Executes end-to-end Buyer & Seller interaction correctly", async () => {
    // 1 & 2: User A and User B registers and logs in
    const userA_id = await seedUser("sellerA@journey.com", "Seller Alice");
    const userB_id = await seedUser("buyerB@journey.com", "Buyer Bob");
    
    const cookiesA = await loginAndGetCookies("sellerA@journey.com");
    const cookiesB = await loginAndGetCookies("buyerB@journey.com");

    // 3. User A creates listing
    const listingRes = await request(app)
      .post("/api/listings")
      .set("Cookie", cookiesA)
      .send({
        title: "Calculus Textbook",
        description: "Barely used, mostly cried on.",
        price: 45,
        category: "Books",
        condition: "good"
      });
    
    assert.equal(listingRes.status, 201, "User A successfully creates listing");
    const listingId = listingRes.body.data._id;
    
    // 4. User B views listing
    const viewListingRes = await request(app).get(`/api/listings/${listingId}`);
    assert.equal(viewListingRes.status, 200, "User B can view listing openly");
    assert.equal(viewListingRes.body.sellerId._id.toString(), userA_id.toString(), "Listing intrinsically mapped to Seller A");

    // 5. User B sends offer
    const offerRes = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookiesB)
      .send({ amount: 40, message: "Can you do 40?" });

    assert.equal(offerRes.status, 201, "User B submits offer successfully");
    const offerId = offerRes.body.data._id;
    
    // 6. System creates Offer, Conversation, Message (Validation)
    const conversationId = offerRes.body.data.conversationId;
    assert.ok(conversationId, "7. User B receives conversation index natively for immediate frontend routing");

    const messageCheckRes = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set("Cookie", cookiesB);
    
    assert.equal(messageCheckRes.status, 200);
    assert.equal(messageCheckRes.body.data.length, 1);
    assert.equal(messageCheckRes.body.data[0].type, "offer");
    assert.match(messageCheckRes.body.data[0].text, /40/);

    // 8. User A opens chat hub
    const chatHubRes = await request(app)
      .get("/api/chat/conversations")
      .set("Cookie", cookiesA);
    
    assert.equal(chatHubRes.status, 200, "User A fetches active conversations");
    assert.equal(chatHubRes.body.data.length, 1, "Exactly one conversation synced to Seller dashboard");
    assert.equal(chatHubRes.body.data[0]._id.toString(), conversationId.toString(), "Hub syncs precisely to identical conversation block");

    // 9. User A explicitly opens the message link
    const chatOpenRes = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set("Cookie", cookiesA);

    assert.equal(chatOpenRes.status, 200);
    const messagesA = chatOpenRes.body.data;
    assert.equal(messagesA.length, 1);
    assert.equal(messagesA[0].sender._id.toString(), userB_id.toString(), "Correct User mapping applied to payload");

    // 10. User A replies
    const replyRes = await request(app)
      .post("/api/chat/messages")
      .set("Cookie", cookiesA)
      .send({
        conversationId,
        text: "Sure, let's meet at the library."
      });

    assert.equal(replyRes.status, 201, "User A strictly replies to existing block natively");

    // Data Consistency Verification
    const conversationInDb = await mongoose.connection.collection("conversations").findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
    assert.equal(conversationInDb.offer.toString(), offerId.toString(), "Linkage Offer <-> Conversation firmly established");
    
    const dbMessagesTotal = await mongoose.connection.collection("messages").countDocuments({ conversation: conversationInDb._id });
    assert.equal(dbMessagesTotal, 2, "Exactly two messages total inside database preventing orphaned nodes");
    
    // Edge Case: Send multiple offers from same User B
    const duplicateOfferRes = await request(app)
      .post(`/api/offers/${listingId}`)
      .set("Cookie", cookiesB)
      .send({ amount: 45 });
      
    assert.equal(duplicateOfferRes.status, 400, "Edge Case Validated: Duplicates natively scrubbed off the system maintaining integrity");
    
    // Edge Case: Requesting chat natively via URL mimicking direct load
    const standaloneLoad = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set("Cookie", cookiesB);
      
    assert.equal(standaloneLoad.status, 200, "Edge Case Validated: Loading straight from routing resolves identically");
  });

});
