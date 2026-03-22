import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { config } from "../../config";
import { createAIProvider } from "../../ai/factory";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
    return {
      preferredProvider: settings?.preferredProvider ?? config.defaultAiProvider,
      openaiApiKey: settings?.openaiApiKey ?? "",
      openaiModel: settings?.openaiModel ?? config.defaultOpenAiModel,
      anthropicApiKey: settings?.anthropicApiKey ?? "",
      anthropicModel: settings?.anthropicModel ?? config.defaultAnthropicModel,
      xaiApiKey: settings?.xaiApiKey ?? "",
      xaiModel: settings?.xaiModel ?? config.defaultXaiModel,
      ollamaBaseUrl: settings?.ollamaBaseUrl ?? config.defaultOllamaBaseUrl,
      ollamaModel: settings?.ollamaModel ?? config.defaultOllamaModel,
      lmStudioBaseUrl: settings?.lmStudioBaseUrl ?? config.defaultLmStudioBaseUrl,
      lmStudioModel: settings?.lmStudioModel ?? config.defaultLmStudioModel,
      lmStudioApiKey: settings?.lmStudioApiKey ?? "",
    };
  }),

  update: publicProcedure
    .input(
      z.object({
        preferredProvider: z.enum(["openai", "ollama", "anthropic", "xai", "lmstudio"]).optional(),
        openaiApiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        anthropicApiKey: z.string().optional(),
        anthropicModel: z.string().optional(),
        xaiApiKey: z.string().optional(),
        xaiModel: z.string().optional(),
        ollamaBaseUrl: z.string().optional(),
        ollamaModel: z.string().optional(),
        lmStudioBaseUrl: z.string().optional(),
        lmStudioModel: z.string().optional(),
        lmStudioApiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
      const now = Date.now();
      const preferredProvider = input.preferredProvider ?? current?.preferredProvider ?? config.defaultAiProvider;
      const openaiApiKey = input.openaiApiKey ?? current?.openaiApiKey ?? "";
      const openaiModel = input.openaiModel ?? current?.openaiModel ?? config.defaultOpenAiModel;
      const anthropicApiKey = input.anthropicApiKey ?? current?.anthropicApiKey ?? "";
      const anthropicModel = input.anthropicModel ?? current?.anthropicModel ?? config.defaultAnthropicModel;
      const xaiApiKey = input.xaiApiKey ?? current?.xaiApiKey ?? "";
      const xaiModel = input.xaiModel ?? current?.xaiModel ?? config.defaultXaiModel;
      const ollamaBaseUrl = input.ollamaBaseUrl ?? current?.ollamaBaseUrl ?? config.defaultOllamaBaseUrl;
      const ollamaModel = input.ollamaModel ?? current?.ollamaModel ?? config.defaultOllamaModel;
      const lmStudioBaseUrl = input.lmStudioBaseUrl ?? current?.lmStudioBaseUrl ?? config.defaultLmStudioBaseUrl;
      const lmStudioModel = input.lmStudioModel ?? current?.lmStudioModel ?? config.defaultLmStudioModel;
      const lmStudioApiKey = input.lmStudioApiKey ?? current?.lmStudioApiKey ?? "";

      await ctx.db
        .insert(schema.settings)
        .values({
          id: 1,
          preferredProvider,
          openaiApiKey: openaiApiKey || null,
          openaiModel,
          anthropicApiKey: anthropicApiKey || null,
          anthropicModel,
          xaiApiKey: xaiApiKey || null,
          xaiModel,
          ollamaBaseUrl,
          ollamaModel,
          lmStudioBaseUrl,
          lmStudioModel,
          lmStudioApiKey: lmStudioApiKey || null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.settings.id,
          set: {
            preferredProvider,
            openaiApiKey: openaiApiKey || null,
            openaiModel,
            anthropicApiKey: anthropicApiKey || null,
            anthropicModel,
            xaiApiKey: xaiApiKey || null,
            xaiModel,
            ollamaBaseUrl,
            ollamaModel,
            lmStudioBaseUrl,
            lmStudioModel,
            lmStudioApiKey: lmStudioApiKey || null,
            updatedAt: now,
          },
        });

      return { success: true };
    }),

  testProvider: publicProcedure
    .input(
      z.object({
        preferredProvider: z.enum(["openai", "ollama", "anthropic", "xai", "lmstudio"]),
        openaiApiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        anthropicApiKey: z.string().optional(),
        anthropicModel: z.string().optional(),
        xaiApiKey: z.string().optional(),
        xaiModel: z.string().optional(),
        ollamaBaseUrl: z.string().optional(),
        ollamaModel: z.string().optional(),
        lmStudioBaseUrl: z.string().optional(),
        lmStudioModel: z.string().optional(),
        lmStudioApiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
      const provider = createAIProvider({
        preferredProvider: input.preferredProvider,
        openaiApiKey: input.openaiApiKey ?? current?.openaiApiKey ?? null,
        openaiModel: input.openaiModel ?? current?.openaiModel ?? config.defaultOpenAiModel,
        anthropicApiKey: input.anthropicApiKey ?? current?.anthropicApiKey ?? null,
        anthropicModel: input.anthropicModel ?? current?.anthropicModel ?? config.defaultAnthropicModel,
        xaiApiKey: input.xaiApiKey ?? current?.xaiApiKey ?? null,
        xaiModel: input.xaiModel ?? current?.xaiModel ?? config.defaultXaiModel,
        ollamaBaseUrl: input.ollamaBaseUrl ?? current?.ollamaBaseUrl ?? config.defaultOllamaBaseUrl,
        ollamaModel: input.ollamaModel ?? current?.ollamaModel ?? config.defaultOllamaModel,
        lmStudioBaseUrl: input.lmStudioBaseUrl ?? current?.lmStudioBaseUrl ?? config.defaultLmStudioBaseUrl,
        lmStudioModel: input.lmStudioModel ?? current?.lmStudioModel ?? config.defaultLmStudioModel,
        lmStudioApiKey: input.lmStudioApiKey ?? current?.lmStudioApiKey ?? config.lmStudioApiKey ?? null,
      });

      const result = await provider.chat({
        lessonTitle: "Connection Test",
        lessonContent: "This is a provider connection test.",
        message: "Reply in one short sentence confirming the provider is reachable.",
        conversationHistory: [],
      });

      return { success: true, message: result.message };
    }),
});
