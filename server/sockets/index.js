import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { setIO } from "./io.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

// Map<userId, Set<socketId>>  — tracks all active sockets per user
const onlineUsers = new Map();

const parseCookie = (cookieStr, key) => {
  if (!cookieStr) return null;
  const match = cookieStr.match(new RegExp(`(^| )${key}=([^;]+)`));
  return match ? match[2] : null;
};

export const getOnlineUsers = () => onlineUsers;

export const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:5173",
    process.env.CLIENT_URL,
  ].filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setIO(io);

  // ── Authentication middleware ──
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      const cookieToken = parseCookie(socket.handshake.headers.cookie, "accessToken");
      const token = socket.handshake.auth?.token || bearerToken || cookieToken;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication failed: invalid token"));
        socket.user = { _id: decoded.userId };
        next();
      });
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  // ── Connection handler ──
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    // Join personal notification room (for offers, etc.)
    socket.join(userId);

    // ── Online status tracking ──
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    const userSockets = onlineUsers.get(userId);

    // Broadcast online ONLY if this is the first tab/connection
    if (userSockets.size === 0) {
      socket.broadcast.emit("userOnline", { userId });
    }
    userSockets.add(socket.id);

    // Send the connecting socket the current online roster
    const currentlyOnline = Array.from(onlineUsers.keys()).filter(
      (id) => onlineUsers.get(id).size > 0
    );
    socket.emit("initialOnlineUsers", currentlyOnline);

    // ── Auto-rejoin conversations the user belongs to ──
    socket.on("rejoinConversations", async (callback = () => {}) => {
      try {
        const conversations = await Conversation.find({
          participants: userId,
          isActive: true,
        }).select("_id");

        conversations.forEach((c) => socket.join(c._id.toString()));
        callback({ success: true, joined: conversations.length });
      } catch (error) {
        callback({ error: "Failed to rejoin conversations" });
      }
    });

    // ── Join a specific conversation room ──
    socket.on("joinConversation", async ({ conversationId }, callback = () => {}) => {
      try {
        if (!conversationId) return callback({ error: "Missing conversation ID" });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return callback({ error: "Conversation not found" });

        if (
          !conversation.participants.some(
            (id) => id.toString() === userId
          )
        ) {
          return callback({ error: "Unauthorized" });
        }

        socket.join(conversationId);
        callback({ success: true });
      } catch (error) {
        callback({ error: "Internal server error" });
      }
    });

    // ── Leave conversation room ──
    socket.on("leaveConversation", ({ conversationId }) => {
      if (conversationId) socket.leave(conversationId);
    });

    // ── Send message ──
    socket.on("sendMessage", async ({ conversationId, text, type }, callback = () => {}) => {
      try {
        if (!conversationId || !text || typeof text !== "string" || !text.trim()) {
          return callback({ error: "Invalid data: conversationId and text are required" });
        }

        if (text.length > 1000) {
          return callback({ error: "Message cannot exceed 1000 characters" });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return callback({ error: "Conversation not found" });

        if (
          !conversation.participants.some(
            (id) => id.toString() === userId
          )
        ) {
          return callback({ error: "Unauthorized" });
        }

        const messageType = type === "offer" ? "offer" : "text";

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: text.trim(),
          type: messageType,
        });

        conversation.lastMessage = text.substring(0, 50);
        conversation.lastMessageAt = Date.now();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate(
          "sender",
          "name avatar"
        );

        // Emit to ALL sockets in the room (including sender's other tabs)
        io.to(conversationId).emit("newMessage", populatedMessage);

        // Also notify participants who may not be in the room yet
        conversation.participants.forEach((pId) => {
          const pid = pId.toString();
          if (pid !== userId) {
            io.to(pid).emit("conversationUpdated", {
              conversationId,
              lastMessage: text.substring(0, 50),
              lastMessageAt: new Date(),
            });
          }
        });

        callback({ success: true, message: populatedMessage });
      } catch (error) {
        callback({ error: "Internal server error" });
      }
    });

    // ── Typing indicators ──
    socket.on("typing", ({ conversationId }) => {
      if (conversationId) {
        socket.to(conversationId).emit("typing", { conversationId, userId });
      }
    });

    socket.on("stopTyping", ({ conversationId }) => {
      if (conversationId) {
        socket.to(conversationId).emit("stopTyping", { conversationId, userId });
      }
    });

    // ── Mark messages as read ──
    socket.on("markRead", async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: userId }, read: false },
          { $set: { read: true } }
        );
        socket.to(conversationId).emit("messagesRead", { conversationId, readBy: userId });
      } catch (error) {
        // silent fail for read receipts
      }
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      if (onlineUsers.has(userId)) {
        const sockets = onlineUsers.get(userId);
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          // Debounce offline by 2s to handle page refreshes / tab switches
          setTimeout(() => {
            const currentSockets = onlineUsers.get(userId);
            if (!currentSockets || currentSockets.size === 0) {
              onlineUsers.delete(userId);
              io.emit("userOffline", { userId });
            }
          }, 2000);
        }
      }
    });
  });

  return io;
};

// ── Cross-system notification helpers ──
export const notifyNewOffer = (io, sellerId, offerData) => {
  if (io && sellerId) {
    io.to(sellerId.toString()).emit("offerReceived", offerData);
  }
};

export const notifyOfferStatus = (io, buyerId, offerData) => {
  if (io && buyerId) {
    io.to(buyerId.toString()).emit("offerStatusChanged", offerData);
  }
};
