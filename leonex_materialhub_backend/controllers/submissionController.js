// controllers/submissionController.js

const pool = require("../config/db");
const path = require("path");
const fs = require("fs-extra");

const MEDIA_BASE_URL =
  process.env.MEDIA_BASE_URL ||
  `http://localhost:${process.env.PORT || 5001}/media`;

// Mapping for "Good Media"
const goodMediaFieldToDbColumnMapping = {
  image_specification: "image_specification_path",
  image_packing_condition: "image_packing_condition_path",
  image_item_spec_mentioned: "image_item_spec_mentioned_path",
  image_product_top_view: "image_product_top_view_path",
  image_3d_view: "image_3d_view_path",
  image_side_view_thickness: "image_side_view_thickness_path",
  image_stock_condition_packing: "image_stock_condition_packing_path",
  video_item_inspection: "video_item_inspection_path",
};

// Mapping for defect image fields to their DB columns
const defectImageFieldToDbColumnMapping = {
  package_defect_images: "package_defects_images_paths",
  physical_defect_images: "physical_defects_images_paths",
  other_defect_images: "other_defects_images_paths",
};

// Helper to safely delete a file and log errors without crashing.
const deleteFileFromServer = async (relativePath) => {
  if (!relativePath) return;
  try {
    const fullPath = path.join(process.cwd(), "public", "media", relativePath);
    if (await fs.pathExists(fullPath)) {
      await fs.unlink(fullPath);
      console.log(`Successfully deleted file: ${relativePath}`);
    }
  } catch (err) {
    console.error(`Error deleting file ${relativePath}:`, err);
  }
};

// This helper prepends the full server URL to file paths for the frontend.
// This function is idempotent.
const internalPrependMediaBaseUrl = (submission) => {
  if (!submission) return null;
  const newSubmission = { ...submission };

  const createUrl = (p) => {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    return `${MEDIA_BASE_URL}/${p}`;
  };

  for (const key in goodMediaFieldToDbColumnMapping) {
    const dbColumn = goodMediaFieldToDbColumnMapping[key];
    if (newSubmission[dbColumn]) {
      newSubmission[dbColumn] = createUrl(newSubmission[dbColumn]);
    }
  }

  for (const key in defectImageFieldToDbColumnMapping) {
    const dbColumn = defectImageFieldToDbColumnMapping[key];
    let pathsToProcess = [];
    if (typeof newSubmission[dbColumn] === "string") {
      try {
        const parsed = JSON.parse(newSubmission[dbColumn]);
        if (Array.isArray(parsed)) pathsToProcess = parsed;
      } catch (e) {
        // Ignore parsing errors
      }
    } else if (Array.isArray(newSubmission[dbColumn])) {
      pathsToProcess = newSubmission[dbColumn];
    }
    newSubmission[dbColumn] = (pathsToProcess || [])
      .map(createUrl)
      .filter(Boolean);
  }
  return newSubmission;
};

// This helper processes uploaded files and generates the relative paths for the database.
const processUploadedFiles = (files, materialCode, plantCode) => {
  const baseDirForDb = `${materialCode}_${plantCode}`;
  const filePathsForDb = {};
  const defectImagePathsForDb = {};
  const uploadedFileRelativePaths = [];

  const buildRelativePath = (file, subFolder) => {
    return path
      .join(baseDirForDb, subFolder, file.filename)
      .replace(/\\/g, "/");
  };

  for (const fieldName in goodMediaFieldToDbColumnMapping) {
    if (files && files[fieldName] && files[fieldName][0]) {
      const file = files[fieldName][0];
      const relativePath = buildRelativePath(file, "good_media");
      filePathsForDb[goodMediaFieldToDbColumnMapping[fieldName]] = relativePath;
      uploadedFileRelativePaths.push(relativePath);
    }
  }

  for (const fieldName in defectImageFieldToDbColumnMapping) {
    const dbColumn = defectImageFieldToDbColumnMapping[fieldName];
    defectImagePathsForDb[dbColumn] = [];
    if (files && files[fieldName] && files[fieldName].length > 0) {
      let subFolder = "temp_uploads";
      if (fieldName === "package_defect_images") subFolder = "package_defects";
      else if (fieldName === "physical_defect_images")
        subFolder = "physical_defects";
      else if (fieldName === "other_defect_images") subFolder = "other_defects";

      files[fieldName].forEach((file) => {
        const relativePath = buildRelativePath(file, subFolder);
        defectImagePathsForDb[dbColumn].push(relativePath);
        uploadedFileRelativePaths.push(relativePath);
      });
    }
  }
  return { filePathsForDb, defectImagePathsForDb, uploadedFileRelativePaths };
};

