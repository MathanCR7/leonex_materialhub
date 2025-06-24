// controllers/dashboardController.js
const pool = require("../config/db");

exports.getStats = async (req, res) => {
  try {
    const [totalMasterMaterialsResult] = await pool.query(
      "SELECT COUNT(*) as count FROM materials"
    );
    const [completedSubmissionsResult] = await pool.query(
      "SELECT COUNT(DISTINCT material_code) as count FROM material_data_submissions WHERE is_completed = TRUE"
    );
    // Note: Pending Submissions (from submissions table) is different from Pending Verifications (master materials not yet completed)
    const [pendingSubmissionsTableResult] = await pool.query(
      // This is "actual" pending submissions if a submission entry exists but is_completed = FALSE
      "SELECT COUNT(DISTINCT material_code) as count FROM material_data_submissions WHERE is_completed = FALSE"
    );

    const recentlyAddedMasterMaterialsResult = await pool.query(
      // Renamed for clarity in map
      "SELECT material_code, material_description, plantcode, category, stock_on_hand, created_at FROM materials ORDER BY created_at DESC LIMIT 5"
    );
    const [totalPlantsResult] = await pool.query(
      "SELECT COUNT(DISTINCT plantlocation) as count FROM materials WHERE plantlocation IS NOT NULL AND plantlocation <> ''"
    );
    const [totalCategoriesResult] = await pool.query(
      "SELECT COUNT(DISTINCT category) as count FROM materials WHERE category IS NOT NULL AND category <> ''"
    );
    const [totalStockOnHandResult] = await pool.query(
      "SELECT SUM(stock_on_hand) as sum FROM materials"
    );

    const totalMasterMaterials = totalMasterMaterialsResult[0].count;
    const completedSubmissions = completedSubmissionsResult[0].count;
    const pendingVerifications = totalMasterMaterials - completedSubmissions; // Calculated

    res.json({
      totalMasterMaterials: totalMasterMaterials,
      completedSubmissions: completedSubmissions,
      pendingVerifications: pendingVerifications < 0 ? 0 : pendingVerifications, // Ensure not negative
      totalPlants: totalPlantsResult[0].count,
      totalCategories: totalCategoriesResult[0].count,
      totalStockOnHand: totalStockOnHandResult[0].sum || 0,
      recentlyAddedMasterMaterials: recentlyAddedMasterMaterialsResult[0], // Access the array of rows
      // You can also include pendingSubmissionsTableResult[0].count if you want to show "Draft Submissions" separately
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching dashboard statistics" });
  }
};
