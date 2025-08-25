const pool = require("../config/db");

// --- Helper Functions for Role-Based Logic ---
const getVisibleCodeField = (user, alias = "m") => {
  return user.role === "thirdparties"
    ? `${alias}.mask_code`
    : `${alias}.material_code`;
};

const getSearchableCodeFields = (user) => {
  if (user.role === "thirdparties") {
    return [`${getVisibleCodeField(user, "m")}`, "m.material_description"];
  }
  return ["m.material_code", "m.material_description"];
};

// --- Controller Exports ---
exports.searchMasterMaterials = async (req, res) => {
  const { q } = req.query;
  const { user } = req;
  if (!q || q.trim().length < 2) return res.json([]);

  try {
    const searchQuery = `%${q}%`;
    const visibleCodeField = getVisibleCodeField(user, "m");
    const searchableFields = getSearchableCodeFields(user);
    const isAdmin = user.role === "admin";

    const selectFields = `
      ${visibleCodeField} as material_code_display, 
      ${isAdmin ? "m.mask_code," : ""}
      m.material_description, m.plantcode, m.category,
      m.plantlocation, m.uom, m.stock_on_hand, ms.is_completed, ms.id as submission_id 
    `;

    let whereClauses = searchableFields
      .map((field) => `${field} LIKE ?`)
      .join(" OR ");
    let queryParams = searchableFields.map(() => searchQuery);

    if (user.role === "cataloguer" || user.role === "thirdparties") {
      if (!user.plants || user.plants.length === 0) return res.json([]);
      const plantCodes = user.plants.map((p) => p.plantcode);
      const plantFilterField = "m.plantcode";
      whereClauses = `(${whereClauses}) AND ${plantFilterField} IN (?)`;
      queryParams.push(plantCodes);
    }

    const sql = `
      SELECT ${selectFields}
      FROM materials m 
      LEFT JOIN (
        SELECT s.material_code, s.is_completed, s.id, s.plant,
              ROW_NUMBER() OVER (PARTITION BY s.material_code, s.plant ORDER BY s.created_at DESC) as rn 
        FROM material_data_submissions s
      ) ms ON m.material_code = ms.material_code AND m.plantcode = ms.plant AND ms.rn = 1 
      WHERE ${whereClauses}
      ORDER BY m.material_code, m.plantcode 
      LIMIT 20;`;

    const [rows] = await pool.query(sql, queryParams);
    const results = rows.map((row) => ({
      material_code: row.material_code_display,
      ...(isAdmin && { mask_code: row.mask_code }),
      material_description: row.material_description,
      plantcode: row.plantcode,
      plantlocation: row.plantlocation,
      category: row.category,
      uom: row.uom,
      soh_quantity: row.stock_on_hand,
      is_completed: row.is_completed,
      submission_id: row.submission_id,
    }));
    res.json(results);
  } catch (error) {
    console.error("Master material search error:", error);
    res
      .status(500)
      .json({ message: "Server error during master material search" });
  }
};

exports.getMasterMaterialDetails = async (req, res) => {
  // MODIFICATION: Read materialCode from req.query instead of req.params
  const { materialCode, plantCode } = req.query;
  const { user } = req;

  if (!plantCode)
    return res.status(400).json({ message: "Plant code is required." });
  if (!materialCode)
    return res.status(400).json({ message: "Material code is required." });

  const hasAccessToPlant =
    user.role === "admin" ||
    (user.plants && user.plants.some((p) => p.plantcode === plantCode));
  if (!hasAccessToPlant) {
    return res.status(403).json({ message: "Access denied to this plant." });
  }

  try {
    const codeFieldToQuery =
      user.role === "thirdparties" ? "mask_code" : "material_code";
    const visibleCodeField = getVisibleCodeField(user, "materials");
    const isAdmin = user.role === "admin";

    const sql = `
      SELECT 
        ${visibleCodeField} as material_code_display, 
        ${isAdmin ? "mask_code," : ""}
        material_description, uom, plantcode, plantlocation, category, stock_on_hand 
      FROM materials 
      WHERE ${codeFieldToQuery} = ? AND plantcode = ?;`;

    const [rows] = await pool.query(sql, [materialCode, plantCode]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: `Material not found for plant ${plantCode}` });
    }
    const materialDetails = rows[0];
    res.json({
      material_code: materialDetails.material_code_display,
      ...(isAdmin && { mask_code: materialDetails.mask_code }),
      material_description: materialDetails.material_description,
      uom: materialDetails.uom,
      plant: materialDetails.plantcode,
      plantlocation: materialDetails.plantlocation,
      category: materialDetails.category,
      soh_quantity: materialDetails.stock_on_hand,
    });
  } catch (error) {
    console.error("Get master material details error:", error);
    res.status(500).json({ message: "Server error fetching material details" });
  }
};

exports.addMasterMaterial = async (req, res) => {
  const {
    material_code,
    material_description,
    uom,
    plantcode,
    plantlocation,
    category,
    stock_on_hand,
  } = req.body;
  if (!material_code || !plantcode || !plantlocation) {
    return res.status(400).json({
      message: "Material code, plant code, and plant location are required.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      "SELECT id FROM materials WHERE material_code = ? AND plantcode = ?",
      [material_code, plantcode]
    );
    if (existing.length > 0)
      throw new Error(
        `Material code ${material_code} already exists for plant ${plantcode}.`
      );

    const plantNamePrefix = plantlocation.substring(0, 2).toUpperCase();
    const plantCodePrefix = plantcode.substring(0, 2).toUpperCase();
    const maskPrefix = `${plantNamePrefix}${plantCodePrefix}`;

    const [lastMaskRow] = await connection.query(
      "SELECT mask_code FROM materials WHERE mask_code LIKE ? ORDER BY mask_code DESC LIMIT 1",
      [`${maskPrefix}%`]
    );
    let newSequence = 1;
    if (lastMaskRow.length > 0) {
      const lastSequenceStr = lastMaskRow[0].mask_code.substring(
        maskPrefix.length
      );
      newSequence = parseInt(lastSequenceStr, 10) + 1;
    }
    const mask_code = `${maskPrefix}${String(newSequence).padStart(9, "0")}`;

    const [result] = await connection.query(
      `INSERT INTO materials (material_code, mask_code, material_description, uom, plantcode, plantlocation, category, stock_on_hand, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        material_code,
        mask_code,
        material_description,
        uom,
        plantcode,
        plantlocation,
        category,
        stock_on_hand || 0,
        req.user.username,
      ]
    );

    await connection.commit();
    res.status(201).json({
      message: "Master material added successfully",
      insertedId: result.insertId,
      generated_mask_code: mask_code,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Add master material error:", error);
    res.status(500).json({
      message: error.message || "Server error adding master material.",
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.getUniqueMaterialValues = async (req, res) => {
  const { field } = req.query;
  const allowedFields = ["uom", "category"];
  if (!field || !allowedFields.includes(field)) {
    return res.status(400).json({
      message: "Invalid or missing field parameter. Allowed: uom, category.",
    });
  }

  try {
    const sql = `SELECT DISTINCT ?? FROM materials WHERE ?? IS NOT NULL AND ?? <> '' ORDER BY ?? ASC`;
    const [rows] = await pool.query(sql, [field, field, field, field]);
    const values = rows.map((row) => row[field]);
    res.json(values);
  } catch (error) {
    console.error(`Error fetching unique ${field} values:`, error);
    res
      .status(500)
      .json({ message: `Server error fetching unique ${field} values.` });
  }
};
