import express from "express";
import { smartSearch } from "../controllers/searchController.js";

const router = express.Router();

/**
 * @route   POST /api/search/assistant-search
 * @desc    AI-powered smart search using Hugging Face
 * @access  Public (or Protected if needed)
 */
router.post("/assistant-search", smartSearch);

export default router;
