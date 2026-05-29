import express from "express";
import {
  createOffer,
  getOffersForListing,
  getMyOffers,
  acceptOffer,
  rejectOffer,
  getUnreadOffersCount,
  markOffersAsRead,
} from "../controllers/offerController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All offer routes must be protected
router.use(protect);

router.get("/unread-count", getUnreadOffersCount);
router.patch("/mark-read", markOffersAsRead);
router.post("/:listingId", createOffer);
router.get("/listing/:listingId", getOffersForListing);
router.get("/my", getMyOffers);
router.patch("/:offerId/accept", acceptOffer);
router.patch("/:offerId/reject", rejectOffer);

export default router;
