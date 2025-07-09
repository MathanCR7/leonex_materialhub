// routes/materialManagement.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const materialManagementController = require("../controllers/materialManagementController");
const authenticateToken = require("../middleware/authenticateToken");
const { isAdmin } = require("../middleware/authorization");

// All routes in this file are for Admins only
router.use(authenticateToken, isAdmin);

// Configure multer for CSV file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV files are allowed."), false);
    }
  },
});

// GET /api/materials/manage - Get a paginated list of materials
router.get("/", materialManagementController.getMaterials);

// GET /api/materials/manage/template - Download the CSV import template
router.get("/template", materialManagementController.downloadTemplate);

// POST /api/materials/manage/import - Import materials from a CSV file
router.post(
  "/import",
  upload.single("csvfile"), // 'csvfile' is the name of the form field
  materialManagementController.importMaterials
);

module.exports = router;
