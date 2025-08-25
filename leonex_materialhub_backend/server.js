// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const cron = require("node-cron");
const helmet = require("helmet"); // Security Best Practice
const rateLimit = require("express-rate-limit"); // Basic DDOS/Brute-force protection
const { v4: uuidv4 } = require("uuid"); // For unique request IDs
const logger = require("./utils/logger"); // Our new advanced logger
const { deactivateExpiredUsers } = require("./services/userExpirationService");

// --- Route Imports ---
const authRoutes = require("./routes/auth");
const masterMaterialRoutes = require("./routes/masterMaterials");
const submissionRoutes = require("./routes/submissions");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");
const plantRoutes = require("./routes/plants");
const costEstimationRoutes = require("./routes/costEstimations");
const materialManagementRoutes = require("./routes/materialManagement");
const reportRoutes = require("./routes/reports");
const stockReportRoutes = require('./routes/stockReportRoutes');

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || "development";

// --- Security and Core Middlewares ---

// MODIFICATION: Configure helmet to allow cross-origin resource loading.
// This is the key change that fixes your image issue.
app.use(helmet({ crossOriginResourcePolicy: false }));

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Assign a unique Request ID to each incoming request for better log tracking
app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

// Morgan logging now streams to our Winston logger
morgan.token("id", (req) => req.id);
const morganFormat =
  NODE_ENV === "production"
    ? ':id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : "dev";

app.use(morgan(morganFormat, { stream: logger.stream }));

// MODIFICATION: Increased limit size to 70mb
app.use(express.json({ limit: "70mb" }));
app.use(express.urlencoded({ extended: true, limit: "70mb" }));

// --- Static File Serving ---
// This is placed BEFORE the API rate limiter and router to ensure static files are served efficiently.
const mediaDir = path.join(__dirname, "public", "media");
if (!fs.existsSync(mediaDir)) {
  try {
    fs.mkdirSync(mediaDir, { recursive: true });
    logger.info(`Media directory created: ${mediaDir}`);
  } catch (err) {
    logger.error(`Error creating media directory ${mediaDir}:`, err);
    process.exit(1); // Exit if we can't create a critical directory
  }
}
app.use("/media", express.static(mediaDir));

// --- Rate Limiting (Applied only to API routes) ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  handler: (req, res, next, options) => {
    logger.warn(
      `Rate limit exceeded for IP ${req.ip}. Message: ${options.message.message}`
    );
    res.status(options.statusCode).send(options.message);
  },
});
app.use("/api/", apiLimiter); // Apply rate limiting to all API routes

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/materials/master", masterMaterialRoutes);
app.use("/api/material-data", submissionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/estimations", costEstimationRoutes);
app.use("/api/materials/manage", materialManagementRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/stock-report", stockReportRoutes);

app.get("/", (req, res) =>
  res.status(200).json({ message: "Backend is running." })
);
app.get("/api/health", (req, res) => res.status(200).json({ status: "UP" }));

// --- Scheduled Jobs ---
cron.schedule("0 0 * * *", () => {
  const jobName = "DeactivateExpiredUsers";
  logger.info(`Running scheduled job: ${jobName}...`);
  try {
    deactivateExpiredUsers();
    logger.info(`Scheduled job ${jobName} completed successfully.`);
  } catch (error) {
    logger.error(`Scheduled job ${jobName} failed.`, { error });
  }
});

// --- Error Handling ---
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  logger.error(
    `[${req.id}] ${statusCode} - ${err.message} - ${req.originalUrl} - ${
      req.method
    } - ${req.ip}`,
    {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      stack: NODE_ENV !== "production" ? err.stack : undefined,
    }
  );

  res.status(statusCode).json({
    message: err.message || "Server error.",
    error:
      NODE_ENV === "production"
        ? {}
        : { status: statusCode, message: err.message, stack: err.stack },
  });
});

const server = app.listen(PORT, () => {
  logger.info(
    `Server running on http://localhost:${PORT} in ${NODE_ENV} mode.`
  );
  logger.info(`Media served from: ${mediaDir}`);
  logger.info("User expiration check is scheduled to run daily at midnight.");
});

// --- Graceful Shutdown & Unhandled Error Logging ---
const cleanup = (signal) => {
  logger.warn(`Received ${signal}. Cleaning up and shutting down gracefully.`);
  server.close(() => {
    logger.info("Server closed. Exiting process.");
    process.exit(0);
  });
};

process.on("SIGINT", () => cleanup("SIGINT"));
process.on("SIGTERM", () => cleanup("SIGTERM"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error });
  process.exit(1);
});