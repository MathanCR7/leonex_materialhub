const express = require("express");
const router = express.Router();
const masterMaterialController = require("../controllers/masterMaterialController");
const authenticateToken = require("../middleware/authenticateToken");
const { isAdmin } = require("../middleware/authorization");

// Apply authentication middleware to all routes in this file
router.use(authenticateToken);

// --- Public routes for authenticated users ---
router.get("/search", masterMaterialController.searchMasterMaterials);

router.get(
  "/details",
  masterMaterialController.getMasterMaterialDetails
);

// Route to get unique values for dropdowns (e.g., UOM, Category)
router.get("/unique-values", masterMaterialController.getUniqueMaterialValues);

// --- Admin-only route ---
router.post("/add", isAdmin, masterMaterialController.addMasterMaterial);

module.exports = router;
