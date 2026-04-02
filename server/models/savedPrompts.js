const prisma = require("../utils/prisma");

const SavedPrompts = {
  get: async function (clause = {}) {
    try {
      const prompt = await prisma.saved_prompts.findFirst({
        where: clause,
      });
      return prompt || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      const prompts = await prisma.saved_prompts.findMany({
        where: clause,
        take: limit || undefined,
      });
      return prompts;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  create: async function (userId = null, promptData = {}) {
    try {
      const prompt = await prisma.saved_prompts.create({
        data: {
          name: String(promptData.name),
          prompt: String(promptData.prompt),
          exampleResponse: String(promptData.exampleResponse),
          uid: userId ? Number(userId) : 0,
          userId: userId ? Number(userId) : null,
        },
      });
      return prompt;
    } catch (error) {
      console.error("Failed to create saved prompt", error.message);
      return null;
    }
  },

  getUserPrompts: async function (userId = null) {
    try {
      return (
        await prisma.saved_prompts.findMany({
          where: { userId: !!userId ? Number(userId) : null },
          orderBy: { createdAt: "desc" },
        })
      )?.map((prompt) => ({
        id: prompt.id,
        name: prompt.name,
        prompt: prompt.prompt,
        exampleResponse: prompt.exampleResponse,
        createdAt: prompt.createdAt,
        lastEditedAt: prompt.lastEditedAt,
      }));
    } catch (error) {
      console.error("Failed to get user saved prompts", error.message);
      return [];
    }
  },

  update: async function (promptId = null, promptData = {}) {
    try {
      const prompt = await prisma.saved_prompts.update({
        where: { id: Number(promptId) },
        data: {
          ...promptData,
          lastEditedAt: new Date(),
        },
      });
      return prompt;
    } catch (error) {
      console.error("Failed to update saved prompt", error.message);
      return null;
    }
  },

  delete: async function (promptId = null) {
    try {
      await prisma.saved_prompts.delete({
        where: { id: Number(promptId) },
      });
      return true;
    } catch (error) {
      console.error("Failed to delete saved prompt", error.message);
      return false;
    }
  },
};

module.exports.SavedPrompts = SavedPrompts;
