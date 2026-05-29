import jwt from "jsonwebtoken";
import crypto from "crypto";

const getAccessSecret = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      "ACCESS_TOKEN_SECRET is missing in environment variables."
    );
  }

  return secret;
};

const ACCESS_TOKEN_EXPIRY = "15m";

// access token (JWT)
export const generateAccessToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required to generate access token.");
  }

  return jwt.sign(
    { userId },
    getAccessSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

export const hashRefreshToken = (token) => {
  if (!token || typeof token !== 'string') {
    // We throw a specific error that the server's errorHandler can potentially recognize,
    // or just let it fail safely. Most importantly, we prevent the TypeError during crypto.
    return null; 
  }

  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};
