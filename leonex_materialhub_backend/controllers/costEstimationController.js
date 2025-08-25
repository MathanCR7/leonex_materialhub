const pool = require("../config/db");

// This function handles submitting estimations, reworks, and rejections.
// MODIFIED: Implemented 3-update limit within a 24-hour window.
exports.submitEstimation = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req; // from authenticateToken middleware
  const {
    estimation_type, // 'ESTIMATION', 'REWORK_REQUESTED', 'REJECTED'
    rework_reason,
    rejection_reason,
    good_material_price,
    package_defects_price,
    physical_defects_price,
    other_defects_price,
  } = req.body;

  // Basic validation
  if (!['ESTIMATION', 'REWORK_REQUESTED', 'REJECTED'].includes(estimation_type)) {
    return res.status(400).json({ message: "Invalid estimation type provided." });
  }
  if (estimation_type === 'REWORK_REQUESTED' && (!rework_reason || !rework_reason.trim())) {
     return res.status(400).json({ message: "Rework reason is required." });
  }
  if (estimation_type === 'REJECTED' && (!rejection_reason || !rejection_reason.trim())) {
     return res.status(400).json({ message: "Rejection reason is required." });
  }

  const connection = await pool.getConnection(); // Get a connection for the transaction
  try {
    await connection.beginTransaction();

    // Check for an existing estimation for this user and submission, and lock the row to prevent race conditions.
    // We also join to get the material_code for error messages.
    const [existingRows] = await connection.query(
      `SELECT ce.*, s.material_code 
       FROM cost_estimations ce
       JOIN material_data_submissions s ON ce.submission_id = s.id
       WHERE ce.submission_id = ? AND ce.user_id = ? 
       FOR UPDATE`,
      [submissionId, user.id]
    );

    if (existingRows.length > 0) {
      // --- RECORD EXISTS: THIS IS AN UPDATE ATTEMPT ---
      const existingEstimation = existingRows[0];
      
      // 1. Check if the update count has reached the maximum limit.
      if (existingEstimation.update_count >= 3) {
        await connection.rollback();
        return res.status(403).json({ 
          message: `You have reached the maximum number of updates (3). Please contact administration with Material Code.`
        });
      }

      // 2. Check if the 24-hour update window has passed since the first submission.
      const createdAt = new Date(existingEstimation.created_at);
      const twentyFourHoursLater = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      if (Date.now() > twentyFourHoursLater) {
        await connection.rollback();
        return res.status(403).json({
          message: `The 24-hour update window has passed. Please contact administration with Material Code.`
        });
      }
      
      // All checks passed, proceed with the UPDATE query.
      const updateSql = `
        UPDATE cost_estimations SET
          estimation_type = ?,
          good_material_price = ?,
          package_defects_price = ?,
          physical_defects_price = ?,
          other_defects_price = ?,
          rework_reason = ?,
          rejection_reason = ?,
          rework_status = ?,
          update_count = update_count + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const updateParams = [
        estimation_type,
        estimation_type === 'ESTIMATION' ? good_material_price : null,
        estimation_type === 'ESTIMATION' ? package_defects_price : null,
        estimation_type === 'ESTIMATION' ? physical_defects_price : null,
        estimation_type === 'ESTIMATION' ? other_defects_price : null,
        estimation_type === 'REWORK_REQUESTED' ? rework_reason : null,
        estimation_type === 'REJECTED' ? rejection_reason : null,
        'PENDING', // rework_status is reset on any update
        existingEstimation.id
      ];
      await connection.query(updateSql, updateParams);

    } else {
      // --- NO RECORD EXISTS: THIS IS A NEW INSERT ---
      const insertSql = `
        INSERT INTO cost_estimations (
          submission_id, user_id, estimation_type, 
          good_material_price, package_defects_price, physical_defects_price, other_defects_price,
          rework_reason, rejection_reason, rework_status, update_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const insertParams = [
        submissionId,
        user.id,
        estimation_type,
        estimation_type === 'ESTIMATION' ? good_material_price : null,
        estimation_type === 'ESTIMATION' ? package_defects_price : null,
        estimation_type === 'ESTIMATION' ? physical_defects_price : null,
        estimation_type === 'ESTIMATION' ? other_defects_price : null,
        estimation_type === 'REWORK_REQUESTED' ? rework_reason : null,
        estimation_type === 'REJECTED' ? rejection_reason : null,
        'PENDING',
        1 // This is the first submission, so update_count is 1.
      ];
      await connection.query(insertSql, insertParams);
    }
    
    // If all queries were successful, commit the transaction.
    await connection.commit();
    res.status(201).json({ message: "Your decision has been submitted successfully." });

  } catch (error) {
    // If any error occurred, roll back the transaction.
    await connection.rollback(); 
    console.error("Submit cost estimation error:", error);
    res.status(500).json({ message: "Server error submitting your decision." });
  } finally {
    // Always release the connection back to the pool.
    connection.release();
  }
};

