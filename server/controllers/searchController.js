import { generateAIResponse } from "../utils/aiService.js";
import Listing from "../models/Listing.js";

// ── In-Memory Cache (5-min TTL) ────────────────────
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @desc    AI-powered smart search using NVIDIA NIM to parse natural language queries
 * @route   POST /api/search
 * @access  Public
 */
export const smartSearch = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const sanitizedQuery = query.trim();
    const cacheKey = sanitizedQuery.toLowerCase();

    // ── Check Cache (with TTL) ─────────────────────────
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached._cachedAt < CACHE_TTL) {
        return res.status(200).json(cached.data);
      }
      searchCache.delete(cacheKey); // expired
    }

// ── Optimized AI Prompt (Expert Campus Training) ─────────────────────────────
    const validCategories = ["Electronics", "Stationery", "Books", "Lab Equipment", "Furniture", "Sports", "Clothing", "Other"];
    
    const prompt = `### Role:
You are the Expert AI Retrieval Assistant for CampusCart, a student-to-student marketplace. Your job is to extract search filters from unstructured, conversational queries.

### Context & Categories:
Students use this platform to buy/sell second-hand items within campus. You MUST categorize the query into exactly ONE of: ${validCategories.join(', ')}.

### Query to Parse:
"${sanitizedQuery}"

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

    const aiText = await generateAIResponse(prompt);

    if (!aiText) {
      throw new Error("Empty response from AI Service");
    }

    // ── Safe & Robust JSON Parsing ─────────────────────
    let parsed;
    try {
      // First, remove markdown code blocks if present
      let cleaned = aiText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      // Then, use regex to extract the first valid JSON object block
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const finalJson = jsonMatch ? jsonMatch[0] : cleaned;
      
      parsed = JSON.parse(finalJson);
      
      // Category Normalization & Validation (Case-Insensitive)
      if (parsed.category) {
        const found = validCategories.find(c => 
          c.toLowerCase() === String(parsed.category).toLowerCase().trim() ||
          String(parsed.category).toLowerCase().includes(c.toLowerCase())
        );
        parsed.category = found || "Other";
      } else {
        parsed.category = "Other";
      }

      // Ensure keywords is an array of strings
      if (!Array.isArray(parsed.keywords)) {
        parsed.keywords = [];
      } else {
        parsed.keywords = parsed.keywords
          .filter(k => typeof k === "string" && k.length > 0)
          .map(k => k.toLowerCase().trim());
      }

      // Price Range cleanup
      if (parsed.priceRange) {
        if (typeof parsed.priceRange.max !== 'number') parsed.priceRange.max = 0;
        if (typeof parsed.priceRange.min !== 'number') parsed.priceRange.min = 0;
      } else {
        parsed.priceRange = { min: 0, max: 0 };
      }

    } catch (parseError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("AI Response parsing failed, using production fallback:", aiText);
      }
      // Production Fallback
      parsed = {
        category: "electronics",
        keywords: [],
        priceRange: {}
      };
    }

    // ── Build MongoDB filters ──────────────────────────
    const filters = { status: "active" };

    // Use normalized category
    filters.category = { $regex: new RegExp(`^${parsed.category}$`, "i") };

    // Price Filter (max)
    const maxVal = parsed.priceRange?.max;
    if (typeof maxVal === "number" && maxVal > 0) {
      filters.price = { $lte: maxVal };
    }

    // Keyword Search — filter out keywords that just repeat the category name
    if (parsed.keywords.length > 0) {
      const categoryLower = parsed.category.toLowerCase();
      const safeKeywords = parsed.keywords
        .filter(k => typeof k === "string")
        .map(k => k.toLowerCase().trim())
        .filter(k => k !== categoryLower && !categoryLower.includes(k) && k.length > 1)
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      
      // Only apply keyword filter if meaningful keywords remain
      if (safeKeywords.length > 0) {
        const combinedRegex = safeKeywords.join("|");
        filters.$or = [
          { title: { $regex: combinedRegex, $options: "i" } },
          { description: { $regex: combinedRegex, $options: "i" } }
        ];
      }
      // If all keywords were just the category name, skip $or filter
      // and rely on category + price filters alone
    }

    // ── Query database ─────────────────────────────────
    const items = await Listing.find(filters).limit(20).lean();

    const responseData = {
      success: true,
      parsed,
      items,
    };

    // Save to cache (with timestamp for TTL)
    searchCache.set(cacheKey, { data: responseData, _cachedAt: Date.now() });

    return res.status(200).json(responseData);
  } catch (error) {
    if (error.response?.status === 429 || error.message?.includes("busy") || error.message?.includes("timed out")) {
      return res.status(429).json({
        success: false,
        message: "AI assistant is currently busy. Please try again in a few seconds."
      });
    }
    console.error("AI Search Error:", error.message);
    next(error);
  }
};
