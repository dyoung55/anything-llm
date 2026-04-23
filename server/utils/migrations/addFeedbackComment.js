const prisma = require("../prisma");
const fs = require("fs");
const path = require("path");

const migrationFlagPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/.feedback-comment-migrated")
    : path.resolve(process.env.STORAGE_DIR, ".feedback-comment-migrated");

async function addFeedbackComment() {
  if (fs.existsSync(migrationFlagPath)) return;

  console.log("[Migration] Adding feedbackComment column to workspace_chats...");
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "workspace_chats" ADD COLUMN "feedbackComment" TEXT`
    );
    console.log("[Migration] Added column: feedbackComment");
  } catch (_e) {
    // Column already exists — safe to ignore
  }

  fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");
  console.log("[Migration] addFeedbackComment completed.");
}

module.exports = { addFeedbackComment };
