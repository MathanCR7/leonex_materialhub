const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const submissionController = require("../controllers/submissionController");
const authenticateToken = require("../middleware/authenticateToken");
const { canSubmitData } = require("../middleware/authorization");
const pool = require("../config/db");

// Middleware to fetch details for PUT requests to set upload paths
const attachSubmissionDetailsForUpdate = async (req, res, next) => {
  if (req.method === "PUT" && req.params.submissionId) {
    try {
      const [rows] = await pool.query(
        "SELECT material_code, plant FROM material_data_submissions WHERE id = ?",
        [req.params.submissionId]
      );
      if (rows.length > 0) {
        req.submissionDetailsForPath = {
          material_code: rows[0].material_code,
          plant: rows[0].plant,
        };
      } else {
        // If submission doesn't exist, stop before multer tries to process files.
        return res.status(404).json({
          message: "Submission not found, cannot determine upload path.",
        });
      }
    } catch (error) {
      console.error("Error attaching submission details:", error);
      return res
        .status(500)
        .json({ message: "Server error preparing for file update." });
    }
  }
  next();
};

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    let materialCodeForPath;
    let plantCodeForPath;

    // Determine materialCode and plantCode based on request type
    if (req.method === "POST" && req.originalUrl.endsWith("/submit")) {
      materialCodeForPath = req.body.material_code;
      plantCodeForPath = req.body.plant;
    } else if (req.method === "PUT" && req.params.submissionId) {
      if (!req.submissionDetailsForPath) {
        return cb(
          new Error("Submission details for path not found on update."),
          false
        );
      }
      materialCodeForPath = req.submissionDetailsForPath.material_code;
      plantCodeForPath = req.submissionDetailsForPath.plant;
    }

    if (!materialCodeForPath || !plantCodeForPath) {
      return cb(
        new Error(
          "Material code or Plant code could not be determined for upload path."
        ),
        false
      );
    }

    const materialPlantBaseDir = path.join(
      process.cwd(),
      "public",
      "media",
      `${materialCodeForPath}_${plantCodeForPath}`
    );

    // Determine subfolder based on file fieldname
    let subFolder = "temp_uploads"; // Default
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
    } else if (file.fieldname === "package_defect_images") {
      subFolder = "package_defects";
    } else if (file.fieldname === "physical_defect_images") {
      subFolder = "physical_defects";
    } else if (file.fieldname === "other_defect_images") {
      subFolder = "other_defects";
    }

    const finalUploadPath = path.join(materialPlantBaseDir, subFolder);

    try {
      await fs.mkdirs(finalUploadPath);
      cb(null, finalUploadPath);
    } catch (err) {
      console.error(`Error creating directory ${finalUploadPath}:`, err);
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
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
  fileFilter: fileFilter,
}).fields([
  { name: "image_specification", maxCount: 1 },
  { name: "image_packing_condition", maxCount: 1 },
  { name: "image_item_spec_mentioned", maxCount: 1 },
  { name: "image_product_top_view", maxCount: 1 },
  { name: "image_3d_view", maxCount: 1 },
  { name: "image_side_view_thickness", maxCount: 1 },
  { name: "image_stock_condition_packing", maxCount: 1 },
  { name: "video_item_inspection", maxCount: 1 },
  { name: "package_defect_images", maxCount: 10 },
  { name: "physical_defect_images", maxCount: 10 },
  { name: "other_defect_images", maxCount: 10 },
]);

// Middleware to handle Multer-specific errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ message: `File upload error: ${err.message}`, code: err.code });
  } else if (err) {
    // For other errors (e.g., from destination function)
    return res
      .status(400)
      .json({ message: `File upload error: ${err.message}` });
  }
  next();
};

// All routes below are protected
router.use(authenticateToken);

// POST route for new submissions
router.post(
  "/submit",
  canSubmitData,
  (req, res, next) => {
    // Use a wrapper to call multer and its error handler
    upload(req, res, (err) => handleUploadErrors(err, req, res, next));
  },
  submissionController.submitMaterialData
);

// PUT route for updating submissions
router.put(
  "/update/:submissionId",
  canSubmitData,
  attachSubmissionDetailsForUpdate,
  (req, res, next) => {
    // Wrapper for multer on update
    upload(req, res, (err) => handleUploadErrors(err, req, res, next));
  },
  submissionController.updateMaterialData
);

// GET routes are accessible to all authenticated users; controllers handle role-based filtering
router.get("/:submissionId", submissionController.getSubmissionDetails);
router.get(
  "/latest/:materialCode",
  submissionController.getLatestSubmissionByMaterialCode
);
router.get("/completed/all", submissionController.getCompletedSubmissions);

module.exports = router;
