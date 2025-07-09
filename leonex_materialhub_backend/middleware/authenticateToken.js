// middleware/authenticateToken.js

const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the database to ensure they are still valid and active
    const [userRows] = await pool.query(
      "SELECT id, username, role, is_active FROM users WHERE id = ? AND is_active = 1",
      [decoded.userId]
    );

    if (userRows.length === 0) {
      return res
        .status(403)
        .json({ message: "Forbidden: User not found or is inactive." });
    }

    const user = userRows[0];

    // Attach assigned plants for cataloguers and third-party users
    if (user.role === "cataloguer" || user.role === "thirdparties") {
      const [plantRows] = await pool.query(
        "SELECT plantcode, plantlocation FROM user_plants WHERE user_id = ?",
        [user.id]
      );
      user.plants = plantRows;
    } else {
      user.plants = [];
    }

    req.user = user; // Attach the complete user object to the request
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Forbidden: Token has expired." });
    }
    return res.status(403).json({ message: "Forbidden: Token is not valid." });
  }
};

module.exports = authenticateToken;
