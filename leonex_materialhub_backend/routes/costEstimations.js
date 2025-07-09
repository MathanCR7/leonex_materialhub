// routes/costEstimations.js
const express = require("express");
const router = express.Router();
const costEstimationController = require("../controllers/costEstimationController");
const authenticateToken = require("../middleware/authenticateToken");
const {
  isThirdParty,
  canAccessEstimations,
} = require("../middleware/authorization");

// All routes in this file require an authenticated user
router.use(authenticateToken);

// A third-party user gets a list of THEIR OWN provided estimations.
// This must come before the /:submissionId routes to be matched correctly.
router.get(
  "/my-estimations",
  isThirdParty,
  costEstimationController.getEstimationsForCurrentUser
);

// <<< NEW ROUTE FOR EDITING >>>
// Get the current user's specific estimation for a single submission (to populate an edit form).
// Must also come before the generic /:submissionId route.
router.get(
  "/my-estimation/:submissionId",
  isThirdParty,
  costEstimationController.getMyEstimationForSubmission
);

// A third-party user submits or updates their estimation for a given submission.
router.post(
  "/:submissionId",
  isThirdParty,
  costEstimationController.submitEstimation
);

// An admin or a third-party user can get estimation data for a submission.
router.get(
  "/:submissionId",
  canAccessEstimations,
  costEstimationController.getEstimationsForSubmission
);

module.exports = router;
