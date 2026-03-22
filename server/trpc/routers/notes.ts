import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { makeId } from "../../lib/id";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const notesRouter = createTRPCRouter({
  getByLessonId: publicProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(schema.userNotes)
        .where(eq(schema.userNotes.lessonId, input.lessonId));
      return rows[0] ?? null;
    }),

  save: publicProcedure
    .input(z.object({ lessonId: z.string().min(1), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const existing = await ctx.db
        .select()
        .from(schema.userNotes)
        .where(eq(schema.userNotes.lessonId, input.lessonId));

      if (existing[0]) {
        await ctx.db
          .update(schema.userNotes)
          .set({ content: input.content, updatedAt: now })
          .where(eq(schema.userNotes.lessonId, input.lessonId));
        return { success: true, id: existing[0].id };
      }

      const id = makeId();
      await ctx.db.insert(schema.userNotes).values({
        id,
        lessonId: input.lessonId,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      }).run();
      return { success: true, id };
    }),
});
