// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const cron = require("node-cron");
const { deactivateExpiredUsers } = require("./services/userExpirationService");

// --- Route Imports ---
const authRoutes = require("./routes/auth");
const masterMaterialRoutes = require("./routes/masterMaterials");
const submissionRoutes = require("./routes/submissions");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users"); // New
const plantRoutes = require("./routes/plants"); // New
const costEstimationRoutes = require("./routes/costEstimations"); // New
const materialManagementRoutes = require("./routes/materialManagement");
const reportRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || "development";

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const mediaDir = path.join(__dirname, "public", "media");
if (!fs.existsSync(mediaDir)) {
  try {
    fs.mkdirSync(mediaDir, { recursive: true });
    console.log(`Media directory created: ${mediaDir}`);
  } catch (err) {
    console.error(`Error creating media directory ${mediaDir}:`, err);
    process.exit(1);
  }
}
app.use("/media", express.static(mediaDir));

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/materials/master", masterMaterialRoutes);
app.use("/api/material-data", submissionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes); // New
app.use("/api/plants", plantRoutes); // New
app.use("/api/estimations", costEstimationRoutes); // New
app.use("/api/materials/manage", materialManagementRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) =>
  res.status(200).json({ message: "Backend is running." })
);
app.get("/api/health", (req, res) => res.status(200).json({ status: "UP" }));

// --- Scheduled Jobs ---
// Runs once every day at midnight
cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled job: Deactivating expired users...");
  deactivateExpiredUsers();
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
  console.error(
    `[${new Date().toISOString()}] ERROR ${statusCode} ${req.method} ${
      req.originalUrl
    }\n`,
    err.message,
    NODE_ENV !== "production" ? err.stack : ""
  );
  res.status(statusCode).json({
    message: err.message || "Server error.",
    error:
      NODE_ENV === "production"
        ? {}
        : { status: statusCode, message: err.message, stack: err.stack },
  });
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} in ${NODE_ENV} mode.`
  );
  console.log(`Media served from: ${mediaDir}`);
  console.log("User expiration check is scheduled to run daily at midnight.");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