// This function is for Admins to get ALL estimations for a submission. It is correct.
exports.getEstimationsForSubmission = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req;

  try {
    let estimations;
    if (user.role === "admin") {
      const [allEstimations] = await pool.query(
        "SELECT ce.*, u.username as third_party_username FROM cost_estimations ce JOIN users u ON ce.user_id = u.id WHERE ce.submission_id = ?",
        [submissionId]
      );
      estimations = allEstimations;
    } else {
      return res.status(403).json({ message: "You are not authorized to view this data." });
    }
    res.json(estimations);
  } catch (error) {
    console.error("Get cost estimations error:", error);
    res.status(500).json({ message: "Server error fetching cost estimations." });
  }
};


// This function specifically gets the current user's decision for a submission. It is correct.
exports.getMyEstimationForSubmission = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM cost_estimations WHERE submission_id = ? AND user_id = ?",
      [submissionId, user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Decision not found." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Get my estimation for submission error:", error);
    res.status(500).json({ message: "Server error fetching your decision." });
  }
};

// This function for the "My Provided Estimations" page is correct.
exports.getEstimationsForCurrentUser = async (req, res) => {
    const { user } = req;
    const { search = "", page = 1, limit = 10, sortBy = "updated_at", sortOrder = "DESC" } = req.query;
    const offsetInt = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitInt = Math.max(1, parseInt(limit, 10));
    let queryParams = [user.id];
    let countQueryParams = [user.id];
    const baseQuery = `
        SELECT 
            ce.id, ce.submission_id, ce.updated_at, ce.estimation_type,
            ce.good_material_price, ce.package_defects_price, ce.physical_defects_price, ce.other_defects_price,
            s.material_description_snapshot, s.plant, m.mask_code, m.plantlocation 
        FROM cost_estimations ce 
        JOIN material_data_submissions s ON ce.submission_id = s.id 
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
        WHERE ce.user_id = ? AND ce.estimation_type = 'ESTIMATION'
    `;
    const countQuery = `
        SELECT COUNT(ce.id) as total 
        FROM cost_estimations ce 
        JOIN material_data_submissions s ON ce.submission_id = s.id 
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
        WHERE ce.user_id = ? AND ce.estimation_type = 'ESTIMATION'
    `;
    let whereClauses = [];
    if (search) {
        whereClauses.push(`(m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR m.plantlocation LIKE ?)`);
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
        countQueryParams.push(searchParam, searchParam, searchParam);
    }
    const whereString = whereClauses.length > 0 ? ` AND ${whereClauses.join(" AND ")}` : "";
    const finalBaseQuery = baseQuery + whereString;
    const finalCountQuery = countQuery + whereString;
    const allowedSortBy = { updated_at: "ce.updated_at", material_code: "m.mask_code", plant: "m.plantlocation" };
    const safeSortBy = allowedSortBy[sortBy] || "ce.updated_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const paginatedQuery = `${finalBaseQuery} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
    queryParams.push(limitInt, offsetInt);
    try {
        const [rows] = await pool.query(paginatedQuery, queryParams);
        const [countResult] = await pool.query(finalCountQuery, countQueryParams);
        const totalItems = countResult[0].total;
        res.json({ data: rows, currentPage: parseInt(page, 10), totalPages: Math.ceil(totalItems / limitInt), totalItems });
    } catch (error) {
        console.error("Get estimations for current user error:", error);
        res.status(500).json({ message: "Server error fetching your estimations." });
    }
};

// ==========================================================================
// MODIFICATION START: Replacing getActionsForCurrentUser with two new functions
// ==========================================================================

