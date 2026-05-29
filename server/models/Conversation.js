import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }],
      required: true,
      validate: [
        function (val) {
          return val.length === 2;
        },
        "A conversation must have exactly 2 participants",
      ],
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },
    lastMessage: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ listing: 1, participants: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);
