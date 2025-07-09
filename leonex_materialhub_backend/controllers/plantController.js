// controllers/plantController.js
const pool = require("../config/db");

// Get unique plant codes and names for admin forms
exports.getUniquePlants = async (req, res) => {
  try {
    const [plants] = await pool.query(
      "SELECT DISTINCT plantcode, plantlocation FROM materials WHERE plantcode IS NOT NULL AND plantcode <> '' ORDER BY plantlocation, plantcode"
    );
    res.json(plants);
  } catch (error) {
    console.error("Error fetching unique plants:", error);
    res.status(500).json({ message: "Server error fetching plant data" });
  }
};
