// hash_test.js
// --- THIS IS THE LINE TO CHANGE ---
const bcrypt = require("bcryptjs"); // Change this from 'bcrypt' to 'bcryptjs'

const myPassword = "admin123";
const storedHash =
  "$2b$10$t/H.p4p.EAq5j5dJ2kXgGeV7E2LzJt0C5k2j/jA2xZ7b8Y3e4K2mC";

async function testHash() {
  console.log("--- BCrypt Sanity Check (using bcryptjs) ---");
  console.log(`Plain Text Password: "${myPassword}"`);
  console.log(`Stored Hash from DB: "${storedHash}"`);

  try {
    const isMatch = await bcrypt.compare(myPassword, storedHash);

    console.log(`\n>>> Comparison Result: ${isMatch} <<<`);

    if (isMatch) {
      console.log("\n✅ SUCCESS: The password matches the stored hash.");
    } else {
      console.log("\n❌ FAILURE: The password does NOT match the stored hash.");
    }
  } catch (error) {
    console.error("An error occurred during the bcrypt test:", error);
  }
}

testHash();
