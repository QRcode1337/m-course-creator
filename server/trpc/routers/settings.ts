import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
    return {
      preferredProvider: settings?.preferredProvider ?? "openai",
      openaiApiKey: settings?.openaiApiKey ?? "",
      openaiModel: settings?.openaiModel ?? "gpt-4o-mini",
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
        preferredProvider: z.string().optional(),
        openaiApiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        anthropicApiKey: z.string().optional(),
        openrouterApiKey: z.string().optional(),
        grokApiKey: z.string().optional(),
        anthropicModel: z.string().optional(),
        openrouterModel: z.string().optional(),
        grokModel: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      await ctx.db
        .insert(schema.settings)
        .values({
          id: 1,
          preferredProvider: input.preferredProvider ?? "openai",
          openaiApiKey: input.openaiApiKey ?? null,
          openaiModel: input.openaiModel ?? "gpt-4o-mini",
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.settings.id,
          set: {
            preferredProvider: input.preferredProvider ?? "openai",
            openaiApiKey: input.openaiApiKey ?? null,
            openaiModel: input.openaiModel ?? "gpt-4o-mini",
            updatedAt: now,
          },
        });

      return { success: true };
    }),
});
