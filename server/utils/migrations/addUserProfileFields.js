const prisma = require("../prisma");
const fs = require("fs");
const path = require("path");

const migrationFlagPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/.user-profile-fields-migrated")
    : path.resolve(
        process.env.STORAGE_DIR,
        ".user-profile-fields-migrated"
      );

async function addUserProfileFields() {
  if (fs.existsSync(migrationFlagPath)) return;

  console.log("[Migration] Adding user profile fields (fullName, email, language, timezone)...");
  const columns = [
    ["fullName", "TEXT"],
    ["email", "TEXT"],
    ["language", "TEXT"],
    ["timezone", "TEXT"],
  ];

  for (const [col, type] of columns) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "users" ADD COLUMN "${col}" ${type}`
      );
      console.log(`[Migration] Added column: ${col}`);
    } catch (_e) {
      // Column already exists — safe to ignore
    }
  }

  fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");
  console.log("[Migration] addUserProfileFields completed.");
}

module.exports = { addUserProfileFields };
