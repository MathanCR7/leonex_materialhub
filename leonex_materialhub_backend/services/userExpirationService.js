// services/userExpirationService.js
const pool = require("../config/db");

const deactivateExpiredUsers = async () => {
  try {
    const [result] = await pool.query(
      "UPDATE users SET is_active = 0 WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = 1"
    );

    if (result.affectedRows > 0) {
      console.log(
        `Successfully deactivated ${result.affectedRows} expired user(s).`
      );
    } else {
      console.log("No expired users to deactivate.");
    }
  } catch (error) {
    console.error("Error during scheduled deactivation of users:", error);
  }
};

module.exports = {
  deactivateExpiredUsers,
};
