// controllers/costEstimationController.js
const pool = require("../config/db");

// This function remains the same, it works for submitting AND updating.
exports.submitEstimation = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req; // from authenticateToken middleware
  const {
    good_material_price,
    package_defects_price,
    physical_defects_price,
    other_defects_price,
  } = req.body;

  try {
    // A composite unique key on (submission_id, user_id) in the DB is required for this to work.
    // ALTER TABLE cost_estimations ADD UNIQUE KEY submission_user_unique (submission_id, user_id);
    await pool.query(
      `INSERT INTO cost_estimations (
        submission_id, user_id, good_material_price, package_defects_price, physical_defects_price, other_defects_price
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        good_material_price = VALUES(good_material_price),
        package_defects_price = VALUES(package_defects_price),
        physical_defects_price = VALUES(physical_defects_price),
        other_defects_price = VALUES(other_defects_price),
        updated_at = CURRENT_TIMESTAMP`,
      [
        submissionId,
        user.id,
        good_material_price,
        package_defects_price,
        physical_defects_price,
        other_defects_price,
      ]
    );

    res
      .status(201)
      .json({ message: "Cost estimation submitted or updated successfully." });
  } catch (error) {
    console.error("Submit cost estimation error:", error);
    res
      .status(500)
      .json({ message: "Server error submitting cost estimation." });
  }
};

// This function is for Admins to get ALL estimations for a submission
// or for a third-party user to see their own estimation (in an array)
exports.getEstimationsForSubmission = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req; // Get user details from the token

  try {
    let estimations;

    if (user.role === "admin") {
      const [allEstimations] = await pool.query(
        "SELECT ce.*, u.username as third_party_username FROM cost_estimations ce JOIN users u ON ce.user_id = u.id WHERE ce.submission_id = ?",
        [submissionId]
      );
      estimations = allEstimations;
    } else if (user.role === "thirdparties") {
      const [myEstimation] = await pool.query(
        "SELECT * FROM cost_estimations WHERE submission_id = ? AND user_id = ?",
        [submissionId, user.id]
      );
      estimations = myEstimation; // Always returns an array ([{...}] or [])
    } else {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this data." });
    }

    res.json(estimations);
  } catch (error) {
    console.error("Get cost estimations error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching cost estimations." });
  }
};

// <<< NEW FUNCTION FOR EDITING >>>
// This function specifically gets the current user's estimation for a submission.
// It is designed to populate the edit form and returns a single object or 404.
exports.getMyEstimationForSubmission = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM cost_estimations WHERE submission_id = ? AND user_id = ?",
      [submissionId, user.id]
    );

    if (rows.length === 0) {
      // It's better to return a 404 if the specific resource is not found.
      // The frontend can interpret this as "no estimation submitted yet".
      return res.status(404).json({ message: "Estimation not found." });
    }

    // Return the single estimation object, not an array
    res.json(rows[0]);
  } catch (error) {
    console.error("Get my estimation for submission error:", error);
    res.status(500).json({ message: "Server error fetching your estimation." });
  }
};

// This function is for the list view on the "My Provided Estimations" page
exports.getEstimationsForCurrentUser = async (req, res) => {
  // ... (This function remains unchanged and is correct)
  const { user } = req;
  const {
    search = "",
    page = 1,
    limit = 10,
    sortBy = "updated_at",
    sortOrder = "DESC",
  } = req.query;

  const offsetInt =
    (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const limitInt = Math.max(1, parseInt(limit, 10));

  let queryParams = [user.id];
  let countQueryParams = [user.id];

  const baseQuery = `SELECT 
    ce.id, 
    ce.submission_id, 
    ce.updated_at,
    ce.good_material_price,
    ce.package_defects_price,
    ce.physical_defects_price,
    ce.other_defects_price,
    s.material_description_snapshot, 
    s.plant, 
    m.mask_code, 
    m.plantlocation 
  FROM cost_estimations ce 
  JOIN material_data_submissions s ON ce.submission_id = s.id 
  JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode 
  WHERE ce.user_id = ?`;

  const countQuery = `SELECT COUNT(ce.id) as total FROM cost_estimations ce JOIN material_data_submissions s ON ce.submission_id = s.id JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode WHERE ce.user_id = ?`;

  let whereClauses = [];
  if (search) {
    whereClauses.push(
      `(m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR m.plantlocation LIKE ?)`
    );
    const searchParam = `%${search}%`;
    queryParams.push(searchParam, searchParam, searchParam);
    countQueryParams.push(searchParam, searchParam, searchParam);
  }

  const whereString =
    whereClauses.length > 0 ? ` AND ${whereClauses.join(" AND ")}` : "";
  const finalBaseQuery = baseQuery + whereString;
  const finalCountQuery = countQuery + whereString;

  const allowedSortBy = {
    updated_at: "ce.updated_at",
    material_code: "m.mask_code",
    plant: "m.plantlocation",
  };
  const safeSortBy = allowedSortBy[sortBy] || "ce.updated_at";
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const paginatedQuery = `${finalBaseQuery} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  queryParams.push(limitInt, offsetInt);

  try {
    const [rows] = await pool.query(paginatedQuery, queryParams);
    const [countResult] = await pool.query(finalCountQuery, countQueryParams);
    const totalItems = countResult[0].total;

    res.json({
      data: rows,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(totalItems / limitInt),
      totalItems,
    });
  } catch (error) {
    console.error("Get estimations for current user error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching your estimations." });
  }
};
