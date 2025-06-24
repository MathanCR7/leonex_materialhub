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

// Mapping for defect image fields to their DB columns (for JSON path arrays)
const defectImageFieldToDbColumnMapping = {
  package_defect_images: "package_defects_images_paths",
  physical_defect_images: "physical_defects_images_paths",
  other_defect_images: "other_defects_images_paths",
};

// This function will be used by exported controller methods
const internalPrependMediaBaseUrl = (submission) => {
  if (!submission) return null;
  const newSubmission = { ...submission };

  for (const key in goodMediaFieldToDbColumnMapping) {
    const dbColumn = goodMediaFieldToDbColumnMapping[key];
    if (newSubmission[dbColumn]) {
      newSubmission[dbColumn] = `${MEDIA_BASE_URL}/${newSubmission[dbColumn]}`;
    }
  }

  for (const key in defectImageFieldToDbColumnMapping) {
    const dbColumn = defectImageFieldToDbColumnMapping[key];
    let pathsToProcess = [];
    if (typeof newSubmission[dbColumn] === "string") {
      try {
        const parsed = JSON.parse(newSubmission[dbColumn]);
        if (Array.isArray(parsed)) {
          pathsToProcess = parsed;
        }
      } catch (e) {
        console.warn(
          `[prependMediaBaseUrl] Failed to parse JSON for ${dbColumn}:`,
          newSubmission[dbColumn],
          e
        );
        pathsToProcess = []; // Keep as empty array if parsing fails
      }
    } else if (Array.isArray(newSubmission[dbColumn])) {
      // This case handles if data is already an array (e.g., from an intermediate step)
      pathsToProcess = newSubmission[dbColumn];
    } else {
      newSubmission[dbColumn] = []; // Ensure it's an array for frontend
    }

    newSubmission[dbColumn] = pathsToProcess
      .map((p) => (p ? `${MEDIA_BASE_URL}/${p}` : null))
      .filter(Boolean); // Filter out any nulls that might have resulted
  }
  return newSubmission;
};

