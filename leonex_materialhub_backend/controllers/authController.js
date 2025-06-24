// controllers/authController.js
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, username, password FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // !!! EXTREMELY INSECURE - PLAIN TEXT PASSWORD COMPARISON !!!
    // !!! FOR DEMONSTRATION ONLY AS PER USER REQUEST - DO NOT USE IN PRODUCTION !!!
    // !!! YOU MUST IMPLEMENT PASSWORD HASHING (e.g., bcrypt) IMMEDIATELY !!!
    if (password !== user.password) {
      console.warn(
        `SECURITY ALERT: Plain text password comparison for user: ${username}`
      );
      return res
        .status(401)
        .json({ message: "Invalid credentials (password mismatch)" });
    }
    // !!! END OF INSECURE PASSWORD COMPARISON !!!

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      // Add other roles or permissions if needed
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1h", // Token expires in 1 hour
    });

    res.json({
      token,
      username: user.username,
      userId: user.id,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};
