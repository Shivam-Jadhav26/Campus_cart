import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";


/**
 * GET /api/listings
 * Public — get all active listings with optional filters and pagination.
 */
export const getListings = asyncHandler(async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { status: "active" };

  if (category) {
    filter.category = { $regex: new RegExp(`^${category}$`, "i") };
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .select("title price category condition status createdAt images sellerId")
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Listing.countDocuments(filter),
  ]);

  // Transform: add thumbnail but keep images for frontend compatibility
  const optimizedListings = listings.map(l => ({
    ...l,
    thumbnail: l.images && l.images.length > 0 ? l.images[0] : null
  }));

  res.status(200).json({
    listings: optimizedListings,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalListings: total,
  });
});

/**
 * GET /api/listings/my
 * Private — get all listings belonging to the authenticated user.
 */
export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ sellerId: req.user?._id || req.userId })
    .select("title price category condition status createdAt images")
    .sort({ createdAt: -1 })
    .lean();

  // Optimized for list view: add thumbnail but keep images
  const optimized = listings.map(l => ({
    ...l,
    thumbnail: l.images && l.images.length > 0 ? l.images[0] : null
  }));

  res.status(200).json(optimized);
});

/**
 * GET /api/listings/:id
 * Public — get a single listing by its ID.
 */
export const getListingById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid listing ID format" });
  }

  const listing = await Listing.findById(req.params.id)
    .populate("sellerId", "email");

  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  res.status(200).json(listing);
});

/**
 * POST /api/listings
 * Private — create a new listing. Supports direct image upload.
 */
export const createListing = asyncHandler(async (req, res) => {
  const { title, description, price, category, condition, contact } = req.body;
  let images = [];

  if (req.files && req.files.length > 0) {
    try {
      images = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype))
      );
    } catch (error) {
      return res.status(500).json({ success: false, message: "Image upload failed", error: error.message });
    }
  }

  const listing = await Listing.create({
    title,
    description,
    price,
    category,
    condition: condition || 'good',
    images,
    sellerId: req.user._id,
  });

  res.status(201).json({ success: true, data: listing });
});


/**
 * PATCH /api/listings/:id
 * Private — update a listing. Only the owner can update.
 */
export const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  // NOTE: Auth uses req.user._id now on the backend globally
  if (listing.sellerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized to update this listing" });
  }

  const allowedFields = ["title", "description", "price", "category", "status"];
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      listing[field] = req.body[field];
    }
  }

  if (req.files && req.files.length > 0) {
    try {
      const newImages = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype))
      );
      listing.images.push(...newImages);
    } catch (error) {
      return res.status(500).json({ success: false, message: "Image upload failed", error: error.message });
    }
  }

  await listing.save();

  res.status(200).json({ success: true, data: listing });
});

/**
 * DELETE /api/listings/:id/image
 * Private — remove an image from a listing
 */
export const deleteListingImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { publicId } = req.body;

  if (!publicId) {
    return res.status(400).json({ success: false, message: "publicId is required" });
  }

  const listing = await Listing.findById(id);

  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  if (listing.sellerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized to modify this listing" });
  }

  const imageExists = listing.images.some((img) => img.publicId === publicId);
  if (!imageExists) {
    return res.status(404).json({ success: false, message: "Image not found on this listing" });
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete image from storage", error: error.message });
  }

  listing.images = listing.images.filter((img) => img.publicId !== publicId);
  await listing.save();

  res.status(200).json({ success: true, data: listing });
});

/**
 * DELETE /api/listings/:id
 * Private — soft-delete a listing (set status to "removed"). Owner only.
 */
export const deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return res.status(404).json({ message: "Listing not found" });
  }

  if (listing.sellerId.toString() !== req.userId) {
    return res.status(403).json({ message: "Not authorized to delete this listing" });
  }

  listing.status = "removed";
  await listing.save();

  res.status(200).json({ message: "Listing removed successfully" });
});
