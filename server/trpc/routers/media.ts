import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { makeId } from "../../lib/id";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const mediaRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.object({ lessonId: z.string().min(1), prompt: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await ctx.db.query.lessons.findFirst({ where: eq(schema.lessons.id, input.lessonId) });
      if (!lesson) throw new Error("Lesson not found");

      const count = await ctx.db
        .select({ id: schema.illustrations.id })
        .from(schema.illustrations)
        .where(eq(schema.illustrations.lessonId, input.lessonId));

      const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(input.prompt)}/900/500`;
      await ctx.db.insert(schema.illustrations).values({
        id: makeId(),
        lessonId: input.lessonId,
        imageUrl,
        prompt: input.prompt,
        orderIndex: count.length,
      });

      return { imageUrl };
    }),
});
