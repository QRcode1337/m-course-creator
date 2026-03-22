import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { config } from "../../config";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
    return {
      preferredProvider: settings?.preferredProvider ?? config.defaultAiProvider,
      openaiApiKey: settings?.openaiApiKey ?? "",
      openaiModel: settings?.openaiModel ?? config.defaultOpenAiModel,
      ollamaBaseUrl: settings?.ollamaBaseUrl ?? config.defaultOllamaBaseUrl,
      ollamaModel: settings?.ollamaModel ?? config.defaultOllamaModel,
      anthropicApiKey: "",
      openrouterApiKey: "",
      grokApiKey: "",
      anthropicModel: "",
      openrouterModel: "",
      grokModel: "",
    };
  }),

  update: publicProcedure
    .input(
      z.object({
        preferredProvider: z.enum(["openai", "ollama"]).optional(),
        openaiApiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        ollamaBaseUrl: z.string().optional(),
        ollamaModel: z.string().optional(),
        anthropicApiKey: z.string().optional(),
        openrouterApiKey: z.string().optional(),
        grokApiKey: z.string().optional(),
        anthropicModel: z.string().optional(),
        openrouterModel: z.string().optional(),
        grokModel: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
      const now = Date.now();
      const preferredProvider = input.preferredProvider ?? current?.preferredProvider ?? config.defaultAiProvider;
      const openaiApiKey = input.openaiApiKey ?? current?.openaiApiKey ?? "";
      const openaiModel = input.openaiModel ?? current?.openaiModel ?? config.defaultOpenAiModel;
      const ollamaBaseUrl = input.ollamaBaseUrl ?? current?.ollamaBaseUrl ?? config.defaultOllamaBaseUrl;
      const ollamaModel = input.ollamaModel ?? current?.ollamaModel ?? config.defaultOllamaModel;

      await ctx.db
        .insert(schema.settings)
        .values({
          id: 1,
          preferredProvider,
          openaiApiKey: openaiApiKey || null,
          openaiModel,
          ollamaBaseUrl,
          ollamaModel,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.settings.id,
          set: {
            preferredProvider,
            openaiApiKey: openaiApiKey || null,
            openaiModel,
            ollamaBaseUrl,
            ollamaModel,
            updatedAt: now,
          },
        });

      return { success: true };
    }),
});
