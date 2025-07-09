// controllers/dashboardController.js
const pool = require("../config/db");

exports.getStats = async (req, res) => {
  const { user } = req; // from authenticateToken middleware

  // --- LOGIC FOR THIRD PARTIES ---
  if (user.role === "thirdparties") {
    if (!user.plants || user.plants.length === 0) {
      return res.json({
        totalCompletedSubmissions: 0,
        estimationsProvided: 0,
        pendingEstimations: 0,
        assignedPlants: 0,
        totalEstimatedValue: 0,
        totalGoodMaterialValue: 0,
        totalPackageDefectsValue: 0,
        totalPhysicalDefectsValue: 0,
        totalOtherDefectsValue: 0,
        message: "You have not been assigned to any plants yet.",
      });
    }

    try {
      const plantCodes = user.plants.map((p) => p.plantcode);

      const completedSubmissionsQuery = `SELECT COUNT(id) as count FROM material_data_submissions WHERE is_completed = TRUE AND plant IN (?);`;
      const estimationsProvidedQuery = `SELECT COUNT(id) as count FROM cost_estimations WHERE user_id = ?;`;

      // <<< THIS IS THE KEY QUERY THAT PERFORMS THE COUNT * PRICE CALCULATION >>>
      // It joins submissions (for counts) and estimations (for prices)
      // and calculates the total value for each category.
      const financialStatsQuery = `
        SELECT
            SUM(s.good_material_count * ce.good_material_price) as totalGoodMaterialValue,
            SUM(s.package_defects_count * ce.package_defects_price) as totalPackageDefectsValue,
            SUM(s.physical_defects_count * ce.physical_defects_price) as totalPhysicalDefectsValue,
            SUM(s.other_defects_count * ce.other_defects_price) as totalOtherDefectsValue
        FROM cost_estimations ce
        JOIN material_data_submissions s ON ce.submission_id = s.id
        WHERE ce.user_id = ?;
      `;

      const [
        [completedSubmissionsResult],
        [estimationsProvidedResult],
        [financialStatsResult],
      ] = await Promise.all([
        pool.query(completedSubmissionsQuery, [plantCodes]),
        pool.query(estimationsProvidedQuery, [user.id]),
        pool.query(financialStatsQuery, [user.id]),
      ]);

      const totalCompletedSubmissions =
        completedSubmissionsResult[0]?.count ?? 0;
      const estimationsProvided = estimationsProvidedResult[0]?.count ?? 0;
      const pendingEstimations =
        totalCompletedSubmissions - estimationsProvided;

      const financials = financialStatsResult[0] || {};
      const totalGoodMaterialValue =
        parseFloat(financials.totalGoodMaterialValue) || 0;
      const totalPackageDefectsValue =
        parseFloat(financials.totalPackageDefectsValue) || 0;
      const totalPhysicalDefectsValue =
        parseFloat(financials.totalPhysicalDefectsValue) || 0;
      const totalOtherDefectsValue =
        parseFloat(financials.totalOtherDefectsValue) || 0;

      // The total estimated value is the sum of all calculated category values
      const totalEstimatedValue =
        totalGoodMaterialValue +
        totalPackageDefectsValue +
        totalPhysicalDefectsValue +
        totalOtherDefectsValue;

      return res.json({
        totalCompletedSubmissions,
        estimationsProvided,
        pendingEstimations: pendingEstimations < 0 ? 0 : pendingEstimations,
        assignedPlants: user.plants.length,
        totalEstimatedValue,
        totalGoodMaterialValue,
        totalPackageDefectsValue,
        totalPhysicalDefectsValue,
        totalOtherDefectsValue,
      });
    } catch (error) {
      console.error("Third-party dashboard stats error:", error);
      return res
        .status(500)
        .json({ message: "Server error fetching your dashboard statistics" });
    }
  }
  // --- END OF THIRD PARTIES LOGIC ---

  // --- QUERIES FOR ADMIN & CATALOGUER (Unchanged) ---
  let materialsQuery = "SELECT COUNT(*) as count FROM materials";
  let submissionsQuery =
    "SELECT COUNT(DISTINCT material_code) as count FROM material_data_submissions WHERE is_completed = TRUE";
  let recentMaterialsQuery =
    "SELECT material_code, material_description, plantcode, plantlocation, category, stock_on_hand, created_at FROM materials ORDER BY created_at DESC LIMIT 5";
  let plantsQuery =
    "SELECT COUNT(DISTINCT plantlocation) as count FROM materials WHERE plantlocation IS NOT NULL AND plantlocation <> ''";
  let categoriesQuery =
    "SELECT COUNT(DISTINCT category) as count FROM materials WHERE category IS NOT NULL AND category <> ''";
  let sohQuery = "SELECT SUM(stock_on_hand) as sum FROM materials";

  let materialsParams = [];
  let submissionsParams = [];

  if (user.role === "cataloguer") {
    if (user.plants && user.plants.length > 0) {
      const plantCodes = user.plants.map((p) => p.plantcode);
      materialsQuery += " WHERE plantcode IN (?)";
      submissionsQuery += " AND plant IN (?)";
      recentMaterialsQuery =
        "SELECT material_code, material_description, plantcode, plantlocation, category, stock_on_hand, created_at FROM materials WHERE plantcode IN (?) ORDER BY created_at DESC LIMIT 5";
      plantsQuery += " AND plantcode IN (?)";
      categoriesQuery += " AND plantcode IN (?)";
      sohQuery += " WHERE plantcode IN (?)";
      materialsParams.push(plantCodes);
      submissionsParams.push(plantCodes);
    } else {
      return res.json({
        totalMasterMaterials: 0,
        completedSubmissions: 0,
        pendingVerifications: 0,
        totalPlants: 0,
        totalCategories: 0,
        totalStockOnHand: 0,
        recentlyAddedMasterMaterials: [],
      });
    }
  }

  try {
    const [
      [totalMasterMaterialsResult],
      [completedSubmissionsResult],
      [recentlyAddedMasterMaterialsResult],
      [totalPlantsResult],
      [totalCategoriesResult],
      [totalStockOnHandResult],
    ] = await Promise.all([
      pool.query(materialsQuery, materialsParams),
      pool.query(submissionsQuery, submissionsParams),
      pool.query(recentMaterialsQuery, materialsParams),
      pool.query(plantsQuery, materialsParams),
      pool.query(categoriesQuery, materialsParams),
      pool.query(sohQuery, materialsParams),
    ]);

    const totalMasterMaterials = totalMasterMaterialsResult[0].count;
    const completedSubmissions = completedSubmissionsResult[0].count;
    const pendingVerifications = totalMasterMaterials - completedSubmissions;

    res.json({
      totalMasterMaterials,
      completedSubmissions,
      pendingVerifications: pendingVerifications < 0 ? 0 : pendingVerifications,
      totalPlants: totalPlantsResult[0].count,
      totalCategories: totalCategoriesResult[0].count,
      totalStockOnHand: totalStockOnHandResult[0].sum || 0,
      recentlyAddedMasterMaterials: recentlyAddedMasterMaterialsResult,
    });
  } catch (error) {
    console.error("Dashboard stats error (Admin/Cataloguer):", error);
    res
      .status(500)
      .json({ message: "Server error fetching dashboard statistics" });
  }
};
