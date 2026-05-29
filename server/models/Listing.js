// CampusCart — Listing.js
import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    condition: {
      type: String,
      required: false,
      default: 'good',
      enum: ['new', 'like-new', 'good', 'fair', 'poor']
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      index: true,
      enum: {
        values: [
          "Electronics",
          "Stationery",
          "Books",
          "Lab Equipment",
          "Furniture",
          "Sports",
          "Clothing",
          "Other",
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      default: [],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "sold", "reserved", "removed"],
      default: "active",
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// compound index for filtering by category + status
listingSchema.index({ category: 1, status: 1 });

// strip __v from JSON output
listingSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export default mongoose.model("Listing", listingSchema);
