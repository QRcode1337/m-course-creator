import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createAIProvider } from "../../ai/factory";
import { schema } from "../../db";
import { getCoursesTree } from "../../lib/course-tree";
import { makeId } from "../../lib/id";
import { getGlobalSettings } from "../../lib/settings";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const coursesRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return getCoursesTree(ctx.db);
  }),

  getById: publicProcedure.input(z.object({ courseId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const courses = await getCoursesTree(ctx.db, input.courseId);
    return courses[0] ?? null;
  }),

  generate: publicProcedure
    .input(
      z.object({
        topic: z.string().min(2),
        approach: z.string().optional(),
        familiarityLevel: z.string().optional(),
        assessmentAnswers: z
          .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await getGlobalSettings(ctx.db);
      const provider = createAIProvider(settings);

      const requirements = (input.assessmentAnswers || [])
        .map((a) => `${a.question}: ${a.answer}`)
        .join("\n");

      const generated = await provider.generateCourse({
        topic: input.topic,
        approach: input.approach,
        familiarityLevel: input.familiarityLevel,
        requirements,
      });

      const courseId = makeId();
      const now = Date.now();

      ctx.db.transaction((tx) => {
        tx.insert(schema.courses).values({
          id: courseId,
          title: generated.title,
          description: generated.description,
          approach: input.approach ?? null,
          familiarityLevel: input.familiarityLevel ?? null,
          createdAt: now,
        }).run();

        for (let ci = 0; ci < generated.chapters.length; ci += 1) {
          const chapter = generated.chapters[ci];
          const chapterId = makeId();

          tx.insert(schema.chapters).values({
            id: chapterId,
            courseId,
            title: chapter.title,
            description: chapter.description,
            orderIndex: ci,
          }).run();

          for (let li = 0; li < chapter.lessons.length; li += 1) {
            const lesson = chapter.lessons[li];
            const lessonId = makeId();

            tx.insert(schema.lessons).values({
              id: lessonId,
              chapterId,
              title: lesson.title,
              content: lesson.content,
              lessonType: lesson.lessonType ?? "concept",
              completed: 0,
              orderIndex: li,
            }).run();

            for (const term of lesson.glossaryTerms) {
              tx.insert(schema.glossaryTerms).values({
                id: makeId(),
                lessonId,
                term: term.term,
                definition: term.definition,
              }).run();
            }
          }
        }
      });

      return { courseId };
    }),

  delete: publicProcedure.input(z.object({ courseId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(schema.courses).where(eq(schema.courses.id, input.courseId));
    return { success: true };
  }),

  exportPdf: publicProcedure.input(z.object({ courseId: z.string().min(1) })).mutation(() => {
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "PDF export is planned for post-MVP.",
    });
  }),
});