exports.submitMaterialData = async (req, res) => {
  const { material_code, plant } = req.body;
  const { user } = req;

  if (
    user.role === "cataloguer" &&
    !user.plants?.some((p) => p.plantcode === plant)
  ) {
    return res.status(403).json({
      message: "You are not authorized to submit data for this plant.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      "SELECT id FROM material_data_submissions WHERE material_code = ? AND plant = ?",
      [material_code, plant]
    );
    if (existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: `A submission for material ${material_code} at plant ${plant} already exists. Please use the update functionality.`,
        existingSubmissionId: existingRows[0].id,
      });
    }

    const { filePathsForDb, defectImagePathsForDb } = processUploadedFiles(
      req.files,
      material_code,
      plant
    );

    const numericSoh = parseInt(req.body.soh_quantity, 10) || 0;
    const numericGoodCount = parseInt(req.body.good_material_count, 10) || 0;
    const numPackageDefects = parseInt(req.body.package_defects_count, 10) || 0;
    const numPhysicalDefects =
      parseInt(req.body.physical_defects_count, 10) || 0;
    const numOtherDefects = parseInt(req.body.other_defects_count, 10) || 0;
    const missing_material_count =
      numericSoh -
      (numericGoodCount +
        numPackageDefects +
        numPhysicalDefects +
        numOtherDefects);

    const submissionData = {
      ...req.body,
      soh_quantity: numericSoh,
      good_material_count: numericGoodCount,
      package_defects_count: numPackageDefects,
      physical_defects_count: numPhysicalDefects,
      other_defects_count: numOtherDefects,
      missing_material_count,
      submitted_by_username: user.username,
      is_completed: req.body.is_completed === "true",
      ...filePathsForDb,
      package_defects_images_paths:
        defectImagePathsForDb.package_defects_images_paths.length > 0
          ? JSON.stringify(defectImagePathsForDb.package_defects_images_paths)
          : null,
      physical_defects_images_paths:
        defectImagePathsForDb.physical_defects_images_paths.length > 0
          ? JSON.stringify(defectImagePathsForDb.physical_defects_images_paths)
          : null,
      other_defects_images_paths:
        defectImagePathsForDb.other_defects_images_paths.length > 0
          ? JSON.stringify(defectImagePathsForDb.other_defects_images_paths)
          : null,
    };
    delete submissionData.package_defect_images;
    delete submissionData.physical_defect_images;
    delete submissionData.other_defect_images;

    const [result] = await connection.query(
      "INSERT INTO material_data_submissions SET ?",
      [submissionData]
    );
    await connection.commit();
    res.status(201).json({
      message: "Material data submitted successfully.",
      submissionId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Submit material data error:", error);
    res.status(500).json({ message: "Server error during data submission." });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateMaterialData = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingSubRows] = await connection.query(
      "SELECT * FROM material_data_submissions WHERE id = ?",
      [submissionId]
    );
    if (existingSubRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res
        .status(404)
        .json({ message: "Submission not found for update." });
    }
    const existingSubmission = existingSubRows[0];

    if (
      user.role === "cataloguer" &&
      !user.plants?.some((p) => p.plantcode === existingSubmission.plant)
    ) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({
        message: "You are not authorized to update data for this plant.",
      });
    }

    const { filePathsForDb, defectImagePathsForDb } = processUploadedFiles(
      req.files,
      existingSubmission.material_code,
      existingSubmission.plant
    );

    const updateFields = {};

    const fieldsToUpdate = [
      "material_description_snapshot",
      "uom",
      "plantlocation", // UPDATED: Changed from "plant_name" to match the database schema
      "category",
      "soh_quantity",
      "good_material_count",
      "package_defects_count",
      "physical_defects_count",
      "other_defects_count",
      "package_defects_reasons",
      "physical_defects_reasons",
      "other_defects_reasons",
      "missing_defects_status",
    ];
    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field] || null;
      }
    });

    if (
      req.body.good_material_count !== undefined ||
      req.body.package_defects_count !== undefined ||
      req.body.physical_defects_count !== undefined ||
      req.body.other_defects_count !== undefined
    ) {
      const numericSoh =
        parseInt(
          req.body.soh_quantity ?? existingSubmission.soh_quantity,
          10
        ) || 0;
      const numericGoodCount =
        parseInt(
          req.body.good_material_count ??
            existingSubmission.good_material_count,
          10
        ) || 0;
      const numPackageDefects =
        parseInt(
          req.body.package_defects_count ??
            existingSubmission.package_defects_count,
          10
        ) || 0;
      const numPhysicalDefects =
        parseInt(
          req.body.physical_defects_count ??
            existingSubmission.physical_defects_count,
          10
        ) || 0;
      const numOtherDefects =
        parseInt(
          req.body.other_defects_count ??
            existingSubmission.other_defects_count,
          10
        ) || 0;
      updateFields.missing_material_count =
        numericSoh -
        (numericGoodCount +
          numPackageDefects +
          numPhysicalDefects +
          numOtherDefects);
    }

    updateFields.is_completed = req.body.is_completed === "true";
    updateFields.submitted_by_username = user.username;
    updateFields.updated_at = new Date();

    for (const field of Object.keys(goodMediaFieldToDbColumnMapping)) {
      const dbCol = goodMediaFieldToDbColumnMapping[field];
      const oldPath = existingSubmission[dbCol];
      if (filePathsForDb[dbCol]) {
        updateFields[dbCol] = filePathsForDb[dbCol];
        if (oldPath) await deleteFileFromServer(oldPath);
      } else if (req.body[`${field}_cleared`] === "true") {
        updateFields[dbCol] = null;
        if (oldPath) await deleteFileFromServer(oldPath);
      }
    }

    for (const field of Object.keys(defectImageFieldToDbColumnMapping)) {
      const dbCol = defectImageFieldToDbColumnMapping[field];
      const newFilePaths = defectImagePathsForDb[dbCol] || [];
      let existingPaths = [];
      try {
        existingPaths = JSON.parse(existingSubmission[dbCol] || "[]");
      } catch (e) {
        existingPaths = [];
      }
      const keptUrls = JSON.parse(req.body[`kept_${dbCol}`] || "[]");
      const keptRelativePaths = keptUrls.map((url) =>
        url.replace(`${MEDIA_BASE_URL}/`, "")
      );
      const pathsToDelete = existingPaths.filter(
        (p) => !keptRelativePaths.includes(p)
      );
      for (const pathToDelete of pathsToDelete) {
        await deleteFileFromServer(pathToDelete);
      }
      const finalPaths = [...keptRelativePaths, ...newFilePaths];
      updateFields[dbCol] =
        finalPaths.length > 0 ? JSON.stringify(finalPaths) : null;
    }

    if (Object.keys(updateFields).length > 0) {
      await connection.query(
        "UPDATE material_data_submissions SET ? WHERE id = ?",
        [updateFields, submissionId]
      );
    }

    await connection.commit();
    res.json({ message: "Material data updated successfully." });
  } catch (error) {
    await connection.rollback();
    console.error("Update material data error:", error);
    res.status(500).json({ message: "Server error during data update." });
  } finally {
    if (connection) connection.release();
  }
};

