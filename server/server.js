// CampusCart — server.js
import "./env.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import listingRoutes from "./routes/listing.routes.js";
import offersRouter from "./routes/offers.js";
import chatRouter from "./routes/chat.js";
import searchRoutes from "./routes/searchRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";
import passport from "./config/passport.js";
import { initSocket } from "./sockets/index.js";
import logger from "./utils/logger.js";

// env
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === "production";

// env validation
const requiredAlways = ["MONGO_URI", "ACCESS_TOKEN_SECRET"];

const requiredProd = [
  "CLIENT_URL",
  "BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "BrevoApiKey",   // required for email verification
  "EMAIL_FROM",    // required for email sender identity
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];


const missingAlways = requiredAlways.filter((key) => !process.env[key]);
if (missingAlways.length > 0 && process.env.NODE_ENV !== "test") {
  throw new Error(
    `Missing required environment variables: ${missingAlways.join(", ")}`
  );
}

if (isProd) {
  const missingProd = requiredProd.filter((key) => !process.env[key]);
  if (missingProd.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingProd.join(", ")}`
    );
  }

  if (process.env.ACCESS_TOKEN_SECRET.length < 64) {
    throw new Error("ACCESS_TOKEN_SECRET must be at least 64 characters in production");
  }
}

// app init
const app = express();


const startServer = async () => {
  try {
    await connectDB();

    if (isProd) {
      // Standard for many cloud providers (Render, Heroku, AWS)
      app.set("trust proxy", 1);
    }

    const allowedOrigins = isProd
      ? [process.env.CLIENT_URL]
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5176", process.env.CLIENT_URL];

    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['set-cookie'],
    };

    // common middleware
    app.use(helmet());
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(cookieParser());
    app.use(passport.initialize());

    // Structured logging
    app.use(morgan(isProd ? "combined" : "dev", {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // health check
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "OK",
        environment: process.env.NODE_ENV || "development",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    });

    // routes
    app.use("/api/auth", authRoutes);
    app.use("/api/listings", listingRoutes);
    app.use("/api/offers", offersRouter);
    app.use("/api/chat", chatRouter);
    app.use("/api/search", searchRoutes);
    app.get("/api/health", (req, res) => res.redirect(301, "/health"));
    app.use("/api", (req, res) => res.status(404).json({ message: "API route not found" }));

    // error handler
    app.use(errorHandler);

    const PORT = process.env.PORT || 5000;
    const server = createServer(app);
    initSocket(server);

    if (process.env.NODE_ENV !== "test") {
      server.listen(PORT, "0.0.0.0", () => {
        logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
      });
    }

    return server;
  } catch (error) {
    console.error("FATAL: Failed to start server:", error.message);
    process.exit(1);
  }
};

const serverInstance = startServer();
export default serverInstance;
