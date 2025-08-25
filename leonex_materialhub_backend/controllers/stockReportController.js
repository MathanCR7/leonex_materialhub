// controllers/stockReportController.js
const pool = require("../config/db");

// Gets a list of unique submitters from submissions for the filter dropdown.
exports.getUniqueSubmitters = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT submitted_by_username FROM material_data_submissions WHERE submitted_by_username IS NOT NULL AND submitted_by_username != '' ORDER BY submitted_by_username ASC"
    );
    res.json(rows.map(row => row.submitted_by_username));
  } catch (error)
  {
    console.error("Get unique submitters for report error:", error);
    res.status(500).json({ message: "Server error fetching unique submitters." });
  }
};

// --- NEW FUNCTION: To populate the plant filter dropdown ---
// This was missing before, causing the plant filter to be empty.
exports.getUniquePlants = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT plant FROM material_data_submissions WHERE plant IS NOT NULL AND plant != '' ORDER BY plant ASC"
    );
    res.json(rows.map(row => row.plant));
  } catch (error) {
    console.error("Get unique plants for report error:", error);
    res.status(500).json({ message: "Server error fetching unique plants." });
  }
};


// Gets the main stock report data, grouped by plant.
exports.getStockReport = async (req, res) => {
  try {
    let { materialCode, plantCodes, usernames, startDate, endDate } = req.query;

    let query = `
        SELECT
            s.id,
            s.material_code,
            s.material_description_snapshot,
            s.plant,
            m.plantlocation,
            m.stock_on_hand AS provided_soh,
            s.soh_quantity,
            s.good_material_count,
            s.package_defects_count,
            s.physical_defects_count,
            s.missing_material_count,
            s.approval_status,
            s.submitted_by_username,
            s.created_at
        FROM material_data_submissions s
        -- MODIFIED LINE: Join only on material_code to correctly fetch the master SOH.
        LEFT JOIN materials m ON s.material_code = m.material_code
    `;

    const conditions = [];
    const params = [];

    if (materialCode) {
      conditions.push(`(s.material_code LIKE ? OR m.mask_code LIKE ?)`);
      params.push(`%${materialCode}%`, `%${materialCode}%`);
    }
    if (plantCodes) {
      const plantCodeArray = plantCodes.split(',').map(p => p.trim());
      if (plantCodeArray.length > 0) {
        conditions.push(`s.plant IN (?)`);
        params.push(plantCodeArray);
      }
    }
    if (usernames) {
      const usernameArray = usernames.split(',').map(u => u.trim());
      if (usernameArray.length > 0) {
        conditions.push(`s.submitted_by_username IN (?)`);
        params.push(usernameArray);
      }
    }
    
    const reformatDate = (dateString) => {
      if (!dateString || !dateString.includes('/')) return dateString;
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
      return dateString;
    };

    if (startDate) {
      const formattedStartDate = reformatDate(startDate);
      conditions.push(`DATE(s.created_at) >= ?`);
      params.push(formattedStartDate);
    }
    if (endDate) {
      const formattedEndDate = reformatDate(endDate);
      conditions.push(`DATE(s.created_at) <= ?`);
      params.push(formattedEndDate);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    // We add a GROUP BY to prevent duplicate rows if a material code exists in multiple plants in the `materials` table.
    // We take the MAX of plantlocation and provided_soh, assuming they are consistent for a given material_code.
    query += ` GROUP BY s.id ORDER BY m.plantlocation ASC, s.material_code ASC`;

    const [rows] = await pool.query(query, params);

    const plantMap = new Map();
    
    let topLevelCounts = {
        totalProvidedSoh: 0,
        totalSoh: 0,
        totalGood: 0,
        totalPackageDefects: 0,
        totalPhysicalDefects: 0,
        totalMissing: 0,
        totalMaterials: 0,
    };

    rows.forEach(row => {
      topLevelCounts.totalProvidedSoh += Number(row.provided_soh) || 0;
      topLevelCounts.totalSoh += Number(row.soh_quantity) || 0;
      topLevelCounts.totalGood += Number(row.good_material_count) || 0;
      topLevelCounts.totalPackageDefects += Number(row.package_defects_count) || 0;
      topLevelCounts.totalPhysicalDefects += Number(row.physical_defects_count) || 0;
      topLevelCounts.totalMissing += Number(row.missing_material_count) || 0;
      topLevelCounts.totalMaterials += 1;

      if (!plantMap.has(row.plant)) {
        plantMap.set(row.plant, {
          plant: row.plant,
          plantlocation: row.plantlocation || 'Unknown Location',
          total_provided_soh: 0,
          total_soh: 0,
          total_good: 0,
          total_package_defects: 0,
          total_physical_defects: 0,
          total_missing: 0,
          material_count: 0,
          materials: []
        });
      }

      const plantData = plantMap.get(row.plant);
      plantData.total_provided_soh += Number(row.provided_soh) || 0;
      plantData.total_soh += Number(row.soh_quantity) || 0;
      plantData.total_good += Number(row.good_material_count) || 0;
      plantData.total_package_defects += Number(row.package_defects_count) || 0;
      plantData.total_physical_defects += Number(row.physical_defects_count) || 0;
      plantData.total_missing += Number(row.missing_material_count) || 0;
      plantData.material_count += 1;
      
      plantData.materials.push({
        id: row.id,
        material_code: row.material_code,
        material_description_snapshot: row.material_description_snapshot,
        provided_soh: row.provided_soh,
        soh_quantity: row.soh_quantity,
        good_material_count: row.good_material_count,
        package_defects_count: row.package_defects_count,
        physical_defects_count: row.physical_defects_count,
        missing_material_count: row.missing_material_count,
        approval_status: row.approval_status,
        submitted_by_username: row.submitted_by_username,
      });
    });
    
    const reportData = [...plantMap.values()];

    res.json({ reportData, topLevelCounts });

  } catch (error) {
    console.error("Get stock report error:", error);
    res.status(500).json({ message: "Server error fetching stock report." });
  }
};