// NEW: Function specifically for the "My Reworks" page
exports.getReworksForCurrentUser = async (req, res) => {
    const { user } = req;
    const { search = "", page = 1, limit = 10, sortBy = "updated_at", sortOrder = "DESC" } = req.query;
    const offsetInt = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitInt = Math.max(1, parseInt(limit, 10));
    let queryParams = [user.id];
    let countQueryParams = [user.id];

    const baseQuery = `
        SELECT 
            ce.id, ce.submission_id, ce.updated_at, ce.estimation_type,
            ce.rework_reason, ce.rework_status,
            s.material_description_snapshot, s.plant, m.mask_code, m.plantlocation 
        FROM cost_estimations ce 
        JOIN material_data_submissions s ON ce.submission_id = s.id 
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
        WHERE ce.user_id = ? AND ce.estimation_type = 'REWORK_REQUESTED'
    `;
    const countQuery = `
        SELECT COUNT(ce.id) as total FROM cost_estimations ce 
        JOIN material_data_submissions s ON ce.submission_id = s.id 
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
        WHERE ce.user_id = ? AND ce.estimation_type = 'REWORK_REQUESTED'
    `;
    
    let whereClauses = [];
    if (search) {
        whereClauses.push(`(m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR m.plantlocation LIKE ?)`);
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
        countQueryParams.push(searchParam, searchParam, searchParam);
    }
    const whereString = whereClauses.length > 0 ? ` AND ${whereClauses.join(" AND ")}` : "";
    const finalBaseQuery = baseQuery + whereString;
    const finalCountQuery = countQuery + whereString;
    const allowedSortBy = { updated_at: "ce.updated_at", material_code: "m.mask_code", plant: "m.plantlocation" };
    const safeSortBy = allowedSortBy[sortBy] || "ce.updated_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const paginatedQuery = `${finalBaseQuery} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
    queryParams.push(limitInt, offsetInt);
    
    try {
        const [rows] = await pool.query(paginatedQuery, queryParams);
        const [countResult] = await pool.query(finalCountQuery, countQueryParams);
        const totalItems = countResult[0].total;
        res.json({ data: rows, currentPage: parseInt(page, 10), totalPages: Math.ceil(totalItems / limitInt), totalItems });
    } catch (error) {
        console.error("Get reworks for current user error:", error);
        res.status(500).json({ message: "Server error fetching your reworks." });
    }
};

// NEW: Function specifically for the "My Rejections" page
exports.getRejectionsForCurrentUser = async (req, res) => {
    const { user } = req;
    const { search = "", page = 1, limit = 10, sortBy = "updated_at", sortOrder = "DESC" } = req.query;
    const offsetInt = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitInt = Math.max(1, parseInt(limit, 10));
    let queryParams = [user.id];
    let countQueryParams = [user.id];

    const baseQuery = `
        SELECT 
            ce.id, ce.submission_id, ce.updated_at, ce.estimation_type,
            ce.rejection_reason,
            s.material_description_snapshot, s.plant, m.mask_code, m.plantlocation 
        FROM cost_estimations ce 
        JOIN material_data_submissions s ON ce.submission_id = s.id 
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
        WHERE ce.user_id = ? AND ce.estimation_type = 'REJECTED'
    `;
    const countQuery = `
        SELECT COUNT(ce.id) as total FROM cost_estimations ce 
        JOIN material_data_submissions s ON ce.submission_id = s.id 
        JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
        WHERE ce.user_id = ? AND ce.estimation_type = 'REJECTED'
    `;
    
    let whereClauses = [];
    if (search) {
        whereClauses.push(`(m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR m.plantlocation LIKE ?)`);
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
        countQueryParams.push(searchParam, searchParam, searchParam);
    }
    const whereString = whereClauses.length > 0 ? ` AND ${whereClauses.join(" AND ")}` : "";
    const finalBaseQuery = baseQuery + whereString;
    const finalCountQuery = countQuery + whereString;
    const allowedSortBy = { updated_at: "ce.updated_at", material_code: "m.mask_code", plant: "m.plantlocation" };
    const safeSortBy = allowedSortBy[sortBy] || "ce.updated_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const paginatedQuery = `${finalBaseQuery} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
    queryParams.push(limitInt, offsetInt);
    
    try {
        const [rows] = await pool.query(paginatedQuery, queryParams);
        const [countResult] = await pool.query(finalCountQuery, countQueryParams);
        const totalItems = countResult[0].total;
        res.json({ data: rows, currentPage: parseInt(page, 10), totalPages: Math.ceil(totalItems / limitInt), totalItems });
    } catch (error) {
        console.error("Get rejections for current user error:", error);
        res.status(500).json({ message: "Server error fetching your rejections." });
    }
};

// ==========================================================================
// MODIFICATION END: The old getActionsForCurrentUser function is now gone.
// ==========================================================================