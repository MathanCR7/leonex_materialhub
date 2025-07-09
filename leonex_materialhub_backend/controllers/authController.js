// controllers/authController.js
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // Changed from 'bcrypt' to 'bcryptjs'
require("dotenv").config();

exports.login = async (req, res) => {
  // ... The rest of the file remains exactly the same
  const { username, password } = req.body;
  console.log("\n--- Login Attempt ---");
  console.log(`Received Username: ${username}`);
  console.log(`Received Password: ${password}`);
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, username, password, role, is_active FROM users WHERE username = ?",
      [username]
    );
    if (rows.length === 0) {
      console.log(
        `Result: Failure. Reason: User '${username}' not found in database.`
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = rows[0];
    console.log(`Found user in DB. ID: ${user.id}, Role: ${user.role}`);
    console.log(`Stored Hashed Password: ${user.password}`);
    if (!user.is_active) {
      console.log(`Result: Failure. Reason: User '${username}' is not active.`);
      return res
        .status(403)
        .json({ message: "This user account is inactive." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password comparison result (isMatch): ${isMatch}`);
    if (!isMatch) {
      console.log(`Result: Failure. Reason: Password does not match.`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // --- FIX: FETCH USER PLANTS ON LOGIN ---
    // Initialize plants array for all users
    user.plants = [];
    // If the user is a cataloguer or thirdparty, fetch their assigned plants
    if (user.role === "cataloguer" || user.role === "thirdparties") {
      const [plantRows] = await pool.query(
        "SELECT plantcode, plantlocation FROM user_plants WHERE user_id = ?",
        [user.id]
      );
      user.plants = plantRows;
      console.log(`Fetched ${plantRows.length} plants for user '${username}'.`);
    }
    // --- END OF FIX ---

    console.log(`Result: Success! Generating JWT for user '${username}'.`);

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      // Include plants in the token payload for consistency
      plants: user.plants,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    // --- FIX: INCLUDE PLANTS IN THE RESPONSE TO THE CLIENT ---
    res.json({
      token,
      username: user.username,
      userId: user.id,
      role: user.role,
      plants: user.plants, // This is the crucial addition for the frontend
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};
