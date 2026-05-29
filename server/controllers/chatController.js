import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Listing from "../models/Listing.js";
import mongoose from "mongoose";
import asyncHandler from "../middlewares/asyncHandler.js";
import { getIO } from "../sockets/io.js";

// @desc    Get or create a conversation (race-condition safe via unique index)
// @route   POST /api/chat/conversations
// @access  Private
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { listingId, otherUserId } = req.body;

  if (!listingId || !otherUserId) {
    return res.status(400).json({
      success: false,
      message: "listingId and otherUserId are required",
    });
  }

  // Validate ObjectIds
  if (
    !mongoose.Types.ObjectId.isValid(listingId) ||
    !mongoose.Types.ObjectId.isValid(otherUserId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid listingId or otherUserId",
    });
  }

  // Prevent user from chatting with themselves
  if (req.user._id.toString() === otherUserId.toString()) {
    return res.status(400).json({
      success: false,
      message: "Cannot create a conversation with yourself",
    });
  }

  // Verify the listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return res.status(404).json({
      success: false,
      message: "Listing not found",
    });
  }

  // Sort participants for consistent unique index matching
  const sortedParticipants = [
    req.user._id.toString(),
    otherUserId.toString(),
  ].sort();

  // Try to find existing conversation first
  let conversation = await Conversation.findOne({
    listing: listingId,
    participants: { $all: sortedParticipants, $size: 2 },
  });

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        participants: sortedParticipants,
        listing: listingId,
        lastMessageAt: Date.now(),
      });
    } catch (error) {
      // Handle race condition: another request created it between find and create
      if (error.code === 11000) {
        conversation = await Conversation.findOne({
          listing: listingId,
          participants: { $all: sortedParticipants, $size: 2 },
        });
        if (!conversation) {
          return res.status(500).json({
            success: false,
            message: "Failed to create conversation",
          });
        }
      } else {
        throw error;
      }
    }
  }

  const populatedConv = await Conversation.findById(conversation._id)
    .populate("participants", "name email avatar")
    .populate("listing", "title price images");

  res.status(200).json({ success: true, data: populatedConv });
});

// @desc    Get all conversations for logged-in user with pagination and projection
// @route   GET /api/chat/conversations
// @access  Private
export const getMyConversations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const total = await Conversation.countDocuments({
    participants: req.user._id,
    isActive: true,
  });

  const conversations = await Conversation.find({
    participants: req.user._id,
    isActive: true,
  })
    .populate("participants", "name email avatar")
    .populate({
      path: "listing",
      select: "title price images",
      // Only keep the first image to minimize payload size (Super Senior Optimization)
      transform: (doc) => {
        if (doc && doc.images && doc.images.length > 0) {
          doc.images = [doc.images[0]];
        }
        return doc;
      }
    })
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit);

  // Get unread counts per conversation in parallel
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (convo) => {
      const unreadCount = await Message.countDocuments({
        conversation: convo._id,
        sender: { $ne: req.user._id },
        read: false,
      });
      return {
        ...convo.toObject(),
        unreadCount,
      };
    })
  );

  res.status(200).json({ 
    success: true, 
    data: conversationsWithUnread,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get total unread messages count for the logged-in user
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  // Use a targeted query to count strictly unread messages across all active conversations
  const conversations = await Conversation.find({
    participants: req.user._id,
    isActive: true,
  }).select("_id");

  if (conversations.length === 0) {
    return res.status(200).json({ success: true, count: 0 });
  }

  const convoIds = conversations.map((c) => c._id);

  const count = await Message.countDocuments({
    conversation: { $in: convoIds },
    sender: { $ne: req.user._id },
    read: false,
  });

  res.status(200).json({ success: true, count });
});

// @desc    Get all messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid conversation ID" });
  }

  const conversation = await Conversation.findById(id);

  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found" });
  }

  if (
    !conversation.participants.some(
      (pid) => pid.toString() === req.user._id.toString()
    )
  ) {
    return res
      .status(403)
      .json({ success: false, message: "Not authorized to view these messages" });
  }

  const messages = await Message.find({ conversation: id })
    .populate("sender", "name email avatar")
    .populate("offer")
    .sort({ createdAt: 1 });

  // Mark all unread messages from the other participant as read
  await Message.updateMany(
    { conversation: id, sender: { $ne: req.user._id }, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({ success: true, data: messages });
});

// @desc    Send a message via REST fallback
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, text, type } = req.body;

  if (!conversationId || !text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({
      success: false,
      message: "conversationId and text are required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid conversation ID" });
  }

  if (text.length > 1000) {
    return res
      .status(400)
      .json({ success: false, message: "Message cannot exceed 1000 characters" });
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found" });
  }

  if (
    !conversation.participants.some(
      (pid) => pid.toString() === req.user._id.toString()
    )
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to send messages in this conversation",
    });
  }

  const messageType = type === "offer" ? "offer" : "text";

  const message = await Message.create({
    conversation: conversationId,
    sender: req.user._id,
    text: text.trim(),
    type: messageType,
  });

  conversation.lastMessage = text.substring(0, 50);
  conversation.lastMessageAt = Date.now();
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate(
    "sender",
    "name email avatar"
  );

  try {
    const io = getIO();
    io.to(conversationId.toString()).emit("newMessage", populatedMessage);

    conversation.participants.forEach((pId) => {
      const pid = pId.toString();
      if (pid !== req.user._id.toString()) {
        io.to(pid).emit("conversationUpdated", {
          conversationId: conversationId.toString(),
          lastMessage: text.substring(0, 50),
          lastMessageAt: new Date(),
        });
      }
    });
  } catch (err) {}

  res.status(201).json({ success: true, data: populatedMessage });
});
