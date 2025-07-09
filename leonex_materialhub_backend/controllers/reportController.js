// controllers/reportController.js
const pool = require("../config/db");

// Gets a summary of total estimated value per third-party user.
exports.getCostSummaryReport = async (req, res) => {
  try {
    const query = `
      SELECT
        u.id AS user_id,
        u.username AS third_party_username,
        SUM(
          (s.good_material_count * ce.good_material_price) +
          (s.package_defects_count * ce.package_defects_price) +
          (s.physical_defects_count * ce.physical_defects_price) +
          (s.other_defects_count * ce.other_defects_price)
        ) AS total_calculated_value
      FROM cost_estimations ce
      JOIN users u ON ce.user_id = u.id
      JOIN material_data_submissions s ON ce.submission_id = s.id
      WHERE u.role = 'thirdparties'
      GROUP BY u.id, u.username
      ORDER BY total_calculated_value DESC;
    `;

    const [rows] = await pool.query(query);

    res.json(rows);
  } catch (error) {
    console.error("Get cost summary report error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching cost summary report." });
  }
};

// Gets the detailed estimations for a specific third-party user.
exports.getCostDetailReportForUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const query = `
      SELECT
        s.id AS submission_id,
        m.mask_code,
        s.plant,
        s.good_material_count,
        s.package_defects_count,
        s.physical_defects_count,
        s.other_defects_count,
        ce.good_material_price,
        ce.package_defects_price,
        ce.physical_defects_price,
        ce.other_defects_price,
        (s.good_material_count * ce.good_material_price) AS total_good_value,
        (s.package_defects_count * ce.package_defects_price) AS total_package_defect_value,
        (s.physical_defects_count * ce.physical_defects_price) AS total_physical_defect_value,
        (s.other_defects_count * ce.other_defects_price) AS total_other_defect_value
      FROM cost_estimations ce
      JOIN material_data_submissions s ON ce.submission_id = s.id
      LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode
      WHERE ce.user_id = ?
      ORDER BY s.id;
    `;

    const [rows] = await pool.query(query, [userId]);

    res.json(rows);
  } catch (error) {
    console.error("Get cost detail report for user error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching cost detail report." });
  }
};
