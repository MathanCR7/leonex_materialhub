// utils/logger.js
const winston = require("winston");
const path = require("path");

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

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  // Add a unique request ID to each log if it exists
  winston.format((info) => {
    if (info.requestId) {
      info.message = `[${info.requestId}] ${info.message}`;
    }
    return info;
  })(),
  // Colorize the output for the console
  winston.format.colorize({ all: true }),
  // Define the structure of the log message
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// For production, use a more structured JSON format
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define transports (where logs are sent)
const transports = [
  // Log to the console with a specific format and level
  new winston.transports.Console({
    level: NODE_ENV === "development" ? "debug" : "http",
    format: NODE_ENV === "development" ? format : productionFormat,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logDir, "combined.log"),
    level: "info",
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // File transport for only error logs
  new winston.transports.File({
    filename: path.join(logDir, "error.log"),
    level: "error",
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: NODE_ENV === "development" ? "debug" : "info",
  levels,
  transports,
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => {
    // Use the 'http' level so we can filter based on that
    logger.http(message.trim());
  },
};

module.exports = logger;