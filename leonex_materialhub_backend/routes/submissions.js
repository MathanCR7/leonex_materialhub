// routes/submissions.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const submissionController = require("../controllers/submissionController");
const authenticateToken = require("../middleware/authMiddleware");
const pool = require("../config/db"); // Used by attachSubmissionDetailsForUpdate

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    let materialCodeForPath;
    let plantCodeForPath;

    // Determine materialCode and plantCode based on request type
    if (req.method === "POST" && req.originalUrl.endsWith("/submit")) {
      materialCodeForPath = req.body.material_code;
      plantCodeForPath = req.body.plant; // 'plant' from form is the plant_code
    } else if (req.method === "PUT" && req.params.submissionId) {
      // For updates, material_code and plant are fetched by attachSubmissionDetailsForUpdate middleware
      if (!req.submissionDetailsForPath) {
        // This middleware should have run and populated this. If not, it's an error.
        return cb(
          new Error("Submission details for path not found on update."),
          false
        );
      }
      materialCodeForPath = req.submissionDetailsForPath.material_code;
      plantCodeForPath = req.submissionDetailsForPath.plant; // 'plant' from DB is plant_code
    }

    if (!materialCodeForPath || !plantCodeForPath) {
      return cb(
        new Error(
          "Material code or Plant code could not be determined for upload path."
        ),
        false
      );
    }

    // Base path for the material and plant: public/media/material_code_plant_code
    const materialPlantBaseDir = path.join(
      process.cwd(), // Use process.cwd() for robust pathing from project root
      "public",
      "media",
      `${materialCodeForPath}_${plantCodeForPath}`
    );

    // Determine specific subfolder based on fieldname
    let subFolder = "temp_uploads"; // Default fallback, should be overwritten
    if (
      file.fieldname.startsWith("image_") ||
      file.fieldname.startsWith("video_")
    ) {
      // Check if it's one of the "good media" fields
      const goodMediaFields = [
        "image_specification",
        "image_packing_condition",
        "image_item_spec_mentioned",
        "image_product_top_view",
        "image_3d_view",
        "image_side_view_thickness",
        "image_stock_condition_packing",
        "video_item_inspection",
      ];
      if (goodMediaFields.includes(file.fieldname)) {
        subFolder = "good_media";
      }
    } else if (file.fieldname === "package_defect_images") {
      subFolder = "package_defects";
    } else if (file.fieldname === "physical_defect_images") {
      subFolder = "physical_defects";
    } else if (file.fieldname === "other_defect_images") {
      subFolder = "other_defects";
    }
    // If subFolder remains "temp_uploads", it's an unrecognized field, which might be an issue.

    const finalUploadPath = path.join(materialPlantBaseDir, subFolder);

    try {
      await fs.mkdirs(finalUploadPath); // fs-extra ensures directory exists
      cb(null, finalUploadPath);
    } catch (err) {
      console.error(`Error creating directory ${finalUploadPath}:`, err);
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Remove [] from fieldname if it's an array (e.g., defect_images[])
    const originalFieldName = file.fieldname.replace(/\[\]$/, "");
    cb(
      null,
      originalFieldName + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only images and videos are allowed."),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB limit per file
  fileFilter: fileFilter,
}).fields([
  // Good Media (single file per field)
  { name: "image_specification", maxCount: 1 },
  { name: "image_packing_condition", maxCount: 1 },
  { name: "image_item_spec_mentioned", maxCount: 1 },
  { name: "image_product_top_view", maxCount: 1 },
  { name: "image_3d_view", maxCount: 1 },
  { name: "image_side_view_thickness", maxCount: 1 },
  { name: "image_stock_condition_packing", maxCount: 1 },
  { name: "video_item_inspection", maxCount: 1 },
  // Defect Media (multiple files per field, e.g., up to 10)
  { name: "package_defect_images", maxCount: 10 },
  { name: "physical_defect_images", maxCount: 10 },
  { name: "other_defect_images", maxCount: 10 },
]);

// Middleware to handle Multer errors specifically
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer Upload Error:", err);
    return res.status(400).json({
      message: `File upload error (Multer): ${err.message}`,
      code: err.code,
    });
  } else if (err) {
    // Other errors that might occur during file processing by Multer/storage
    console.error(
      "Generic Upload Error (possibly from storage.destination):",
      err
    );
    return res
      .status(400)
      .json({ message: `File upload error: ${err.message}` });
  }
  next(); // Proceed if no Multer-related error
};

// Middleware to fetch material_code and plant for PUT requests (for multer pathing)
const attachSubmissionDetailsForUpdate = async (req, res, next) => {
  if (req.method === "PUT" && req.params.submissionId) {
    try {
      const [rows] = await pool.query(
        "SELECT material_code, plant FROM material_data_submissions WHERE id = ?",
        [req.params.submissionId]
      );
      if (rows.length > 0) {
        req.submissionDetailsForPath = {
          // Attach to request object for multer
          material_code: rows[0].material_code,
          plant: rows[0].plant, // 'plant' in DB is the plant_code
        };
      } else {
        // If submission not found, it's a 404. Let controller handle full 404 response.
        // For multer pathing, this means it might fail if it proceeds.
        // It's better to stop here to prevent multer from attempting to use undefined paths.
        return res
          .status(404)
          .json({
            message:
              "Submission not found, cannot determine upload path for update.",
          });
      }
    } catch (error) {
      console.error(
        "Error fetching submission details for multer pathing:",
        error
      );
      return res
        .status(500)
        .json({ message: "Server error preparing for file update." });
    }
  }
  next();
};

// All routes below are protected
router.use(authenticateToken);

router.post(
  "/submit",
  // For POST, multer's destination will use req.body.material_code and req.body.plant
  upload, // Handles file parsing and saving
  handleUploadErrors, // Catches errors from multer
  submissionController.submitMaterialData // Proceeds if upload is fine
);

router.get("/:submissionId", submissionController.getSubmissionDetails);

router.get(
  "/latest/:materialCode", // materialCode in path
  submissionController.getLatestSubmissionByMaterialCode // Expects plantCode as query param
);

router.put(
  "/update/:submissionId",
  attachSubmissionDetailsForUpdate, // Must run before 'upload' to set details for multer's destination
  upload, // Handles new file parsing and saving
  handleUploadErrors, // Catches errors from multer
  submissionController.updateMaterialData // Proceeds if upload fine, handles DB update & old file cleanup
);

router.get("/completed/all", submissionController.getCompletedSubmissions);

module.exports = router;
