// middleware/authorization.js

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admin rights required." });
  }
};

const isCataloguer = (req, res, next) => {
  if (req.user && req.user.role === "cataloguer") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Cataloguer rights required." });
  }
};

const isThirdParty = (req, res, next) => {
  if (req.user && req.user.role === "thirdparties") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Third-party rights required." });
  }
};

// Allows Admins OR Cataloguers
const canSubmitData = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "cataloguer")
  ) {
    next();
  } else {
    res.status(403).json({
      message: "Access denied. You do not have permission to submit data.",
    });
  }
};

// --- NEW MIDDLEWARE ---
// Allows Admins OR Third-Parties to access estimation data
const canAccessEstimations = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "thirdparties")
  ) {
    next();
  } else {
    res
      .status(403)
      .json({
        message:
          "Access denied. You do not have permission to view estimation data.",
      });
  }
};

module.exports = {
  isAdmin,
  isCataloguer,
  isThirdParty,
  canSubmitData,
  canAccessEstimations, // Export the new middleware
};
