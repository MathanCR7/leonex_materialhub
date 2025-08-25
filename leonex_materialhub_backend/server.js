// server.js
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
app.use(helmet({ crossOriginResourcePolicy: false }));

const allowedOrigins = [
  'https://leonex-materialhubfrontend.vercel.app', // Your Vercel frontend URL
  'http://localhost:5173' // Your local development URL
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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

const mediaDir = path.join("/tmp", "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
app.use("/media", express.static(mediaDir));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

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

app.get("/", (req, res) => res.status(200).json({ message: "Backend is running." }));
app.get("/api/health", (req, res) => res.status(200).json({ status: "UP" }));

cron.schedule("0 0 * * *", () => {
  deactivateExpiredUsers();
});

// --- Error Handling ---
app.use((req, res, next) => {
  // SYNTAX FIX: Added backticks
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  // SYNTAX FIX: Added backticks
  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(statusCode).json({ message: err.message || "Server error." });
});

module.exports = app;