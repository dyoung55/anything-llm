const prisma = require("../prisma");
const fs = require("fs");
const path = require("path");

const migrationFlagPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/.api-key-description-migrated")
    : path.resolve(
        process.env.STORAGE_DIR,
        ".api-key-description-migrated"
      );

async function addApiKeyDescription() {
  if (fs.existsSync(migrationFlagPath)) return;

  console.log("[Migration] Adding description column to api_keys table...");
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "api_keys" ADD COLUMN "description" TEXT`
    );
    console.log("[Migration] Added column: description");
  } catch (_e) {
    // Column already exists — safe to ignore
  }

  fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");
  console.log("[Migration] addApiKeyDescription completed.");
}

module.exports = { addApiKeyDescription };
