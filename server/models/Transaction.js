// CampusCart — Transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "paid", "delivered", "completed", "refunded", "disputed"],
      default: "pending",
    },
    escrowStatus: {
      type: String,
      enum: ["not_applicable", "holding", "released", "refunded"],
      default: "not_applicable",
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    deliveryMethod: {
      type: String,
      enum: ["peer_delivery", "courier", "in_person_pickup"],
      default: "in_person_pickup",
    },
    returnWindowExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// indexes for common queries
transactionSchema.index({ buyerId: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, createdAt: -1 });
transactionSchema.index({ listingId: 1 });

export default mongoose.model("Transaction", transactionSchema);
