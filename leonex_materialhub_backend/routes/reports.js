const express = require("express");
const router = express.Router();
// DEFINITIVE FIX: Point to the correct, dedicated reportController
const reportController = require("../controllers/reportController");
const authenticateToken = require("../middleware/authenticateToken");
const { isAdmin } = require("../middleware/authorization");

// All report routes require an authenticated admin user
router.use(authenticateToken, isAdmin);

// This route now correctly uses the exported function from reportController
router.get("/unique-plants", reportController.getUniquePlantsForReport);

// Route to get the summary report of all third-party costs
router.get("/cost-summary", reportController.getCostSummaryReport);

// Route to get the detailed cost report for a specific user
router.get(
  "/cost-details/:userId",
  reportController.getCostDetailReportForUser
);

module.exports = router;