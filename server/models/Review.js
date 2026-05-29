// CampusCart — Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// one review per reviewer per transaction
reviewSchema.index({ transactionId: 1, reviewerId: 1 }, { unique: true });

// index for looking up all reviews for a seller
reviewSchema.index({ sellerId: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
