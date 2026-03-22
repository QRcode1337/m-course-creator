import { z } from "zod";
import type { GeneratedCourse, GeneratedCourseArchitecture, GeneratedQuiz } from "./types";

const glossarySchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});

const relatedSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
});

const lessonSchema = z.object({
  title: z.string().min(1),
  lessonType: z.string().optional().default("concept"),
  content: z.string().min(1),
  glossaryTerms: z.array(glossarySchema).min(1).max(8),
  relatedTopics: z.array(relatedSchema).max(8).default([]),
});

const chapterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  lessons: z.array(lessonSchema).min(1).max(8),
});

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  chapters: z.array(chapterSchema).min(1).max(8),
});

const quizQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(10),
});

const architectureLessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  dependsOn: z.array(z.string().min(1)).default([]),
});

const architectureChapterSchema = z.object({
  title: z.string().min(1),
  lessons: z.array(architectureLessonSchema).min(1),
});

const architectureSchema = z
  .object({
    courseTitle: z.string().min(1),
    audience: z.string().min(1),
    prerequisites: z.array(z.string().min(1)).min(1).max(12),
    learningOutcomes: z.array(z.string().min(1)).min(3).max(12),
    chapters: z.array(architectureChapterSchema).min(1),
    dependencyMap: z
      .array(
        z.object({
          fromLessonId: z.string().min(1),
          toLessonId: z.string().min(1),
          reason: z.string().min(1),
        }),
      )
      .default([]),
    glossaryCandidates: z.array(z.string().min(1)).min(5).max(40),
    finalProjectConcept: z.string().min(1),
    courseComplexity: z.enum(["generic", "advanced"]).default("generic"),
  })
  .superRefine((value, ctx) => {
    const chapterCount = value.chapters.length;
    const lessonCounts = value.chapters.map((c) => c.lessons.length);

    if (value.courseComplexity === "generic") {
      if (chapterCount < 3 || chapterCount > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Generic course must have 3-5 chapters.",
        });
      }
      if (lessonCounts.some((count) => count < 3 || count > 4)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Generic course chapters must have 3-4 lessons each.",
        });
      }
    } else {
      if (chapterCount < 5 || chapterCount > 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Advanced course must have 5-7 chapters.",
        });
      }
      if (lessonCounts.some((count) => count < 4 || count > 5)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Advanced course chapters must have 4-5 lessons each.",
        });
      }
    }

    const lessonIds = new Set(value.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id)));
    for (const chapter of value.chapters) {
      for (const lesson of chapter.lessons) {
        for (const dependency of lesson.dependsOn) {
          if (!lessonIds.has(dependency)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Unknown dependency id: ${dependency}`,
            });
          }
        }
      }
    }

    for (const edge of value.dependencyMap) {
      if (!lessonIds.has(edge.fromLessonId) || !lessonIds.has(edge.toLessonId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "dependencyMap contains unknown lesson IDs.",
        });
      }
    }
  });

function stripCodeFences(raw: string) {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function parseCourseJson(raw: string): GeneratedCourse {
  const parsed = JSON.parse(stripCodeFences(raw));
  return courseSchema.parse(parsed);
}

export function parseQuizJson(raw: string): GeneratedQuiz {
  const parsed = JSON.parse(stripCodeFences(raw));
  const quiz = quizSchema.parse(parsed);

  return {
    questions: quiz.questions.map((q) => ({
      ...q,
      correctAnswer: q.options.includes(q.correctAnswer) ? q.correctAnswer : q.options[0],
    })),
  };
}

export function parseCourseArchitectureJson(raw: string): GeneratedCourseArchitecture {
  const parsed = JSON.parse(stripCodeFences(raw));
  return architectureSchema.parse(parsed);
}
