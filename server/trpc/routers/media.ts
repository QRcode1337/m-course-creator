import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { makeId } from "../../lib/id";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const mediaRouter = createTRPCRouter({
  getByLesson: publicProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.illustrations)
        .where(eq(schema.illustrations.lessonId, input.lessonId))
        .orderBy(schema.illustrations.orderIndex);
    }),

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

  delete: publicProcedure
    .input(z.object({ illustrationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(schema.illustrations).where(eq(schema.illustrations.id, input.illustrationId));
      return { success: true };
    }),

  reorder: publicProcedure
    .input(
      z.object({
        lessonId: z.string().min(1),
        orderedIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: schema.illustrations.id })
        .from(schema.illustrations)
        .where(eq(schema.illustrations.lessonId, input.lessonId));

      const existingIds = new Set(existing.map((item) => item.id));
      if (input.orderedIds.some((id) => !existingIds.has(id))) {
        throw new Error("Invalid illustration reorder payload.");
      }

      ctx.db.transaction((tx) => {
        input.orderedIds.forEach((id, index) => {
          tx.update(schema.illustrations)
            .set({ orderIndex: index })
            .where(eq(schema.illustrations.id, id))
            .run();
        });
      });

      return { success: true };
    }),

  generateAllForCourse: publicProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        skipExisting: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const chapters = await ctx.db
        .select({ id: schema.chapters.id })
        .from(schema.chapters)
        .where(eq(schema.chapters.courseId, input.courseId))
        .orderBy(schema.chapters.orderIndex);

      const chapterIds = chapters.map((chapter) => chapter.id);
      if (chapterIds.length === 0) {
        throw new Error("Course not found or contains no lessons.");
      }

      const lessons = await ctx.db
        .select({
          id: schema.lessons.id,
          title: schema.lessons.title,
          content: schema.lessons.content,
        })
        .from(schema.lessons)
        .where(inArray(schema.lessons.chapterId, chapterIds))
        .orderBy(schema.lessons.orderIndex);

      let generated = 0;
      let skipped = 0;

      for (const lesson of lessons) {
        const existing = await ctx.db
          .select({ id: schema.illustrations.id })
          .from(schema.illustrations)
          .where(eq(schema.illustrations.lessonId, lesson.id));

        if (input.skipExisting && existing.length > 0) {
          skipped += 1;
          continue;
        }

        const prompt = `Create an educational illustration for the lesson "${lesson.title}"`;
        const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(`${lesson.id}-${prompt}`)}/900/500`;

        await ctx.db.insert(schema.illustrations).values({
          id: makeId(),
          lessonId: lesson.id,
          imageUrl,
          prompt,
          orderIndex: existing.length,
        });

        generated += 1;
      }

      return {
        success: true,
        total: lessons.length,
        generated,
        skipped,
      };
    }),
});
