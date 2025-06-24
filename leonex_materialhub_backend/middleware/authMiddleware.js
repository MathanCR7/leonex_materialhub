// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({ message: "Token expired." });
      }
      return res.status(403).json({ message: "Token is not valid." });
    }
    req.user = user; // Add decoded user payload to request object
    next();
  });
};

module.exports = authenticateToken;