exports.getSubmissionDetails = async (req, res) => {
  const { submissionId } = req.params;
  const { user } = req;

  try {
    const [rows] = await pool.query(
      `SELECT s.*, m.mask_code 
       FROM material_data_submissions s
       LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode
       WHERE s.id = ?`,
      [submissionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Submission not found." });
    }
    const submission = rows[0];

    const hasAccessToPlant =
      user.role === "admin" ||
      user.plants?.some((p) => p.plantcode === submission.plant);

    if (!hasAccessToPlant) {
      return res
        .status(403)
        .json({ message: "Access denied to this submission's plant data." });
    }

    let responseData = internalPrependMediaBaseUrl(submission);

    if (user.role === "thirdparties") {
      responseData.material_code = responseData.mask_code || "MASKED";
    }
    if (user.role !== "admin") {
      delete responseData.mask_code;
    }

    res.json(responseData);
  } catch (error) {
    console.error("Get submission details error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching submission details." });
  }
};

exports.getLatestSubmissionByMaterialCode = async (req, res) => {
  const { materialCode } = req.params;
  const { plantCode } = req.query;
  const { user } = req;

  if (!plantCode) {
    return res.status(400).json({ message: "Plant code is required." });
  }

  const hasAccessToPlant =
    user.role === "admin" ||
    user.plants?.some((p) => p.plantcode === plantCode);

  if (!hasAccessToPlant) {
    return res
      .status(403)
      .json({ message: "Access denied to this plant's data." });
  }

  try {
    let actualMaterialCode = materialCode;
    if (user.role === "thirdparties") {
      const [material] = await pool.query(
        "SELECT material_code FROM materials WHERE mask_code = ? AND plantcode = ?",
        [materialCode, plantCode]
      );
      if (material.length === 0) {
        return res.status(404).json({ message: "Material not found." });
      }
      actualMaterialCode = material[0].material_code;
    }

    const [rows] = await pool.query(
      `SELECT s.*, m.mask_code 
       FROM material_data_submissions s
       LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode
       WHERE s.material_code = ? AND s.plant = ? ORDER BY s.created_at DESC, id DESC LIMIT 1`,
      [actualMaterialCode, plantCode]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        message: `No submission found for the specified material and plant.`,
      });
    }

    let responseData = internalPrependMediaBaseUrl(rows[0]);
    if (user.role === "thirdparties") {
      responseData.material_code = materialCode;
    }
    if (user.role !== "admin") {
      delete responseData.mask_code;
    }

    res.json(responseData);
  } catch (error) {
    console.error("Get latest submission by material code error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching latest submission." });
  }
};

