// controllers/dashboardController.js
const pool = require("../config/db");

exports.getStats = async (req, res) => {
  const { user } = req; // from authenticateToken middleware

  // --- CASE 1: STANDARD THIRD-PARTY USERS ---
  if (user.role === "thirdparties" && !['itc_user1', 'itc_user2'].includes(user.username)) {
    if (!user.plants || user.plants.length === 0) {
      return res.json({
        totalCompletedSubmissions: 0, estimationsProvided: 0, pendingEstimations: 0,
        assignedPlants: 0, totalEstimatedValue: 0, totalGoodMaterialValue: 0,
        totalPackageDefectsValue: 0, totalPhysicalDefectsValue: 0, totalOtherDefectsValue: 0,
        message: "You have not been assigned to any plants yet.",
      });
    }

    try {
      const plantCodes = user.plants.map((p) => p.plantcode);
      const completedSubmissionsQuery = `SELECT COUNT(id) as count FROM material_data_submissions WHERE is_completed = TRUE AND approval_status = 'APPROVED' AND plant IN (?);`;
      const estimationsProvidedQuery = `SELECT COUNT(id) as count FROM cost_estimations WHERE user_id = ?;`;
      const financialStatsQuery = `
        SELECT
            SUM(s.good_material_count * ce.good_material_price) as totalGoodMaterialValue,
            SUM(s.package_defects_count * ce.package_defects_price) as totalPackageDefectsValue,
            SUM(s.physical_defects_count * ce.physical_defects_price) as totalPhysicalDefectsValue,
            SUM(s.other_defects_count * ce.other_defects_price) as totalOtherDefectsValue
        FROM cost_estimations ce
        JOIN material_data_submissions s ON ce.submission_id = s.id
        WHERE ce.user_id = ?;`;

      const [[completedSubmissionsResult], [estimationsProvidedResult], [financialStatsResult]] = await Promise.all([
        pool.query(completedSubmissionsQuery, [plantCodes]),
        pool.query(estimationsProvidedQuery, [user.id]),
        pool.query(financialStatsQuery, [user.id]),
      ]);

      const totalCompletedSubmissions = completedSubmissionsResult[0]?.count ?? 0;
      const estimationsProvided = estimationsProvidedResult[0]?.count ?? 0;
      const pendingEstimations = totalCompletedSubmissions - estimationsProvided;
      const financials = financialStatsResult[0] || {};
      const totalGoodMaterialValue = parseFloat(financials.totalGoodMaterialValue) || 0;
      const totalPackageDefectsValue = parseFloat(financials.totalPackageDefectsValue) || 0;
      const totalPhysicalDefectsValue = parseFloat(financials.totalPhysicalDefectsValue) || 0;
      const totalOtherDefectsValue = parseFloat(financials.totalOtherDefectsValue) || 0;
      const totalEstimatedValue = totalGoodMaterialValue + totalPackageDefectsValue + totalPhysicalDefectsValue + totalOtherDefectsValue;

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
      return res.status(500).json({ message: "Server error fetching your dashboard statistics" });
    }
  }

  // --- CASE 2 & 3: ADMIN, CATALOGUER, AND SPECIAL ITC USERS ---
  let plantFilterClauses = {
      materials: "",
      submissions: "",
  };
  let queryParams = [];
  
  if (user.role === "cataloguer" || ['itc_user1', 'itc_user2'].includes(user.username)) {
    if (user.plants && user.plants.length > 0) {
      const plantCodes = user.plants.map((p) => p.plantcode);
      plantFilterClauses.materials = " WHERE plantcode IN (?)";
      plantFilterClauses.submissions = " WHERE plant IN (?)";
      queryParams.push(plantCodes);
    } else {
      // Return empty stats if a non-admin user has no assigned plants
      return res.json({
        totalMasterMaterials: 0, completedSubmissions: 0, pendingVerifications: 0, totalPlants: 0, totalCategories: 0, totalStockOnHand: 0, recentlyAddedMasterMaterials: [],
        approvedCount: 0, pendingCount: 0, reworkRequested: 0, reworkCompleted: 0, thirdPartyReworks: 0, thirdPartyRejections: 0, statusDistribution: [],
        userActivity: [], submissionsOverTime: [], userAssignments: [], plantDirectory: [], submissionsByUserOverTime: [], submissionsByPlant: [], thirdPartyEstimations: []
      });
    }
  }

  const materialsQuery = `SELECT COUNT(*) as count FROM materials ${plantFilterClauses.materials}`;
  const recentMaterialsQuery = `SELECT material_code, material_description, plantcode, plantlocation, category, stock_on_hand, created_at FROM materials ${plantFilterClauses.materials} ORDER BY created_at DESC LIMIT 5`;
  const submissionBaseWhere = plantFilterClauses.submissions ? `${plantFilterClauses.submissions} AND is_completed = TRUE` : `WHERE is_completed = TRUE`;
  const submissionsCountQuery = `SELECT COUNT(DISTINCT material_code) as count FROM material_data_submissions ${submissionBaseWhere}`;
  const statusDistributionQuery = `SELECT COALESCE(approval_status, 'PENDING') as status, COUNT(id) as count FROM material_data_submissions ${submissionBaseWhere} GROUP BY status`;
  const userActivityQuery = `SELECT submitted_by_username as username, COUNT(id) as count FROM material_data_submissions ${submissionBaseWhere} AND submitted_by_username IS NOT NULL GROUP BY submitted_by_username ORDER BY count DESC LIMIT 5`;
  const submissionsOverTimeQuery = `SELECT DATE(created_at) as date, COUNT(id) as count FROM material_data_submissions ${submissionBaseWhere} AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC`;
  const thirdPartyReworksQuery = `SELECT COUNT(id) as count FROM cost_estimations WHERE estimation_type = 'REWORK_REQUESTED'`;
  const thirdPartyRejectionsQuery = `SELECT COUNT(id) as count FROM cost_estimations WHERE estimation_type = 'REJECTED'`;
  const totalPlantsQuery = `SELECT COUNT(DISTINCT plantlocation) as count FROM materials WHERE plantlocation IS NOT NULL AND plantlocation <> '' ${plantFilterClauses.materials.replace('WHERE', 'AND')}`;
  const totalCategoriesQuery = `SELECT COUNT(DISTINCT category) as count FROM materials WHERE category IS NOT NULL AND category <> '' ${plantFilterClauses.materials.replace('WHERE', 'AND')}`;
  const totalSohQuery = `SELECT SUM(stock_on_hand) as sum FROM materials ${plantFilterClauses.materials}`;
  
  const userAssignmentsQuery = `
    SELECT u.id, u.username, u.role, GROUP_CONCAT(DISTINCT up.plantcode SEPARATOR ', ') as plants 
    FROM users u 
    LEFT JOIN user_plants up ON u.id = up.user_id 
    GROUP BY u.id 
    ORDER BY u.username;
  `;
  const plantDirectoryQuery = `SELECT DISTINCT plantcode, plantlocation FROM user_plants ORDER BY plantcode;`;

  // --- NEW QUERIES FOR ADMIN DASHBOARD ---
  const submissionsByUserOverTimeQuery = `SELECT DATE(created_at) as date, submitted_by_username as username, COUNT(id) as count FROM material_data_submissions ${submissionBaseWhere} AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND submitted_by_username IS NOT NULL GROUP BY DATE(created_at), submitted_by_username ORDER BY date ASC`;
  const submissionsByPlantQuery = `SELECT plant, COUNT(id) as count FROM material_data_submissions ${submissionBaseWhere} GROUP BY plant ORDER BY count DESC LIMIT 10`;
  const thirdPartyEstimationsQuery = `SELECT u.username, COUNT(ce.id) as count FROM cost_estimations ce JOIN users u ON ce.user_id = u.id WHERE u.role = 'thirdparties' GROUP BY u.username ORDER BY count DESC LIMIT 10`;

  try {
    const queriesToRun = [
      pool.query(materialsQuery, queryParams), pool.query(submissionsCountQuery, queryParams), pool.query(recentMaterialsQuery, queryParams),
      pool.query(statusDistributionQuery, queryParams), pool.query(userActivityQuery, queryParams), pool.query(submissionsOverTimeQuery, queryParams),
      pool.query(totalPlantsQuery, queryParams), pool.query(totalCategoriesQuery, queryParams), pool.query(totalSohQuery, queryParams),
    ];

    if (user.role === 'admin') {
      queriesToRun.push(
        pool.query(thirdPartyReworksQuery), 
        pool.query(thirdPartyRejectionsQuery),
        pool.query(userAssignmentsQuery),
        pool.query(plantDirectoryQuery),
        // Add new queries
        pool.query(submissionsByUserOverTimeQuery, queryParams),
        pool.query(submissionsByPlantQuery, queryParams),
        pool.query(thirdPartyEstimationsQuery)
      );
    }
    
    const results = await Promise.all(queriesToRun);

    const [[totalMasterMaterialsResult]] = results[0];
    const [[completedSubmissionsResult]] = results[1];
    const [recentlyAddedMasterMaterialsResult] = results[2];
    const [statusDistributionResult] = results[3];
    const [userActivityResult] = results[4];
    const [submissionsOverTimeResult] = results[5];
    const [[totalPlantsResult]] = results[6];
    const [[totalCategoriesResult]] = results[7];
    const [[totalSohResult]] = results[8];

    let thirdPartyReworks = 0, thirdPartyRejections = 0, userAssignments = [], plantDirectory = [],
        submissionsByUserOverTime = [], submissionsByPlant = [], thirdPartyEstimations = [];
    if (user.role === 'admin') {
      const [[tpReworks]] = results[9];
      const [[tpRejections]] = results[10];
      [userAssignments] = results[11];
      [plantDirectory] = results[12];
      // Get results of new queries
      [submissionsByUserOverTime] = results[13];
      [submissionsByPlant] = results[14];
      [thirdPartyEstimations] = results[15];
      thirdPartyReworks = tpReworks.count;
      thirdPartyRejections = tpRejections.count;
    }

    const statusCounts = { approvedCount: 0, reworkRequested: 0, reworkCompleted: 0, pendingCount: 0 };
    statusDistributionResult.forEach(row => {
      if (row.status === 'APPROVED') statusCounts.approvedCount = row.count;
      else if (row.status === 'REWORK_REQUESTED') statusCounts.reworkRequested = row.count;
      else if (row.status === 'REWORK_COMPLETED') statusCounts.reworkCompleted = row.count;
      else if (row.status === 'PENDING') statusCounts.pendingCount = row.count;
    });

    const statusDistributionForChart = statusDistributionResult.map(item => ({ name: (item.status || 'Pending').replace(/_/g, ' '), value: item.count }));
    const submissionsOverTime = submissionsOverTimeResult.map(item => ({ date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: item.count }));

    res.json({
      totalMasterMaterials: totalMasterMaterialsResult.count,
      completedSubmissions: completedSubmissionsResult.count,
      pendingVerifications: totalMasterMaterialsResult.count - completedSubmissionsResult.count < 0 ? 0 : totalMasterMaterialsResult.count - completedSubmissionsResult.count,
      totalPlants: totalPlantsResult.count,
      totalCategories: totalCategoriesResult.count,
      totalStockOnHand: totalSohResult.sum || 0,
      approvedCount: statusCounts.approvedCount,
      pendingCount: statusCounts.pendingCount,
      reworkRequested: statusCounts.reworkRequested,
      reworkCompleted: statusCounts.reworkCompleted,
      thirdPartyReworks,
      thirdPartyRejections,
      statusDistribution: statusDistributionForChart,
      userActivity: userActivityResult,
      submissionsOverTime,
      recentlyAddedMasterMaterials: recentlyAddedMasterMaterialsResult,
      userAssignments,
      plantDirectory,
      // Add new data to response
      submissionsByUserOverTime,
      submissionsByPlant,
      thirdPartyEstimations,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error fetching dashboard statistics" });
  }
};