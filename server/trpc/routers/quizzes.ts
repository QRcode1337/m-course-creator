import { eq } from "drizzle-orm";
import { z } from "zod";
import { createAIProvider } from "../../ai/factory";
import { schema } from "../../db";
import { getLessonWithContext } from "../../lib/course-tree";
import { makeId } from "../../lib/id";
import { scoreQuiz } from "../../lib/quiz";
import { getGlobalSettings } from "../../lib/settings";
import { createTRPCRouter, publicProcedure } from "../trpc";

async function fetchQuizWithQuestions(db: any, lessonId: string) {
  const quiz = await db.query.quizzes.findFirst({ where: eq(schema.quizzes.lessonId, lessonId) });
  if (!quiz) return { quiz: null, questions: [] as any[] };

  const questions = await db
    .select()
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.quizId, quiz.id))
    .orderBy(schema.quizQuestions.orderIndex);

  return {
    quiz,
    questions: questions.map((q: any) => ({
      id: q.id,
      questionText: q.questionText,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
  };
}

export const quizzesRouter = createTRPCRouter({
  getByLessonId: publicProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .query(async ({ ctx, input }) => fetchQuizWithQuestions(ctx.db, input.lessonId)),

  generate: publicProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const lesson = await getLessonWithContext(ctx.db, input.lessonId);
      if (!lesson) throw new Error("Lesson not found");

      const settings = await getGlobalSettings(ctx.db);
      const provider = createAIProvider(settings);
      const generated = await provider.generateQuiz({
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
      });

      const now = Date.now();
      const quizId = makeId();

      ctx.db.transaction((tx) => {
        const existing = tx
          .select({ id: schema.quizzes.id })
          .from(schema.quizzes)
          .where(eq(schema.quizzes.lessonId, input.lessonId))
          .get();
        if (existing) {
          tx.delete(schema.quizQuestions).where(eq(schema.quizQuestions.quizId, existing.id)).run();
          tx.delete(schema.quizzes).where(eq(schema.quizzes.id, existing.id)).run();
        }

        tx.insert(schema.quizzes).values({
          id: quizId,
          lessonId: input.lessonId,
          createdAt: now,
        }).run();

        for (let i = 0; i < generated.questions.length; i += 1) {
          const q = generated.questions[i];
          tx.insert(schema.quizQuestions).values({
            id: makeId(),
            quizId,
            questionText: q.questionText,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            orderIndex: i,
          }).run();
        }
      });

      return { quizId };
    }),

  submit: publicProcedure
    .input(z.object({ quizId: z.string().min(1), answers: z.record(z.string(), z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const questions = await ctx.db
        .select()
        .from(schema.quizQuestions)
        .where(eq(schema.quizQuestions.quizId, input.quizId))
        .orderBy(schema.quizQuestions.orderIndex);

      const normalized = questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: JSON.parse(q.options) as string[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));

      return scoreQuiz(normalized, input.answers);
    }),
});
