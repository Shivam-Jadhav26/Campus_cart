import mongoose from "mongoose";

/**
 * MongoDB Reconnection Logic for Production
 * Includes retry mechanism and event listeners for stability
 */
const connectDB = async (retryCount = 5) => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    if (process.env.NODE_ENV !== "test") {
      console.error("CRITICAL: MONGO_URI is not defined.");
    }
    process.exit(1);
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    dbName: "campuscart", // Forces usage of campuscart database
  };

  try {
    await mongoose.connect(mongoUri, options);
    
    // Log connection (sanitized)
    if (process.env.NODE_ENV !== "production") {
      console.log("MongoDB connected successfully");
    } else {
      console.log("MongoDB connected [Production]");
    }

  } catch (error) {
    if (retryCount > 0) {
      console.warn(`MongoDB connection failed. Retrying... (${retryCount} attempts left)`);
      setTimeout(() => connectDB(retryCount - 1), 5000);
    } else {
      console.error("CRITICAL: MongoDB connection failed after multiple retries:", error.message);
      if (process.env.NODE_ENV !== "test") {
        process.exit(1);
      }
      throw error;
    }
  }
};

// Runtime Listeners
mongoose.connection.on("error", (err) => {
  console.error("Mongoose Runtime Error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected. Attempting to reconnect...");
});

export default connectDB;