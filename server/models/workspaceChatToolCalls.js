const prisma = require("../utils/prisma");

const WorkspaceChatToolCalls = {
  bulkCreate: async function (chatId, toolCallHistory = []) {
    if (!chatId || !toolCallHistory.length) return;
    try {
      await prisma.workspace_chat_tool_calls.createMany({
        data: toolCallHistory.map((entry, index) => ({
          chatId: Number(chatId),
          toolName: entry.tool,
          promptTokens: entry.promptTokens || 0,
          completionTokens: entry.completionTokens || 0,
          totalTokens: entry.totalTokens || 0,
          callOrder: entry.callOrder ?? index,
        })),
      });
    } catch (error) {
      console.error("[WorkspaceChatToolCalls.bulkCreate]", error.message);
    }
  },

  forChat: async function (chatId) {
    if (!chatId) return [];
    try {
      return await prisma.workspace_chat_tool_calls.findMany({
        where: { chatId: Number(chatId) },
        orderBy: { callOrder: "asc" },
      });
    } catch (error) {
      console.error("[WorkspaceChatToolCalls.forChat]", error.message);
      return [];
    }
  },
};

module.exports = { WorkspaceChatToolCalls };