exports.getCompletedSubmissions = async (req, res) => {
  const {
    search,
    sortBy = "created_at",
    sortOrder = "DESC",
    page = 1,
    limit = 10,
    estimationStatus, // <<< ADDED PARAMETER
  } = req.query;
  const { user } = req;

  const offsetInt =
    (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const limitInt = Math.max(1, parseInt(limit, 10));

  let queryParams = [];
  let countQueryParams = [];

  const estimationCheckField =
    user.role === "thirdparties"
      ? ", ce.id IS NOT NULL AS has_user_estimated"
      : "";
  const estimationJoin =
    user.role === "thirdparties"
      ? "LEFT JOIN cost_estimations ce ON s.id = ce.submission_id AND ce.user_id = ?"
      : "";

  if (user.role === "thirdparties") {
    queryParams.push(user.id);
    countQueryParams.push(user.id);
  }

  queryParams.push(true);
  countQueryParams.push(true);

  let baseQuery = ` SELECT s.*, m.mask_code, m.plantlocation ${estimationCheckField} FROM material_data_submissions s  LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode ${estimationJoin} WHERE s.is_completed = ?`;
  let countQuery = ` SELECT COUNT(s.id) as total  FROM material_data_submissions s LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode ${estimationJoin} WHERE s.is_completed = ?`;

  // <<< FIX: SERVER-SIDE FILTERING LOGIC
  if (user.role === "thirdparties" && estimationStatus) {
    if (estimationStatus === "provided") {
      baseQuery += " AND ce.id IS NOT NULL";
      countQuery += " AND ce.id IS NOT NULL";
    } else if (estimationStatus === "pending") {
      baseQuery += " AND ce.id IS NULL";
      countQuery += " AND ce.id IS NULL";
    }
  }
  // <<< END OF FIX

  if (user.role === "cataloguer" || user.role === "thirdparties") {
    if (user.plants && user.plants.length > 0) {
      const plantCodes = user.plants.map((p) => p.plantcode);
      baseQuery += " AND s.plant IN (?)";
      countQuery += " AND s.plant IN (?)";
      queryParams.push(plantCodes);
      countQueryParams.push(plantCodes);
    } else {
      return res.json({
        data: [],
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
      });
    }
  }

  if (search) {
    const searchQueryVal = `%${search}%`;
    const searchCondition =
      user.role === "thirdparties"
        ? " AND (m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR m.plantlocation LIKE ? OR s.category LIKE ? OR s.plant LIKE ?)"
        : " AND (s.material_code LIKE ? OR m.mask_code LIKE ? OR s.material_description_snapshot LIKE ? OR m.plantlocation LIKE ? OR s.category LIKE ? OR s.plant LIKE ?)";

    baseQuery += searchCondition;
    countQuery += searchCondition;

    if (user.role === "thirdparties") {
      const searchParams = Array(5).fill(searchQueryVal);
      queryParams.push(...searchParams);
      countQueryParams.push(...searchParams);
    } else {
      const searchParams = Array(6).fill(searchQueryVal);
      queryParams.push(...searchParams);
      countQueryParams.push(...searchParams);
    }
  }

  const allowedSortBy = [
    "material_code",
    "mask_code",
    "created_at",
    "updated_at",
    "plant_name",
    "plant",
    "category",
    "submitted_by_username",
  ];
  let safeSortBy;
  if (allowedSortBy.includes(sortBy)) {
    if (sortBy === "material_code" && user.role === "thirdparties") {
      safeSortBy = "m.mask_code";
    } else if (sortBy === "mask_code") {
      safeSortBy = `m.mask_code`;
    } else if (sortBy === "plant_name") {
      safeSortBy = "m.plantlocation";
    } else {
      safeSortBy = `s.${sortBy}`;
    }
  } else {
    safeSortBy = "s.created_at";
  }

  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  baseQuery += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  queryParams.push(limitInt, offsetInt);

  try {
    const [rows] = await pool.query(baseQuery, queryParams);
    const [countResult] = await pool.query(countQuery, countQueryParams);
    const totalItems = countResult[0].total;

    const processedData = rows.map((row) => {
      let submission = internalPrependMediaBaseUrl(row);
      if (user.role === "thirdparties") {
        submission.material_code = submission.mask_code;
        submission.has_user_estimated = !!row.has_user_estimated;
      }
      if (user.role !== "admin") {
        delete submission.mask_code;
      }
      return submission;
    });

    res.json({
      data: processedData,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(totalItems / limitInt),
      totalItems,
    });
  } catch (error) {
    console.error("Get completed submissions error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching completed submissions." });
  }
};
