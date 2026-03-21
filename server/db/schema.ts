import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  preferredProvider: text("preferred_provider").notNull().default("openai"),
  openaiApiKey: text("openai_api_key"),
  openaiModel: text("openai_model").notNull().default("gpt-4o-mini"),
  updatedAt: integer("updated_at").notNull(),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  approach: text("approach"),
  familiarityLevel: text("familiarity_level"),
  createdAt: integer("created_at").notNull(),
});

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  orderIndex: integer("order_index").notNull(),
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  lessonType: text("lesson_type"),
  completed: integer("completed").notNull().default(0),
  completedAt: integer("completed_at"),
  orderIndex: integer("order_index").notNull(),
});

export const glossaryTerms = sqliteTable("glossary_terms", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  definition: text("definition").notNull(),
});

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
});

export const quizQuestions = sqliteTable("quiz_questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: text("options").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull().default(""),
  orderIndex: integer("order_index").notNull(),
});

export const flashcardReviews = sqliteTable("flashcard_reviews", {
  id: text("id").primaryKey(),
  glossaryTermId: text("glossary_term_id").notNull().references(() => glossaryTerms.id, { onDelete: "cascade" }),
  nextReviewDate: integer("next_review_date").notNull(),
  interval: real("interval").notNull().default(0),
  easeFactor: real("ease_factor").notNull().default(2.5),
  repetitions: integer("repetitions").notNull().default(0),
  lastReviewedAt: integer("last_reviewed_at"),
});

export const illustrations = sqliteTable("illustrations", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  prompt: text("prompt").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});
