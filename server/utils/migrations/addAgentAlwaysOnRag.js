const prisma = require("../prisma");
const fs = require("fs");
const path = require("path");

const migrationFlagPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/.agent-always-on-rag-migrated")
    : path.resolve(
        process.env.STORAGE_DIR,
        ".agent-always-on-rag-migrated"
      );

async function addAgentAlwaysOnRag() {
  if (fs.existsSync(migrationFlagPath)) return;

  console.log("[Migration] Adding agentAlwaysOnRag column to workspaces...");
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "workspaces" ADD COLUMN "agentAlwaysOnRag" BOOLEAN DEFAULT false`
    );
    console.log("[Migration] Added column: agentAlwaysOnRag");
  } catch (_e) {
    // Column already exists — safe to ignore
  }

  fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");
  console.log("[Migration] addAgentAlwaysOnRag completed.");
}

module.exports = { addAgentAlwaysOnRag };
