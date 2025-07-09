// controllers/userController.js
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// <<< ADDED: Helper function to format date for MySQL
const formatDateForMySQL = (dateString) => {
  if (!dateString) return null;
  try {
    // Converts "2025-07-24T18:30:00.000Z" to "2025-07-24 18:30:00"
    return new Date(dateString).toISOString().slice(0, 19).replace("T", " ");
  } catch (error) {
    console.error("Invalid date format:", dateString);
    return null; // Return null if the date is invalid
  }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, role, expires_at, is_active, created_at FROM users ORDER BY username"
    );
    // For each user, fetch their plants if they are a cataloguer or thirdparty
    for (const user of users) {
      if (user.role === "cataloguer" || user.role === "thirdparties") {
        const [plants] = await pool.query(
          "SELECT plantcode, plantlocation FROM user_plants WHERE user_id = ?",
          [user.id]
        );
        user.plants = plants;
      } else {
        user.plants = [];
      }
    }
    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

// Admin: Get a single user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query(
      "SELECT id, username, role, expires_at, is_active FROM users WHERE id = ?",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = users[0];
    if (user.role === "cataloguer" || user.role === "thirdparties") {
      const [plants] = await pool.query(
        "SELECT plantcode, plantlocation FROM user_plants WHERE user_id = ?",
        [id]
      );
      user.plants = plants;
    } else {
      user.plants = [];
    }
    res.json(user);
  } catch (error) {
    console.error(`Get user by ID (${id}) error:`, error);
    res.status(500).json({ message: "Server error fetching user details" });
  }
};

// Admin: Create a new user
exports.createUser = async (req, res) => {
  const { username, password, role, expires_at, plants } = req.body;

  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ message: "Username, password, and role are required." });
  }
  if (
    (role === "cataloguer" || role === "thirdparties") &&
    (!Array.isArray(plants) || plants.length === 0)
  ) {
    return res
      .status(400)
      .json({ message: "This role requires at least one plant code." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(409).json({ message: "Username already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // <<< CHANGED: Use the helper function to format the date
    const formattedExpiresAt = formatDateForMySQL(expires_at);

    const [result] = await connection.query(
      "INSERT INTO users (username, password, role, expires_at) VALUES (?, ?, ?, ?)",
      // <<< CHANGED: Pass the newly formatted date to the query
      [username, hashedPassword, role, formattedExpiresAt]
    );
    const userId = result.insertId;

    if (
      (role === "cataloguer" || role === "thirdparties") &&
      plants.length > 0
    ) {
      const [plantData] = await connection.query(
        "SELECT DISTINCT plantcode, plantlocation FROM materials WHERE plantcode IN (?) AND plantlocation IS NOT NULL AND plantlocation <> ''",
        [plants]
      );

      if (plantData.length > 0) {
        const plantValues = plantData.map((p) => [
          userId,
          p.plantcode,
          p.plantlocation,
        ]);
        await connection.query(
          "INSERT INTO user_plants (user_id, plantcode, plantlocation) VALUES ?",
          [plantValues]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: "User created successfully", userId });
  } catch (error) {
    await connection.rollback();
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error creating user" });
  } finally {
    if (connection) connection.release();
  }
};

// Admin: Update a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password, role, expires_at, is_active, plants } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updateFields = {};
    if (username) updateFields.username = username;
    if (role) updateFields.role = role;
    if (is_active !== undefined) updateFields.is_active = is_active;

    // <<< CHANGED: Use the helper function to format the date
    if (expires_at !== undefined) {
      updateFields.expires_at = formatDateForMySQL(expires_at);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updateFields).length > 0) {
      await connection.query("UPDATE users SET ? WHERE id = ?", [
        updateFields,
        id,
      ]);
    }

    await connection.query("DELETE FROM user_plants WHERE user_id = ?", [id]);

    if (role === "cataloguer" || role === "thirdparties") {
      if (Array.isArray(plants) && plants.length > 0) {
        const [plantData] = await connection.query(
          "SELECT DISTINCT plantcode, plantlocation FROM materials WHERE plantcode IN (?) AND plantlocation IS NOT NULL AND plantlocation <> ''",
          [plants]
        );

        if (plantData.length > 0) {
          const plantValues = plantData.map((p) => [
            id,
            p.plantcode,
            p.plantlocation,
          ]);
          await connection.query(
            "INSERT INTO user_plants (user_id, plantcode, plantlocation) VALUES ?",
            [plantValues]
          );
        }
      }
    }

    await connection.commit();
    res.json({ message: "User updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error(`Update user (${id}) error:`, error);
    res.status(500).json({ message: "Server error updating user" });
  } finally {
    if (connection) connection.release();
  }
};
