// generate_new_hash.js
const bcrypt = require("bcryptjs");

// --- Define the passwords for your users here ---
const adminPassword = "admin123";
const cataloguerPassword = "cataloguer123";
const thirdpartyPassword = "thirdparty123";

async function generateAllHashes() {
  try {
    console.log("\n--- Generating Hashes for New Users ---\n");

    // Generate hash for the Admin
    const saltAdmin = await bcrypt.genSalt(10);
    const hashAdmin = await bcrypt.hash(adminPassword, saltAdmin);
    console.log("--- For Admin ---");
    console.log(`Password: "${adminPassword}"`);
    console.log(`Hashed:   "${hashAdmin}"\n`);

    // Generate hash for the Cataloguer
    const saltCat = await bcrypt.genSalt(10);
    const hashCat = await bcrypt.hash(cataloguerPassword, saltCat);
    console.log("--- For Cataloguer ---");
    console.log(`Password: "${cataloguerPassword}"`);
    console.log(`Hashed:   "${hashCat}"\n`);

    // Generate hash for the Third Party
    const salt3P = await bcrypt.genSalt(10);
    const hash3P = await bcrypt.hash(thirdpartyPassword, salt3P);
    console.log("--- For Third Party ---");
    console.log(`Password: "${thirdpartyPassword}"`);
    console.log(`Hashed:   "${hash3P}"\n`);

    console.log("--- Please copy these hashes into the SQL queries below. ---");
  } catch (error) {
    console.error("Error generating hashes:", error);
  }
}

generateAllHashes();
