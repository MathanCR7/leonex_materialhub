// routes/masterMaterials.js
const express = require("express");
const router = express.Router();
const masterMaterialController = require("../controllers/masterMaterialController");
const authenticateToken = require("../middleware/authMiddleware");

router.use(authenticateToken);

router.get("/search", masterMaterialController.searchMasterMaterials);
router.get(
  "/:materialCode/details", // Changed from /description
  masterMaterialController.getMasterMaterialDetails
);
router.get("/unique-values", masterMaterialController.getUniqueMaterialValues); // New route for UOM/Category

module.exports = router;
