// leonex_materialhub_backend/utils/logger.js
const winston = require("winston");
const path = require("path");
const fs = require("fs"); // Import the file system module

const NODE_ENV = process.env.NODE_ENV || "development";

// Define log directory
const logDir = path.join(__dirname, "..", "logs");

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};
winston.addColors(colors);

// Define log format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define log format for production (structured JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// =================================================================
// CRITICAL FIX: Build the transports array conditionally.
// =================================================================
// Start with the Console transport, which is always needed.
const transports = [
  new winston.transports.Console({
    level: NODE_ENV === "development" ? "debug" : "http",
    format: NODE_ENV === "development" ? devFormat : prodFormat,
  }),
];

// Only add File transports if we are NOT in production (i.e., on your local machine).
if (NODE_ENV !== "production") {
  // Create the log directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Add the file transport for all logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      level: "info",
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Add the file transport for only error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: prodFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}
// =================================================================

// Create the logger instance with the configured transports
const logger = winston.createLogger({
  level: NODE_ENV === "development" ? "debug" : "info",
  levels,
  transports,
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;