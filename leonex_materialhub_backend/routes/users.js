// routes/users.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authenticateToken");
const { isAdmin } = require("../middleware/authorization");

// All user routes require the user to be an authenticated Admin
router.use(authenticateToken, isAdmin);

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
// Note: A DELETE route could be added here if needed.


// Route for the third-party user filter dropdown on the admin report pages
// This path is '/third-parties/list'
router.get('/third-parties/list', userController.getThirdPartyUsers);

// Routes for admin to view third-party actions
// This path is '/reports/reworks'
router.get('/reports/reworks', userController.getAllReworks);
// This path is '/reports/rejections'
router.get('/reports/rejections', userController.getAllRejections);






router.get("/admin-actions/third-parties", userController.getThirdPartyUsers);
router.get("/admin-actions/reworks", userController.getAllReworks);
router.get("/admin-actions/rejections", userController.getAllRejections);
router.get("/admin-actions/reworks/export", userController.exportReworks);
router.get("/admin-actions/rejections/export", userController.exportRejections);



module.exports = router;
