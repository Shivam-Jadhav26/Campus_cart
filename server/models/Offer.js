import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    message: {
      type: String,
      maxlength: [500, "Message cannot exceed 500 characters"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    isReadBySeller: {
      type: Boolean,
      default: false,
    },
    isReadByBuyer: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce only one pending offer per buyer per listing
offerSchema.index(
  { listing: 1, buyer: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

// Compound index for listing and status
offerSchema.index({ listing: 1, status: 1 });

export default mongoose.model("Offer", offerSchema);
