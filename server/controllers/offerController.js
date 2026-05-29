import Offer from "../models/Offer.js";
import Listing from "../models/Listing.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import { getIO } from "../sockets/io.js";
import { notifyNewOffer, notifyOfferStatus } from "../sockets/index.js";

// @desc    Create a new offer
// @route   POST /api/offers/:listingId
// @access  Private (Buyer)
export const createOffer = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { amount, message } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  // Prevent offer if listing is already sold
  if (listing.status === "sold") {
    return res.status(400).json({ success: false, message: "Listing is already sold" });
  }

  // Prevent buyer from offering on their own listing
  // (Listing model uses seller for the reference)
  if (listing.sellerId.toString() === req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Cannot make an offer on your own listing" });
  }

  // Check for existing pending offer by this buyer on this listing
  const existingOffer = await Offer.findOne({
    listing: listingId,
    buyer: req.user._id,
    status: "pending",
  });

  if (existingOffer) {
    return res.status(400).json({ success: false, message: "You already have a pending offer for this listing" });
  }

  // Create offer with seller copied from listing
  const offer = await Offer.create({
    listing: listingId,
    buyer: req.user._id,
    seller: listing.sellerId,
    amount,
    message,
  });

  // --- BEGIN CHAT INTEGRATION ---
  const sortedParticipants = [req.user._id.toString(), listing.sellerId.toString()].sort();
  let conversation = await Conversation.findOne({
    listing: listingId,
    participants: { $all: sortedParticipants, $size: 2 },
  });

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        participants: sortedParticipants,
        listing: listingId,
      });
    } catch (error) {
      if (error.code === 11000) {
        conversation = await Conversation.findOne({
          listing: listingId,
          participants: { $all: sortedParticipants, $size: 2 },
        });
      } else {
        throw error;
      }
    }
  }

  const messageObj = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text: `Made an offer of ₹${offer.amount}${message ? ` - "${message}"` : ""}`,
    type: "offer",
    offer: offer._id,
  });

  try {
    const io = getIO();
    const populatedMsg = await Message.findById(messageObj._id).populate("sender", "name email avatar");
    io.to(conversation._id.toString()).emit("newMessage", populatedMsg);
    
    // Notify seller
    io.to(listing.sellerId.toString()).emit("conversationUpdated", {
      conversationId: conversation._id.toString(),
      lastMessage: `Made an offer of ₹${offer.amount}`,
      lastMessageAt: Date.now()
    });
  } catch(e) {}

  conversation.offer = offer._id;
  conversation.lastMessage = `Made an offer of ₹${offer.amount}`;
  conversation.lastMessageAt = Date.now();
  await conversation.save();
  // --- END CHAT INTEGRATION ---

  // Populate listing and buyer info for the response
  const populatedOffer = await Offer.findById(offer._id)
    .populate("listing", "title price imageUrl status")
    .populate("buyer", "name email avatar");

  try { notifyNewOffer(getIO(), listing.sellerId, populatedOffer); } catch (e) {}

  const responseData = {
    ...populatedOffer.toObject(),
    conversationId: conversation._id
  };

  res.status(201).json({ success: true, data: responseData });
});

// @desc    Get all offers for a specific listing
// @route   GET /api/offers/listing/:listingId
// @access  Private (Seller only)
export const getOffersForListing = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  // Only listing owner can view the offers
  if (listing.sellerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized to view these offers" });
  }

  const offers = await Offer.find({ listing: listingId })
    .populate("listing", "title price images status")
    .populate("buyer", "name email avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: offers });
});

// @desc    Get all offers made by the logged-in user
// @route   GET /api/offers/my
// @access  Private (Buyer)
export const getMyOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ buyer: req.user._id })
    .populate("listing", "title price images status")
    .populate("seller", "name email avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: offers });
});

