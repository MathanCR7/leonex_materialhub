// leonex_materialhub_backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const cron = require("node-cron");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const logger = require("./utils/logger");
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
const NODE_ENV = process.env.NODE_ENV || "development";

// --- Security and Core Middlewares ---

// CRITICAL FOR VERCEL: Trust the proxy to get correct IP for rate limiting
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));

// CRITICAL FIX #1: Robust CORS Configuration
// This logic works for both local dev (using your .env) and production (using Vercel env vars).
const allowedOrigins = [
  process.env.CORS_ORIGIN,  // Reads from your .env or Vercel environment variables
  'http://localhost:5173'   // Hardcoded for convenience during local development
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman/curl) or if the origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Gracefully reject if origin is not in the allowed list
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

morgan.token("id", (req) => req.id);
const morganFormat = NODE_ENV === "production" ? ':id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"' : "dev";
app.use(morgan(morganFormat, { stream: logger.stream }));

app.use(express.json({ limit: "70mb" }));
app.use(express.urlencoded({ extended: true, limit: "70mb" }));

// CRITICAL FIX #2: Use Vercel's Writable Temporary Directory
// This will use /tmp on production and a local /media folder during development.
const mediaDir = path.join(NODE_ENV === 'production' ? '/tmp' : __dirname, "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
app.use("/media", express.static(mediaDir));

// --- Rate Limiting (Applied only to API routes) ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// --- API Routes ---
// These are all correct
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

app.get("/", (req, res) => res.status(200).json({ message: "Backend is running." }));
app.get("/api/health", (req, res) => res.status(200).json({ status: "UP" }));

// --- Scheduled Jobs (Note: Vercel Cron Jobs are recommended for production) ---
cron.schedule("0 0 * * *", () => {
  deactivateExpiredUsers();
});

// --- Error Handling ---
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = err.message.includes('CORS') ? 403 : (err.status || 500);
  logger.error(
    `[${req.id}] ${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
  );
  res.status(statusCode).json({ message: err.message || "Server error." });
});

// CRITICAL FIX #3: Vercel Compatibility
// We only run the server listener `app.listen` if we are NOT in a Vercel environment.
// For Vercel, we export the app.
if (process.env.VERCEL_ENV === 'production') {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT} in ${NODE_ENV} mode.`);
  });
  
  // Graceful shutdown for local development
  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}