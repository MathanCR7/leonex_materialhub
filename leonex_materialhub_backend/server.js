// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const masterMaterialRoutes = require("./routes/masterMaterials");
const submissionRoutes = require("./routes/submissions");
const dashboardRoutes = require("./routes/dashboard");

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
app.use(express.json({ limit: "50mb" })); // Increased limit for potentially larger payloads with many images
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

app.use("/api/auth", authRoutes);
app.use("/api/materials/master", masterMaterialRoutes); // Corrected path if it was /api/materials/master
app.use("/api/material-data", submissionRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) =>
  res.status(200).json({ message: "Backend is running." })
);
app.get("/api/health", (req, res) => res.status(200).json({ status: "UP" }));

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
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
