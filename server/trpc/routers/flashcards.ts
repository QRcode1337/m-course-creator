import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { schema } from "../../db";
import { makeId } from "../../lib/id";
import { applySm2, type FlashcardRating } from "../../lib/sm2";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const flashcardsRouter = createTRPCRouter({
  initializeFromCourse: publicProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const terms = await ctx.db
        .select({ id: schema.glossaryTerms.id })
        .from(schema.glossaryTerms)
        .innerJoin(schema.lessons, eq(schema.glossaryTerms.lessonId, schema.lessons.id))
        .innerJoin(schema.chapters, eq(schema.lessons.chapterId, schema.chapters.id))
        .where(eq(schema.chapters.courseId, input.courseId));

      const now = Date.now();
      let initialized = 0;
      for (const term of terms) {
        const existing = await ctx.db.query.flashcardReviews.findFirst({
          where: eq(schema.flashcardReviews.glossaryTermId, term.id),
        });
        if (!existing) {
          await ctx.db.insert(schema.flashcardReviews).values({
            id: makeId(),
            glossaryTermId: term.id,
            nextReviewDate: now,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lastReviewedAt: null,
          });
          initialized += 1;
        }
      }

      return { success: true, initialized };
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        termId: schema.glossaryTerms.id,
        term: schema.glossaryTerms.term,
        definition: schema.glossaryTerms.definition,
        lessonId: schema.lessons.id,
        lessonTitle: schema.lessons.title,
        courseId: schema.courses.id,
        courseTitle: schema.courses.title,
        reviewId: schema.flashcardReviews.id,
        nextReviewDate: schema.flashcardReviews.nextReviewDate,
        interval: schema.flashcardReviews.interval,
        easeFactor: schema.flashcardReviews.easeFactor,
        repetitions: schema.flashcardReviews.repetitions,
      })
      .from(schema.glossaryTerms)
      .innerJoin(schema.lessons, eq(schema.glossaryTerms.lessonId, schema.lessons.id))
      .innerJoin(schema.chapters, eq(schema.lessons.chapterId, schema.chapters.id))
      .innerJoin(schema.courses, eq(schema.chapters.courseId, schema.courses.id))
      .leftJoin(schema.flashcardReviews, eq(schema.glossaryTerms.id, schema.flashcardReviews.glossaryTermId));

    return rows.map((row) => ({
      id: row.termId,
      term: row.term,
      definition: row.definition,
      lesson: { id: row.lessonId, title: row.lessonTitle },
      course: { id: row.courseId, title: row.courseTitle },
      review: row.reviewId
        ? {
            id: row.reviewId,
            nextReviewDate: row.nextReviewDate,
            interval: row.interval,
            easeFactor: row.easeFactor,
            repetitions: row.repetitions,
          }
        : null,
    }));
  }),

  getDue: publicProcedure.query(async ({ ctx }) => {
    const now = Date.now();
    const rows = await ctx.db
      .select({
        termId: schema.glossaryTerms.id,
        term: schema.glossaryTerms.term,
        definition: schema.glossaryTerms.definition,
        lessonId: schema.lessons.id,
        lessonTitle: schema.lessons.title,
        courseId: schema.courses.id,
        courseTitle: schema.courses.title,
        reviewId: schema.flashcardReviews.id,
        nextReviewDate: schema.flashcardReviews.nextReviewDate,
        interval: schema.flashcardReviews.interval,
        easeFactor: schema.flashcardReviews.easeFactor,
        repetitions: schema.flashcardReviews.repetitions,
      })
      .from(schema.glossaryTerms)
      .innerJoin(schema.lessons, eq(schema.glossaryTerms.lessonId, schema.lessons.id))
      .innerJoin(schema.chapters, eq(schema.lessons.chapterId, schema.chapters.id))
      .innerJoin(schema.courses, eq(schema.chapters.courseId, schema.courses.id))
      .leftJoin(schema.flashcardReviews, eq(schema.glossaryTerms.id, schema.flashcardReviews.glossaryTermId));

    const due = rows
      .filter((row) => !row.reviewId || (row.nextReviewDate ?? 0) <= now)
      .sort((a, b) => (a.nextReviewDate ?? 0) - (b.nextReviewDate ?? 0));

    return due.map((row) => ({
      term: {
        id: row.termId,
        term: row.term,
        definition: row.definition,
        lessonId: row.lessonId,
        lessonTitle: row.lessonTitle,
      },
      course: { id: row.courseId, title: row.courseTitle },
      review: {
        id: row.reviewId,
        nextReviewDate: row.nextReviewDate ?? 0,
        interval: row.interval ?? 0,
        easeFactor: row.easeFactor ?? 2.5,
        repetitions: row.repetitions ?? 0,
      },
    }));
  }),

  getStats: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        termId: schema.glossaryTerms.id,
        reviewId: schema.flashcardReviews.id,
        nextReviewDate: schema.flashcardReviews.nextReviewDate,
        repetitions: schema.flashcardReviews.repetitions,
      })
      .from(schema.glossaryTerms)
      .leftJoin(schema.flashcardReviews, eq(schema.glossaryTerms.id, schema.flashcardReviews.glossaryTermId));

    const now = Date.now();
    const total = rows.length;
    const due = rows.filter((row) => !row.reviewId || (row.nextReviewDate ?? 0) <= now).length;
    const mastered = rows.filter((row) => (row.repetitions ?? 0) >= 5).length;
    const learning = total - mastered;

    return { total, due, learning, mastered };
  }),

  rate: publicProcedure
    .input(z.object({ glossaryTermId: z.string().min(1), rating: z.enum(["again", "hard", "good", "easy"]) }))
    .mutation(async ({ ctx, input }) => {
      let review = await ctx.db.query.flashcardReviews.findFirst({
        where: eq(schema.flashcardReviews.glossaryTermId, input.glossaryTermId),
      });

      if (!review) {
        const id = makeId();
        await ctx.db.insert(schema.flashcardReviews).values({
          id,
          glossaryTermId: input.glossaryTermId,
          nextReviewDate: Date.now(),
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lastReviewedAt: null,
        });
        review = await ctx.db.query.flashcardReviews.findFirst({
          where: eq(schema.flashcardReviews.id, id),
        });
      }

      if (!review) throw new Error("Failed to initialize review");

      const next = applySm2(
        {
          interval: review.interval,
          easeFactor: review.easeFactor,
          repetitions: review.repetitions,
        },
        input.rating as FlashcardRating,
      );

      await ctx.db
        .update(schema.flashcardReviews)
        .set({
          interval: next.interval,
          easeFactor: next.easeFactor,
          repetitions: next.repetitions,
          nextReviewDate: next.nextReviewDate,
          lastReviewedAt: Date.now(),
        })
        .where(eq(schema.flashcardReviews.id, review.id));

      return { success: true, review: next };
    }),
});
