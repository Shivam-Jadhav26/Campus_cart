// CampusCart — listing.routes.js
import express from "express";
import {
  getListings,
  getMyListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  deleteListingImage,
} from "../controllers/listingController.js";
import { protect } from "../middlewares/authMiddleware.js";
import uploadImages from "../middlewares/upload.js";

const router = express.Router();

// Public routes
router.get("/", getListings);

// Private routes (must be before /:id to avoid conflict)
router.get("/my", protect, getMyListings);

// Public — single listing
router.get("/:id", getListingById);

// Private — CRUD
router.post("/", protect, uploadImages, createListing);

router.patch("/:id", protect, uploadImages, updateListing);
router.delete("/:id", protect, deleteListing);
router.delete("/:id/image", protect, deleteListingImage);

export default router;
