import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createAIProvider } from "../../ai/factory";
import { schema } from "../../db";
import { getLessonWithContext } from "../../lib/course-tree";
import { getGlobalSettings } from "../../lib/settings";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const lessonsRouter = createTRPCRouter({
  getById: publicProcedure.input(z.object({ lessonId: z.string().min(1) })).query(async ({ ctx, input }) => {
    return getLessonWithContext(ctx.db, input.lessonId);
  }),

  toggleComplete: publicProcedure
    .input(z.object({ lessonId: z.string().min(1), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.lessons)
        .set({
          completed: input.completed ? 1 : 0,
          completedAt: input.completed ? Date.now() : null,
        })
        .where(eq(schema.lessons.id, input.lessonId));
      return { success: true };
    }),

  regenerate: publicProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await getLessonWithContext(ctx.db, input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const settings = await getGlobalSettings(ctx.db);
      const provider = createAIProvider(settings);
      const regen = await provider.regenerateLesson({
        courseTitle: lesson.course.title,
        lessonTitle: lesson.title,
        existingContent: lesson.content,
      });

      await ctx.db
        .update(schema.lessons)
        .set({ content: regen.content })
        .where(eq(schema.lessons.id, input.lessonId));

      return { success: true };
    }),

  chat: publicProcedure
    .input(
      z.object({
        lessonId: z.string().min(1),
        message: z.string().min(1),
        conversationHistory: z.array(z.object({ role: z.string(), content: z.string() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lesson = await getLessonWithContext(ctx.db, input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const settings = await getGlobalSettings(ctx.db);
      const provider = createAIProvider(settings);
      return provider.chat({
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
        message: input.message,
        conversationHistory: input.conversationHistory,
      });
    }),

  getCompleted: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: schema.lessons.id,
        title: schema.lessons.title,
        completed: schema.lessons.completed,
        completedAt: schema.lessons.completedAt,
        chapterTitle: schema.chapters.title,
        courseTitle: schema.courses.title,
      })
      .from(schema.lessons)
      .innerJoin(schema.chapters, eq(schema.lessons.chapterId, schema.chapters.id))
      .innerJoin(schema.courses, eq(schema.chapters.courseId, schema.courses.id))
      .where(and(eq(schema.lessons.completed, 1)))
      .orderBy(desc(schema.lessons.completedAt));

    return rows.map((row) => ({
      ...row,
      completed: row.completed === 1,
    }));
  }),
});
