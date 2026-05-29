import express from "express";
import RefreshToken from "../models/RefreshToken.js";
import jwt from "jsonwebtoken";

import passport from "../config/passport.js";
import {
  generateAccessToken as generateToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/generateTokens.js";
import { setAuthCookies } from "../utils/cookieHelpers.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  requestVerification,
  verifyEmail,
  setPassword,
  refreshToken,
  login,
  logout,
} from "../controllers/authcontroller.js";
import User from "../models/user.js";

const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

const router = express.Router();

// oauth: google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/register",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, user) => {
      if (err || !user) {
        return res.redirect(`${clientUrl()}/login?error=oauth_failed`);
      }

      const accessToken = generateToken(user._id);
      const refreshTkn = generateRefreshToken();
      const hashedRefreshToken = hashRefreshToken(refreshTkn);

      await RefreshToken.create({
        user: user._id,
        token: hashedRefreshToken,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      setAuthCookies(res, accessToken, refreshTkn);

      return res.redirect(`${clientUrl()}/auth/callback?token=${accessToken}`);
    })(req, res, next);
  }
);

// oauth: github
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/register",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  (req, res, next) => {
    passport.authenticate("github", { session: false }, async (err, user) => {
      if (err || !user) {
        return res.redirect(`${clientUrl()}/login?error=oauth_failed`);
      }

      const accessToken = generateToken(user._id);
      const refreshTkn = generateRefreshToken();
      const hashedRefreshToken = hashRefreshToken(refreshTkn);

      await RefreshToken.create({
        user: user._id,
        token: hashedRefreshToken,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      setAuthCookies(res, accessToken, refreshTkn);

      return res.redirect(`${clientUrl()}/auth/callback?token=${accessToken}`);
    })(req, res, next);
  }
);

// helper to prevent caching of auth state
const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

// auth status
router.get("/me", noCache, protect, async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(401).json({
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      userId: user._id,
      email: user.email,
      isVerified: user.isVerified,
    }
  });
});

// Socket.io token auth
router.get("/token", noCache, protect, (req, res) => {
  const token = jwt.sign(
    { userId: req.userId || req.user?._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );
  res.status(200).json({ success: true, token });
});

// email verification
router.post("/request-verification", requestVerification);
router.get("/verify/:token", verifyEmail);
router.post("/set-password", setPassword);

// auth flow
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
