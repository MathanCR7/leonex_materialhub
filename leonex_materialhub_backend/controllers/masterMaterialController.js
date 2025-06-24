// controllers/masterMaterialController.js
const pool = require("../config/db");

exports.getMasterMaterialDetails = async (req, res) => {
  const { materialCode } = req.params;
  const { plantCode } = req.query; // Expect plantCode from query

  if (!plantCode) {
    return res.status(400).json({ message: "Plant code is required." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT material_code, material_description, uom, plantcode, plantlocation, category, stock_on_hand FROM materials WHERE material_code = ? AND plantcode = ?",
      [materialCode, plantCode] // Use plantCode in the query
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({
          message: `Material code ${materialCode} not found in master list for plant ${plantCode}`,
        });
    }
    // Map to frontend friendly names
    const materialDetails = rows[0];
    res.json({
      material_code: materialDetails.material_code,
      material_description: materialDetails.material_description,
      uom: materialDetails.uom,
      plant: materialDetails.plantcode, // This is the specific plant for this material instance
      plant_name: materialDetails.plantlocation,
      category: materialDetails.category,
      soh_quantity: materialDetails.stock_on_hand,
    });
  } catch (error) {
    console.error("Get master material details error:", error);
    res.status(500).json({ message: "Server error fetching material details" });
  }
};

exports.getUniqueMaterialValues = async (req, res) => {
  const { field } = req.query;
  if (!field || !["uom", "category"].includes(field)) {
    return res.status(400).json({
      message: "Invalid or missing field parameter. Allowed: uom, category.",
    });
  }
  try {
    // This query fetches distinct values across all materials, not plant-specific.
    // If UOMs/Categories could be plant-specific, this query would need adjustment.
    // For now, assuming UOM/Category are global.
    const [rows] = await pool.query(
      `SELECT DISTINCT ${field} FROM materials WHERE ${field} IS NOT NULL AND ${field} <> '' ORDER BY ${field} ASC`
    );
    res.json(rows.map((row) => row[field]));
  } catch (error) {
    console.error(`Error fetching unique ${field} values:`, error);
    res
      .status(500)
      .json({ message: `Server error fetching unique ${field} values.` });
  }
};

exports.searchMasterMaterials = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  try {
    const searchQuery = `%${q}%`;
    // This query already selects m.plantcode and joins submissions on m.plantcode = ms.plant.
    // If your 'materials' table has rows like:
    // F1FUSE000001, ..., PlantA, ...
    // F1FUSE000001, ..., PlantB, ...
    // then searching for "F1FUSE000001" will list both.
    const [rows] = await pool.query(
      `SELECT 
         m.material_code, 
         m.material_description, 
         m.plantcode,  -- plantcode from materials table, crucial for distinguishing
         m.category,
         m.plantlocation, -- plantlocation from materials table
         m.uom,
         m.stock_on_hand, -- SOH from master materials for this specific plantcode
         ms.is_completed, 
         ms.id as submission_id 
       FROM materials m 
       LEFT JOIN (
         SELECT 
           s.material_code, 
           s.is_completed, 
           s.id, 
           s.plant, -- This is plantcode from material_data_submissions
           ROW_NUMBER() OVER (PARTITION BY s.material_code, s.plant ORDER BY s.created_at DESC, s.id DESC) as rn 
         FROM material_data_submissions s
       ) ms ON m.material_code = ms.material_code AND m.plantcode = ms.plant AND ms.rn = 1 
       WHERE (m.material_code LIKE ? OR m.material_description LIKE ?)
       ORDER BY m.material_code, m.plantcode 
       LIMIT 20`, // Consider if pagination is needed for many results
      [searchQuery, searchQuery]
    );

    const results = rows.map((row) => ({
      material_code: row.material_code,
      material_description: row.material_description,
      plantcode: row.plantcode, // The specific plant for this master record
      plantlocation: row.plantlocation,
      category: row.category,
      uom: row.uom,
      soh_quantity: row.stock_on_hand, // SOH for this material at this plant
      is_completed: row.is_completed, // Submission status for this material_code AND plantcode
      submission_id: row.submission_id, // Submission ID for this material_code AND plantcode
    }));
    res.json(results);
  } catch (error) {
    console.error("Master material search error:", error);
    res
      .status(500)
      .json({ message: "Server error during master material search" });
  }
};

// This function is less used, getMasterMaterialDetails is preferred.
// If still used, it should also ideally be plant-specific.
exports.getMasterMaterialDescription = async (req, res) => {
  const { materialCode } = req.params;
  const { plantCode } = req.query; // Added plantCode query parameter

  try {
    let queryText =
      "SELECT material_description FROM materials WHERE material_code = ?";
    const queryParams = [materialCode];

    if (plantCode) {
      queryText += " AND plantcode = ?";
      queryParams.push(plantCode);
    } else {
      // If no plantCode, you might want to return a generic description or error.
      // For now, let's pick the first one if multiple exist for the material_code.
      queryText += " LIMIT 1";
    }

    const [rows] = await pool.query(queryText, queryParams);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({
          message: `Material code ${materialCode}${
            plantCode ? ` for plant ${plantCode}` : ""
          } not found.`,
        });
    }
    res.json({ material_description: rows[0].material_description });
  } catch (error) {
    console.error("Get master material description error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching material description" });
  }
};
