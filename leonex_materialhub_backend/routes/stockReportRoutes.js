const express = require("express");
const router = express.Router();
const stockReportController = require("../controllers/stockReportController");
const authenticateToken = require("../middleware/authenticateToken");
const { isAdmin } = require("../middleware/authorization");

// All stock report routes require an authenticated admin user
router.use(authenticateToken, isAdmin);

// Route to get the main stock report data
router.get("/", stockReportController.getStockReport);

// Route to get the list of unique submitter usernames for the filter
router.get("/unique-submitters", stockReportController.getUniqueSubmitters);

module.exports = router;