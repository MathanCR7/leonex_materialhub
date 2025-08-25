const express = require("express");
const router = express.Router();
const costEstimationController = require("../controllers/costEstimationController");
const authenticateToken = require("../middleware/authenticateToken");
const { isThirdParty, canAccessEstimations } = require("../middleware/authorization");

// All routes in this file are protected
router.use(authenticateToken);

// Route for the "My Completed Estimations" page
router.get("/my-estimations", isThirdParty, costEstimationController.getEstimationsForCurrentUser);

// --- MODIFICATION: Pointing to the two new controller functions ---
// NEW: Route for the "My Reworks" page
router.get("/my-reworks", isThirdParty, costEstimationController.getReworksForCurrentUser);

// NEW: Route for the "My Rejections" page
router.get("/my-rejections", isThirdParty, costEstimationController.getRejectionsForCurrentUser);
// --- END MODIFICATION ---

// Route to get a single decision for the inspection page form
router.get("/my-estimation/:submissionId", isThirdParty, costEstimationController.getMyEstimationForSubmission);

// Route to submit any decision (estimation, rework, or rejection)
router.post("/:submissionId", isThirdParty, costEstimationController.submitEstimation);

// Route for admins to see all estimations for a submission
router.get("/:submissionId", canAccessEstimations, costEstimationController.getEstimationsForSubmission);

module.exports = router;