const processUploadedFiles = (files, materialCode, plantCode, baseDirForDb) => {
  const filePathsForDb = {};
  const defectImagePathsForDb = {};
  const uploadedFileRelativePaths = []; // For rollback cleanup

  // baseDirForDb is already materialCode_plantCode
  const buildRelativePath = (file, subFolder) => {
    // subFolder will be 'good_media', 'package_defects', etc.
    return path
      .join(baseDirForDb, subFolder, file.filename)
      .replace(/\\/g, "/"); // Ensure forward slashes for DB/URL
  };

  // Process good media files
  for (const fieldName in goodMediaFieldToDbColumnMapping) {
    if (files && files[fieldName] && files[fieldName][0]) {
      const file = files[fieldName][0];
      const relativePath = buildRelativePath(file, "good_media");
      filePathsForDb[goodMediaFieldToDbColumnMapping[fieldName]] = relativePath;
      uploadedFileRelativePaths.push(relativePath);
    } else {
      filePathsForDb[goodMediaFieldToDbColumnMapping[fieldName]] = null;
    }
  }

  // Process defect media files
  for (const fieldName in defectImageFieldToDbColumnMapping) {
    const dbColumn = defectImageFieldToDbColumnMapping[fieldName];
    defectImagePathsForDb[dbColumn] = []; // Initialize as an array

    if (files && files[fieldName] && files[fieldName].length > 0) {
      let subFolder = "temp_defects"; // Default, should be overwritten
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
    // Convert to JSON string for DB, or null if empty
    defectImagePathsForDb[dbColumn] =
      defectImagePathsForDb[dbColumn].length > 0
        ? JSON.stringify(defectImagePathsForDb[dbColumn])
        : null;
  }
  return { filePathsForDb, defectImagePathsForDb, uploadedFileRelativePaths };
};

exports.submitMaterialData = async (req, res) => {
  const {
    material_code,
    material_description_snapshot, // Snapshot of description at time of submission
    uom,
    plant, // This is plantcode from materials table
    plant_name, // This is plantlocation from materials table
    category,
    soh_quantity, // Snapshot of SOH from materials table at time of form load
    good_material_count,
    package_defects_count,
    physical_defects_count,
    other_defects_count,
    package_defects_reasons,
    physical_defects_reasons,
    other_defects_reasons,
    missing_defects_status,
    is_completed,
  } = req.body;
  const submitted_by_username = req.user.username;

  if (!material_code || !plant || !submitted_by_username) {
    return res.status(400).json({
      message:
        "Material code, Plant code, and submitter username are required.",
    });
  }

  // Convert counts to numbers, defaulting to 0 if NaN or undefined
  const numericSoh = parseInt(soh_quantity, 10) || 0;
  const numericGoodCount = parseInt(good_material_count, 10) || 0;
  const numPackageDefects = parseInt(package_defects_count, 10) || 0;
  const numPhysicalDefects = parseInt(physical_defects_count, 10) || 0;
  const numOtherDefects = parseInt(other_defects_count, 10) || 0;

  // Calculate missing_material_count based on form inputs
  const missing_material_count =
    numericSoh -
    (numericGoodCount +
      numPackageDefects +
      numPhysicalDefects +
      numOtherDefects);
  // User provides good_material_count directly. The missing count is SOH - (all categories of materials accounted for).
  // The previous calculation was SOH - (all defect counts), which implies good_material_count = SOH - defects.
  // New understanding: User enters good_material_count.
  // missing_material_count = soh_quantity - (good_material_count + package_defects_count + physical_defects_count + other_defects_count)
  // The previous missing_material_count logic was: numericSoh - numPackageDefects - numPhysicalDefects - numOtherDefects;
  // This implies that good_material_count was implicitly derived.
  // If good_material_count is an input, then missing_material_count should be:
  // soh_quantity - (good_material_count + package_defect_count + physical_defect_count + other_defect_count)
  // The prompt says "below soh quantity add good material count , package_defects count and physical_defects count and other defects and calculate missing material count"
  // This implies `good_material_count` is an input.
  // So `missing_material_count` = `soh_quantity` - (`good_material_count` + sum of all defect counts)

  const files = req.files;
  // baseDirForDb will be `${material_code}_${plant}` for relative paths in DB
  const baseDirForDb = `${material_code}_${plant}`;
  const { filePathsForDb, defectImagePathsForDb, uploadedFileRelativePaths } =
    processUploadedFiles(files, material_code, plant, baseDirForDb);

  const connection = await pool.getConnection();
  try {
    // Check if a submission for this material_code and plant already exists
    const [existingRows] = await connection.query(
      "SELECT id FROM material_data_submissions WHERE material_code = ? AND plant = ?",
      [material_code, plant]
    );

    if (existingRows.length > 0) {
      // If submission exists, clean up newly uploaded files (if any) and return error
      for (const relativePath of uploadedFileRelativePaths) {
        const fullPathToClean = path.join(
          process.cwd(),
          "public",
          "media",
          relativePath
        );
        fs.unlink(fullPathToClean).catch((err) =>
          console.warn(
            `Cleanup: Failed to delete ${fullPathToClean}`,
            err.message
          )
        );
      }
      connection.release();
      return res.status(409).json({
        message: `A submission for material code ${material_code} at plant ${plant} already exists (ID: ${existingRows[0].id}). Please use the update functionality.`,
        existingSubmissionId: existingRows[0].id,
      });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO material_data_submissions (
        material_code, material_description_snapshot, uom, plant, plant_name, category, soh_quantity,
        good_material_count, package_defects_count, physical_defects_count, other_defects_count, missing_material_count,
        package_defects_reasons, physical_defects_reasons, other_defects_reasons, missing_defects_status,
        image_specification_path, image_packing_condition_path, image_item_spec_mentioned_path,
        image_product_top_view_path, image_3d_view_path, image_side_view_thickness_path,
        image_stock_condition_packing_path, video_item_inspection_path,
        package_defects_images_paths, physical_defects_images_paths, other_defects_images_paths,
        is_completed, submitted_by_username, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        material_code,
        material_description_snapshot,
        uom,
        plant, // This is plantcode
        plant_name,
        category,
        numericSoh, // SOH snapshot
        numericGoodCount, // good_material_count as entered by user
        numPackageDefects,
        numPhysicalDefects,
        numOtherDefects,
        missing_material_count, // calculated missing_material_count
        package_defects_reasons || null,
        physical_defects_reasons || null,
        other_defects_reasons || null,
        missing_defects_status || null,
        filePathsForDb.image_specification_path,
        filePathsForDb.image_packing_condition_path,
        filePathsForDb.image_item_spec_mentioned_path,
        filePathsForDb.image_product_top_view_path,
        filePathsForDb.image_3d_view_path,
        filePathsForDb.image_side_view_thickness_path,
        filePathsForDb.image_stock_condition_packing_path,
        filePathsForDb.video_item_inspection_path,
        defectImagePathsForDb.package_defects_images_paths,
        defectImagePathsForDb.physical_defects_images_paths,
        defectImagePathsForDb.other_defects_images_paths,
        is_completed === "true" || is_completed === true, // Ensure boolean
        submitted_by_username,
      ]
    );
    await connection.commit();
    res.status(201).json({
      message: "Material data submitted successfully.",
      submissionId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Submit material data error:", error);
    // Cleanup uploaded files on error
    for (const relativePath of uploadedFileRelativePaths) {
      const fullPathToClean = path.join(
        process.cwd(),
        "public",
        "media",
        relativePath
      );
      fs.unlink(fullPathToClean).catch((err) =>
        console.error(
          `Rollback cleanup: Error deleting ${fullPathToClean}`,
          err.message
        )
      );
    }
    res.status(500).json({ message: "Server error during data submission." });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateMaterialData = async (req, res) => {
  const { submissionId } = req.params;
  const {
    // material_code and plant are fixed for an existing submission
    material_description_snapshot, // Allow updating snapshot if description changes in master
    uom,
    // plant_name, // Typically derived from plant code, but can be snapshot
    category,
    soh_quantity, // SOH might change in master, so snapshot can be updated
    good_material_count,
    package_defects_count,
    physical_defects_count,
    other_defects_count,
    package_defects_reasons,
    physical_defects_reasons,
    other_defects_reasons,
    missing_defects_status,
    is_completed,
    plant_name, // if it's part of the editable fields for submission
  } = req.body;
  const submitted_by_username = req.user.username; // Record who made the update

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch existing submission to get material_code, plant, and old file paths
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
    const material_code = existingSubmission.material_code; // Fixed
    const plant_code = existingSubmission.plant; // Fixed (this is plantcode)

    // Process newly uploaded files, if any
    const baseDirForDb = `${material_code}_${plant_code}`;
    const {
      filePathsForDb: newGoodMediaPaths, // Contains paths for NEWLY UPLOADED good media
      defectImagePathsForDb: newDefectMediaPaths, // Contains JSON strings of paths for NEWLY UPLOADED defect media
      uploadedFileRelativePaths: newlyUploadedRelativePathsForRollback, // For rollback cleanup of new files
    } = processUploadedFiles(
      req.files,
      material_code,
      plant_code,
      baseDirForDb
    );

    const updateFields = {};
    if (material_description_snapshot !== undefined)
      updateFields.material_description_snapshot =
        material_description_snapshot;
    if (uom !== undefined) updateFields.uom = uom;
    if (plant_name !== undefined) updateFields.plant_name = plant_name; // If plant_name is part of submission data
    if (category !== undefined) updateFields.category = category;
    if (is_completed !== undefined)
      updateFields.is_completed =
        is_completed === "true" || is_completed === true;
    if (submitted_by_username)
      updateFields.submitted_by_username = submitted_by_username; // Always update who last touched it

    // Handle numeric fields, using existing values as fallback if not provided in update
    const numericSoh =
      soh_quantity !== undefined
        ? parseInt(soh_quantity, 10) || 0
        : existingSubmission.soh_quantity;
    const numericGoodCount =
      good_material_count !== undefined
        ? parseInt(good_material_count, 10) || 0
        : existingSubmission.good_material_count;
    const numPackageDefects =
      package_defects_count !== undefined
        ? parseInt(package_defects_count, 10) || 0
        : existingSubmission.package_defects_count;
    const numPhysicalDefects =
      physical_defects_count !== undefined
        ? parseInt(physical_defects_count, 10) || 0
        : existingSubmission.physical_defects_count;
    const numOtherDefects =
      other_defects_count !== undefined
        ? parseInt(other_defects_count, 10) || 0
        : existingSubmission.other_defects_count;

    if (soh_quantity !== undefined) updateFields.soh_quantity = numericSoh;
    if (good_material_count !== undefined)
      updateFields.good_material_count = numericGoodCount;
    if (package_defects_count !== undefined)
      updateFields.package_defects_count = numPackageDefects;
    if (physical_defects_count !== undefined)
      updateFields.physical_defects_count = numPhysicalDefects;
    if (other_defects_count !== undefined)
      updateFields.other_defects_count = numOtherDefects;

    // Recalculate missing_material_count based on potentially updated values
    updateFields.missing_material_count =
      numericSoh -
      (numericGoodCount +
        numPackageDefects +
        numPhysicalDefects +
        numOtherDefects);

    if (package_defects_reasons !== undefined)
      updateFields.package_defects_reasons = package_defects_reasons || null;
    if (physical_defects_reasons !== undefined)
      updateFields.physical_defects_reasons = physical_defects_reasons || null;
    if (other_defects_reasons !== undefined)
      updateFields.other_defects_reasons = other_defects_reasons || null;
    if (missing_defects_status !== undefined)
      updateFields.missing_defects_status = missing_defects_status || null;

    // --- File update logic ---
    const oldFilesToDeleteAfterCommit = [];

    // Good Media: Update if new file uploaded or existing one cleared
    for (const fieldName in goodMediaFieldToDbColumnMapping) {
      const dbColumn = goodMediaFieldToDbColumnMapping[fieldName];
      const fileClearedFlag = `${fieldName}_cleared`; // e.g., image_specification_cleared

      if (newGoodMediaPaths[dbColumn]) {
        // A new file was uploaded for this field
        if (existingSubmission[dbColumn]) {
          // If there was an old file, mark it for deletion
          oldFilesToDeleteAfterCommit.push(
            path.join(
              process.cwd(),
              "public",
              "media",
              existingSubmission[dbColumn]
            )
          );
        }
        updateFields[dbColumn] = newGoodMediaPaths[dbColumn];
      } else if (req.body[fileClearedFlag] === "true") {
        // Frontend explicitly marked this file for clearing
        if (existingSubmission[dbColumn]) {
          oldFilesToDeleteAfterCommit.push(
            path.join(
              process.cwd(),
              "public",
              "media",
              existingSubmission[dbColumn]
            )
          );
        }
        updateFields[dbColumn] = null; // Set to null in DB
      }
      // If no new file and not cleared, existing path remains untouched (not added to updateFields)
    }

    // Defect Media: More complex due to arrays of files
    for (const fieldName in defectImageFieldToDbColumnMapping) {
      const dbColumn = defectImageFieldToDbColumnMapping[fieldName];
      const filesClearedFlag = `${fieldName}_cleared`; // e.g., package_defect_images_cleared

      // `newDefectMediaPaths[dbColumn]` is a JSON string of NEWLY UPLOADED file paths, or null
      const newUploadedPathsForCategory = newDefectMediaPaths[dbColumn]
        ? JSON.parse(newDefectMediaPaths[dbColumn])
        : [];

      // Get existing paths from DB (these are URLs or relative paths if not yet processed by prepend)
      let existingPathsFromDb = [];
      if (
        typeof existingSubmission[dbColumn] === "string" &&
        existingSubmission[dbColumn].startsWith("[")
      ) {
        try {
          existingPathsFromDb = JSON.parse(existingSubmission[dbColumn]);
        } catch (e) {
          /* ignore */
        }
      } else if (Array.isArray(existingSubmission[dbColumn])) {
        existingPathsFromDb = existingSubmission[dbColumn]; // Should be array of relative paths from DB
      }

      // `req.body[dbColumn]` might contain remaining old paths if frontend sends them.
      // Or, frontend might only send newly uploaded files and clear flags.
      // Assuming frontend sends the full desired list of *existing* (non-cleared) file URLs for this category if not replacing all.
      // This part is tricky. A robust way:
      // 1. If `_cleared` is true: All old files for this category are gone. New files (if any) are the only ones.
      // 2. If new files are uploaded: They are added. What about old ones?
      //    Frontend needs to send which old files to KEEP.
      //    Let's assume `req.body[fieldName + "_keep"]` is an array of old file paths to keep. (This is a new contract)
      //    Or, simpler: if `_cleared` is true, all old files are deleted. If new files are uploaded, they are added.
      //    If neither, existing files are kept. This means frontend must explicitly send `_cleared` or upload new to change.

      let finalPathsForDb = [];
      if (req.body[filesClearedFlag] === "true") {
        // All old files for this category are to be removed
        existingPathsFromDb.forEach((p) =>
          oldFilesToDeleteAfterCommit.push(
            path.join(process.cwd(), "public", "media", p)
          )
        );
        finalPathsForDb = newUploadedPathsForCategory; // Only new files remain
      } else {
        // Keep existing files that were NOT explicitly removed by frontend.
        // This requires frontend to send back the list of files it wants to keep from the original set.
        // For simplicity, let's assume if not `_cleared` and no new files uploaded for this field,
        // existing paths are kept. If new files are uploaded AND not `_cleared`, new files are ADDED to existing.
        // This is problematic. A better approach: if new files are uploaded for a category,
        // assume they REPLACE all old files for that category unless specified.
        // The current `processUploadedFiles` makes `newDefectMediaPaths[dbColumn]` only contain newly uploaded files.

        // If new files were uploaded for this defect category
        if (newUploadedPathsForCategory.length > 0) {
          // All old files for this category are replaced by the new set
          existingPathsFromDb.forEach((p) =>
            oldFilesToDeleteAfterCommit.push(
              path.join(process.cwd(), "public", "media", p)
            )
          );
          finalPathsForDb = newUploadedPathsForCategory;
        } else {
          // No new files uploaded for this category, and not cleared. Keep existing.
          // No change to `updateFields[dbColumn]` unless it was explicitly set to null by `_cleared`
          // So, if no new files and not cleared, this dbColumn won't be in updateFields.
          // This logic is tricky. A common pattern is: client sends the full array of desired file paths.
          // If a path was in old set but not in new set -> delete.
          // If a path is in new set but not in old set -> it's a new file (already handled by multer).
          // Given the current structure, if new files are uploaded (`newUploadedPathsForCategory.length > 0`),
          // they are intended to be the *new set* for that category, replacing old ones.
          if (newUploadedPathsForCategory.length > 0) {
            updateFields[dbColumn] = JSON.stringify(finalPathsForDb);
          }
          // If `newUploadedPathsForCategory.length === 0` AND not `_cleared`, means no change to this field's files.
        }
      }
      if (
        req.body[filesClearedFlag] === "true" ||
        newUploadedPathsForCategory.length > 0
      ) {
        updateFields[dbColumn] =
          finalPathsForDb.length > 0 ? JSON.stringify(finalPathsForDb) : null;
      }
    }
    // --- End File update logic ---

    if (
      Object.keys(updateFields).length === 0 &&
      newlyUploadedRelativePathsForRollback.length === 0
    ) {
      await connection.rollback(); // No actual DB changes needed, so rollback.
      connection.release();
      // Fetch current row to return it
      const [currentRow] = await pool.query(
        "SELECT * FROM material_data_submissions WHERE id = ?",
        [submissionId]
      );
      return res.json({
        message: "No changes detected to update.",
        submission:
          currentRow.length > 0
            ? internalPrependMediaBaseUrl(currentRow[0])
            : null,
      });
    }

    const setClauses = Object.keys(updateFields)
      .map((key) => `${key} = ?`)
      .join(", ");
    const finalSetClause =
      setClauses + (setClauses ? ", " : "") + "updated_at = CURRENT_TIMESTAMP";
    const values = [...Object.values(updateFields), submissionId];

    await connection.query(
      `UPDATE material_data_submissions SET ${finalSetClause} WHERE id = ?`,
      values
    );
    await connection.commit();

    // After successful commit, delete old files marked for deletion
    for (const filePathToDelete of oldFilesToDeleteAfterCommit) {
      fs.unlink(filePathToDelete).catch((err) =>
        console.warn(
          `Post-commit: Failed to delete old file ${filePathToDelete}:`,
          err.message
        )
      );
    }

    const [updatedRows] = await connection.query(
      "SELECT * FROM material_data_submissions WHERE id = ?",
      [submissionId]
    );
    res.json({
      message: "Material data updated successfully.",
      submission:
        updatedRows.length > 0
          ? internalPrependMediaBaseUrl(updatedRows[0])
          : null,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update material data error:", error);
    // Cleanup newly uploaded files on error during transaction
    for (const newlyUploadedRelativePath of newlyUploadedRelativePathsForRollback) {
      const fullPathToClean = path.join(
        process.cwd(),
        "public",
        "media",
        newlyUploadedRelativePath
      );
      fs.unlink(fullPathToClean).catch((err) =>
        console.error(
          `Rollback cleanup: Error deleting ${fullPathToClean}:`,
          err.message
        )
      );
    }
    res.status(500).json({ message: "Server error during data update." });
  } finally {
    if (connection) connection.release();
  }
};

exports.getSubmissionDetails = async (req, res) => {
  const { submissionId } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM material_data_submissions WHERE id = ?",
      [submissionId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Submission not found." });
    }
    res.json(internalPrependMediaBaseUrl(rows[0]));
  } catch (error) {
    console.error("Get submission details error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching submission details." });
  }
};

exports.getLatestSubmissionByMaterialCode = async (req, res) => {
  const { materialCode } = req.params;
  const { plantCode } = req.query; // plantCode from query parameter

  if (!plantCode) {
    return res.status(400).json({
      message: "Plant code is required to fetch the latest submission.",
    });
  }

  try {
    const [rows] = await pool.query(
      // Ensure 'plant' in the WHERE clause matches the DB column name for plant code
      "SELECT * FROM material_data_submissions WHERE material_code = ? AND plant = ? ORDER BY created_at DESC, id DESC LIMIT 1",
      [materialCode, plantCode]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        // Send 404 if no submission found, so frontend can react
        message: `No submission found for material ${materialCode} at plant ${plantCode}.`,
      });
    }
    res.json(internalPrependMediaBaseUrl(rows[0]));
  } catch (error) {
    console.error(
      "Get latest submission by material code and plant error:",
      error
    );
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
  } = req.query;
  const offsetInt =
    (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const limitInt = Math.max(1, parseInt(limit, 10));

  let queryParams = [true]; // For is_completed = ?
  let countQueryParams = [true]; // For is_completed = ?
  let baseQuery =
    "SELECT * FROM material_data_submissions WHERE is_completed = ?";
  let countQuery =
    "SELECT COUNT(*) as total FROM material_data_submissions WHERE is_completed = ?";

  if (search) {
    const searchQueryVal = `%${search}%`;
    const searchCondition =
      " AND (material_code LIKE ? OR material_description_snapshot LIKE ? OR plant_name LIKE ? OR category LIKE ? OR plant LIKE ?)"; // Added plant
    baseQuery += searchCondition;
    countQuery += searchCondition;
    queryParams.push(
      searchQueryVal,
      searchQueryVal,
      searchQueryVal,
      searchQueryVal,
      searchQueryVal
    );
    countQueryParams.push(
      searchQueryVal,
      searchQueryVal,
      searchQueryVal,
      searchQueryVal,
      searchQueryVal
    );
  }

  const allowedSortBy = [
    "material_code",
    "created_at",
    "updated_at",
    "plant_name", // Column in material_data_submissions
    "plant", // Column in material_data_submissions (plantcode)
    "category",
    "submitted_by_username",
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
  baseQuery += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  queryParams.push(limitInt, offsetInt);

  try {
    const [rows] = await pool.query(baseQuery, queryParams);
    const [countResult] = await pool.query(countQuery, countQueryParams);
    const totalItems = countResult[0].total;
    res.json({
      data: rows.map(internalPrependMediaBaseUrl),
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