// @desc    Accept an offer
// @route   PATCH /api/offers/:offerId/accept
// @access  Private (Seller only)
export const acceptOffer = asyncHandler(async (req, res) => {
  const { offerId } = req.params;

  const offer = await Offer.findById(offerId);
  if (!offer) {
    return res.status(404).json({ success: false, message: "Offer not found" });
  }

  const listing = await Listing.findById(offer.listing);
  if (!listing) {
    return res.status(404).json({ success: false, message: "Listing not found" });
  }

  // Only the seller can accept the offer
  if (listing.sellerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized to accept this offer" });
  }

  // Prevent accepting if listing already sold
  if (listing.status === "sold") {
    return res.status(400).json({ success: false, message: "Listing is already sold" });
  }

  // Prevent double-accept
  if (offer.status === "accepted") {
    return res.status(400).json({ success: false, message: "Offer is already accepted" });
  }

  // Update offer status
  offer.status = "accepted";
  offer.isReadByBuyer = false; // Mark unread for buyer since status changed
  await offer.save();

  // Update listing status
  listing.status = "sold";
  await listing.save();

  // Reject ALL other pending offers on the same listing
  await Offer.updateMany(
    { listing: listing._id, _id: { $ne: offerId } },
    { status: "rejected", isReadByBuyer: false }
  );

  // --- BEGIN CHAT INTEGRATION ---
  let conversation = await Conversation.findOne({
    listing: listing._id,
    participants: { $all: [offer.buyer, offer.seller] }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [offer.buyer, offer.seller],
      listing: listing._id,
      offer: offer._id,
      lastMessage: `Offer of ₹${offer.amount} accepted!`,
      lastMessageAt: Date.now()
    });
  } else {
    // If conversation existed from prior interactions, just update it
    conversation.offer = offer._id;
    conversation.lastMessage = `Offer of ₹${offer.amount} accepted!`;
    conversation.lastMessageAt = Date.now();
    await conversation.save();
  }

  const messageObj = await Message.create({
    conversation: conversation._id,
    sender: offer.seller,
    text: `Offer of ₹${offer.amount} accepted! You can now coordinate the exchange.`,
    type: "offer",
    offer: offer._id,
  });

  try {
    const io = getIO();
    const populatedMsg = await Message.findById(messageObj._id).populate("sender", "name email avatar");
    io.to(conversation._id.toString()).emit("newMessage", populatedMsg);
    
    // Notify buyer
    io.to(offer.buyer.toString()).emit("conversationUpdated", {
      conversationId: conversation._id.toString(),
      lastMessage: `Offer of ₹${offer.amount} accepted!`,
      lastMessageAt: Date.now()
    });
  } catch(e) {}
  // --- END CHAT INTEGRATION ---

  try { notifyOfferStatus(getIO(), offer.buyer, offer); } catch (e) {}

  res.status(200).json({ success: true, data: offer });
});

// @desc    Reject an offer
// @route   PATCH /api/offers/:offerId/reject
// @access  Private (Seller only)
export const rejectOffer = asyncHandler(async (req, res) => {
  const { offerId } = req.params;

  const offer = await Offer.findById(offerId);
  if (!offer) {
    return res.status(404).json({ success: false, message: "Offer not found" });
  }

  // Both Listing and Offer models correctly trace the seller, we can use either
  if (offer.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized to reject this offer" });
  }

  if (offer.status !== "pending") {
    return res.status(400).json({ success: false, message: "Can only reject pending offers" });
  }

  offer.status = "rejected";
  offer.isReadByBuyer = false; // Mark unread for buyer since status changed
  await offer.save();

  try { notifyOfferStatus(getIO(), offer.buyer, offer); } catch (e) {}

  res.status(200).json({ success: true, data: offer });
});

// @desc    Get total unread offers count for the user
// @route   GET /api/offers/unread-count
// @access  Private
export const getUnreadOffersCount = asyncHandler(async (req, res) => {
  // Sellers: New offers where isReadBySeller is false
  const sellerUnread = await Offer.countDocuments({
    seller: req.user._id,
    isReadBySeller: false,
  });

  // Buyers: Status changes where isReadByBuyer is false
  const buyerUnread = await Offer.countDocuments({
    buyer: req.user._id,
    isReadByBuyer: false,
  });

  res.status(200).json({ success: true, count: sellerUnread + buyerUnread });
});

// @desc    Mark all offers as read for the user
// @route   PATCH /api/offers/mark-read
// @access  Private
export const markOffersAsRead = asyncHandler(async (req, res) => {
  // Mark all offers where user is seller as read
  await Offer.updateMany(
    { seller: req.user._id, isReadBySeller: false },
    { $set: { isReadBySeller: true } }
  );

  // Mark all offers where user is buyer as read
  await Offer.updateMany(
    { buyer: req.user._id, isReadByBuyer: false },
    { $set: { isReadByBuyer: true } }
  );

  res.status(200).json({ success: true, message: "Offers marked as read" });
});
