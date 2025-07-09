// routes/plants.js
const express = require("express");
const router = express.Router();
const plantController = require("../controllers/plantController");
const authenticateToken = require("../middleware/authenticateToken");
const { isAdmin } = require("../middleware/authorization");

// Only admins need this for the user creation form
router.get(
  "/unique",
  authenticateToken,
  isAdmin,
  plantController.getUniquePlants
);

module.exports = router;
