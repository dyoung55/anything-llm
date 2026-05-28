const prisma = require("../prisma");
const fs = require("fs");
const path = require("path");

const migrationFlagPath =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../storage/.chat-enhancements-migrated")
    : path.resolve(process.env.STORAGE_DIR, ".chat-enhancements-migrated");

async function addChatEnhancements() {
  if (fs.existsSync(migrationFlagPath)) return;

  console.log("[Migration] Running addChatEnhancements...");

  // Add externalUsernameReference to workspace_chats
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "workspace_chats" ADD COLUMN "externalUsernameReference" TEXT`
    );
    console.log("[Migration] Added column: externalUsernameReference");
  } catch (_e) {
    // Column already exists
  }

  // Add apiKeyId to workspace_chats
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "workspace_chats" ADD COLUMN "apiKeyId" INTEGER`
    );
    console.log("[Migration] Added column: apiKeyId");
  } catch (_e) {
    // Column already exists
  }

  // Create workspace_chat_tool_calls table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "workspace_chat_tool_calls" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "chatId" INTEGER NOT NULL REFERENCES "workspace_chats"("id") ON DELETE CASCADE,
        "toolName" TEXT NOT NULL,
        "promptTokens" INTEGER NOT NULL DEFAULT 0,
        "completionTokens" INTEGER NOT NULL DEFAULT 0,
        "totalTokens" INTEGER NOT NULL DEFAULT 0,
        "callOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migration] Created table: workspace_chat_tool_calls");
  } catch (_e) {
    // Table already exists
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "idx_wctc_chatId" ON "workspace_chat_tool_calls"("chatId")`
    );
  } catch (_e) {}

  fs.writeFileSync(migrationFlagPath, new Date().toISOString(), "utf8");
  console.log("[Migration] addChatEnhancements completed.");
}

module.exports = { addChatEnhancements };
