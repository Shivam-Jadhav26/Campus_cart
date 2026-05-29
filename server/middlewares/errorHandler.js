// CampusCart — errorHandler.js
import logger from "../utils/logger.js";

/**
 * Global Error Handler for Production
 * Ensures zero sensitive data leakage and standardized responses
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  const isProd = process.env.NODE_ENV === "production";

  // Development Logging
  if (!isProd) {
    logger.error(`API Error: ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Mongoose: Duplicate Key Error (11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists.` : "Duplicate field value entered.";
  }

  // Mongoose: Cast Error (Invalid ID)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Resource not found with id of ${err.value}`;
  }

  // Mongoose: Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(", ");
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Not authorized, token failed";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired, please login again";
  }

  res.status(statusCode).json({
    success: false,
    message,
    // stack: isProd ? null : err.stack, // Optional: uncomment if stack is needed in dev JSON
  });
};

export default errorHandler;
