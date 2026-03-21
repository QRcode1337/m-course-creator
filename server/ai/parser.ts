import { z } from "zod";
import type { GeneratedCourse, GeneratedQuiz } from "./types";

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
