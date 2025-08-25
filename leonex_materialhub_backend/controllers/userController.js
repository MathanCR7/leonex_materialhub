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

exports.getThirdPartyUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username FROM users WHERE role = 'thirdparties' ORDER BY username ASC"
    );
    res.json(users);
  } catch (error) {
    console.error("Get third party users error:", error);
    res.status(500).json({ message: "Server error fetching third-party users." });
  }
};

// Helper function to build a base query for reworks/rejections
const buildAdminQuery = (type) => {
    const fields = type === 'rework' ? 'ce.rework_reason, ce.rework_status' : 'ce.rejection_reason';
    const estimationType = type === 'rework' ? 'REWORK_REQUESTED' : 'REJECTED';
    const base = `
        FROM cost_estimations ce
        JOIN material_data_submissions s ON ce.submission_id = s.id
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode
        JOIN users u ON ce.user_id = u.id
        WHERE ce.estimation_type = ?
    `;
    const select = `SELECT ce.id, ce.submission_id, ce.updated_at, s.material_description_snapshot, m.mask_code, m.plantlocation, u.username as third_party_username, ${fields}`;
    const count = `SELECT COUNT(ce.id) as total`;
    return {
        baseQuery: select + base,
        countQuery: count + base,
        queryParams: [estimationType],
    };
};

const getPaginatedData = async (req, res, type) => {
    const { search = "", page = 1, limit = 10, userId } = req.query;
    const offsetInt = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitInt = Math.max(1, parseInt(limit, 10));
    let { baseQuery, countQuery, queryParams } = buildAdminQuery(type);
    let countQueryParams = [...queryParams];
    if (userId) {
        baseQuery += ' AND ce.user_id = ?';
        countQuery += ' AND ce.user_id = ?';
        queryParams.push(userId);
        countQueryParams.push(userId);
    }
    if (search) {
        baseQuery += ' AND (m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR u.username LIKE ?)';
        countQuery += ' AND (m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR u.username LIKE ?)';
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
        countQueryParams.push(searchParam, searchParam, searchParam);
    }
    baseQuery += ` ORDER BY ce.updated_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limitInt, offsetInt);
    try {
        const [rows] = await pool.query(baseQuery, queryParams);
        const [countResult] = await pool.query(countQuery, countQueryParams);
        const totalItems = countResult[0].total;
        res.json({ data: rows, currentPage: parseInt(page, 10), totalPages: Math.ceil(totalItems / limitInt), totalItems });
    } catch (error) {
        console.error(`Get all ${type}s error:`, error);
        res.status(500).json({ message: `Server error fetching all ${type}s.` });
    }
};

exports.getAllReworks = (req, res) => getPaginatedData(req, res, 'rework');
exports.getAllRejections = (req, res) => getPaginatedData(req, res, 'rejection');

const exportData = async (req, res, type) => {
    const { userId } = req.query;
    let { baseQuery, queryParams } = buildAdminQuery(type);
    if (userId) {
        baseQuery += ' AND ce.user_id = ?';
        queryParams.push(userId);
    }
    baseQuery += ` ORDER BY ce.updated_at DESC`;
    try {
        const [rows] = await pool.query(baseQuery, queryParams);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(type === 'rework' ? 'Reworks' : 'Rejections');
        if (type === 'rework') {
            worksheet.columns = [ { header: 'Mask Code', key: 'mask_code', width: 20 }, { header: 'Third-Party User', key: 'third_party_username', width: 25 }, { header: 'Description', key: 'material_description_snapshot', width: 40 }, { header: 'Plant', key: 'plantlocation', width: 30 }, { header: 'Rework Reason', key: 'rework_reason', width: 50 }, { header: 'Status', key: 'rework_status', width: 20 }, { header: 'Date Requested', key: 'updated_at', width: 25 } ];
        } else {
            worksheet.columns = [ { header: 'Mask Code', key: 'mask_code', width: 20 }, { header: 'Third-Party User', key: 'third_party_username', width: 25 }, { header: 'Description', key: 'material_description_snapshot', width: 40 }, { header: 'Plant', key: 'plantlocation', width: 30 }, { header: 'Rejection Reason', key: 'rejection_reason', width: 50 }, { header: 'Date Rejected', key: 'updated_at', width: 25 } ];
        }
        rows.forEach(row => { worksheet.addRow({ ...row, updated_at: new Date(row.updated_at).toLocaleString() }); });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${type}s_report_${new Date().toISOString().split('T')[0]}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(`Export ${type}s error:`, error);
        res.status(500).json({ message: `Server error exporting ${type}s.` });
    }
};

exports.exportReworks = (req, res) => exportData(req, res, 'rework');
exports.exportRejections = (req, res) => exportData(req, res, 'rejection');
