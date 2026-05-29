import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load ENV
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const API_KEY = process.env.HF_API_KEY;
const AI_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DATA_MODEL = "meta/llama-3.1-8b-instruct";

const validCategories = ["Electronics", "Stationery", "Books", "Lab Equipment", "Furniture", "Sports", "Clothing", "Other"];

async function getAIResponse(query) {
  const prompt = `### Role:
You are the Expert AI Retrieval Assistant for CampusCart, a student-to-student marketplace. Your job is to extract search filters from unstructured, conversational queries.

### Context & Categories:
Students use this platform to buy/sell second-hand items within campus. You MUST categorize the query into exactly ONE of: ${validCategories.join(', ')}.

### Query to Parse:
"${query}"

### Expert Training (Few-Shot Examples):
* User: "I need a hoodie and t-shirt" -> {"category": "Clothing", "keywords": ["hoodie", "t-shirt"], "priceRange": {"min": 0, "max": 0}}
* User: "Looking for a cheap desk under 500" -> {"category": "Furniture", "keywords": ["desk", "table"], "priceRange": {"min": 0, "max": 500}}
* User: "Engineering books 4th sem IT branch" -> {"category": "Books", "keywords": ["engineering", "books", "4th", "sem", "IT"], "priceRange": {"min": 0, "max": 0}}
* User: "Scientific calculator Casio" -> {"category": "Electronics", "keywords": ["calculator", "casio"], "priceRange": {"min": 0, "max": 0}}
* User: "I want to buy a second hand cycle or bike" -> {"category": "Other", "keywords": ["cycle", "bicycle", "bike"], "priceRange": {"min": 0, "max": 0}}
* User: "Drawing board for first year" -> {"category": "Lab Equipment", "keywords": ["drawing board", "drafter", "A1"], "priceRange": {"min": 0, "max": 0}}
* User: "iPhone 13 within 40k" -> {"category": "Electronics", "keywords": ["iphone", "13", "apple"], "priceRange": {"min": 0, "max": 40000}}

### Extraction Protocol:
1. Return ONLY the JSON object. No intro text, no markdown code blocks.
2. Infer the "category" strictly from the provided list.
3. Extract product "keywords" that effectively search the database. Include synonyms if relevant.
4. "priceRange.max" must be extracted from phrases like "under", "below", "within", "for", "budget".
5. Defaults: category="Other", keywords=[], priceRange={min:0, max:0}.

### Object Schema:
{
"category": "String",
"keywords": ["String"],
"priceRange": { "min": Number, "max": Number }
}`;

  try {
    const response = await axios.post(AI_ENDPOINT, {
      model: DATA_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    }, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    const content = response.data?.choices?.[0]?.message?.content;
    return content.trim();
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

const testCases = [
  "I need a second hand cycle for 2000",
  "Looking for FY BTech books",
  "iPhone charger and cable",
  "scientific calculator under 1000",
  "matress and pillow for hostel",
  "basketball or football",
  "drawing board and drafter",
  "laptop stand for desk",
  "water bottle and tiffin",
  "engineering graphics drawing desk",
  "cheap smartphone within 10000",
  "blue hoodie size M",
  "physics lab manual",
  "badminton racket",
  "study table for room"
];

async function runTests() {
  console.log("🚀 Starting AI Assistant Behavior Testing...\n");
  const results = [];

  for (const query of testCases) {
    console.log(`🔍 Query: "${query}"`);
    const aiResponse = await getAIResponse(query);
    console.log(`🤖 AI: ${aiResponse}\n`);
    results.push({ query, response: aiResponse });
    // avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n✅ Testing Complete.");
}

runTests();
