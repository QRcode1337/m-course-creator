import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { db } from "../db";
import { schema } from "../db";

type DbType = typeof db;

export async function getCoursesTree(database: DbType, courseId?: string) {
  const courseRows = await database
    .select()
    .from(schema.courses)
    .where(courseId ? eq(schema.courses.id, courseId) : undefined)
    .orderBy(desc(schema.courses.createdAt));

  if (courseRows.length === 0) return [];

  const courseIds = courseRows.map((c) => c.id);
  const chapterRows = await database
    .select()
    .from(schema.chapters)
    .where(inArray(schema.chapters.courseId, courseIds))
    .orderBy(schema.chapters.orderIndex);

  const chapterIds = chapterRows.map((c) => c.id);
  const lessonRows = chapterIds.length
    ? await database
        .select()
        .from(schema.lessons)
        .where(inArray(schema.lessons.chapterId, chapterIds))
        .orderBy(schema.lessons.orderIndex)
    : [];

  const lessonIds = lessonRows.map((l) => l.id);
  const termCounts = lessonIds.length
    ? await database
        .select({
          lessonId: schema.glossaryTerms.lessonId,
          count: sql<number>`count(*)`,
        })
        .from(schema.glossaryTerms)
        .where(inArray(schema.glossaryTerms.lessonId, lessonIds))
        .groupBy(schema.glossaryTerms.lessonId)
    : [];

  const termCountMap = new Map(termCounts.map((row) => [row.lessonId, row.count]));

  const lessonsByChapter = new Map<string, Array<Record<string, unknown>>>();
  for (const lesson of lessonRows) {
    const list = lessonsByChapter.get(lesson.chapterId) || [];
    list.push({
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      lessonType: lesson.lessonType,
      completed: lesson.completed === 1,
      completedAt: lesson.completedAt,
      orderIndex: lesson.orderIndex,
      flashcardCount: termCountMap.get(lesson.id) ?? 0,
    });
    lessonsByChapter.set(lesson.chapterId, list);
  }

  const chaptersByCourse = new Map<string, Array<Record<string, unknown>>>();
  for (const chapter of chapterRows) {
    const list = chaptersByCourse.get(chapter.courseId) || [];
    list.push({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      orderIndex: chapter.orderIndex,
      lessons: lessonsByChapter.get(chapter.id) || [],
    });
    chaptersByCourse.set(chapter.courseId, list);
  }

  return courseRows.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    approach: course.approach,
    familiarityLevel: course.familiarityLevel,
    createdAt: course.createdAt,
    chapters: chaptersByCourse.get(course.id) || [],
  }));
}

export async function getLessonWithContext(database: DbType, lessonId: string) {
  const rows = await database
    .select({
      lessonId: schema.lessons.id,
      lessonTitle: schema.lessons.title,
      lessonContent: schema.lessons.content,
      lessonType: schema.lessons.lessonType,
      lessonCompleted: schema.lessons.completed,
      lessonCompletedAt: schema.lessons.completedAt,
      chapterId: schema.chapters.id,
      chapterTitle: schema.chapters.title,
      courseId: schema.courses.id,
      courseTitle: schema.courses.title,
    })
    .from(schema.lessons)
    .innerJoin(schema.chapters, eq(schema.lessons.chapterId, schema.chapters.id))
    .innerJoin(schema.courses, eq(schema.chapters.courseId, schema.courses.id))
    .where(eq(schema.lessons.id, lessonId));

  if (rows.length === 0) return null;

  const row = rows[0];
  const glossary = await database
    .select()
    .from(schema.glossaryTerms)
    .where(eq(schema.glossaryTerms.lessonId, lessonId));

  const media = await database
    .select()
    .from(schema.illustrations)
    .where(eq(schema.illustrations.lessonId, lessonId))
    .orderBy(schema.illustrations.orderIndex);

  return {
    id: row.lessonId,
    title: row.lessonTitle,
    content: row.lessonContent,
    lessonType: row.lessonType,
    completed: row.lessonCompleted === 1,
    completedAt: row.lessonCompletedAt,
    chapter: { id: row.chapterId, title: row.chapterTitle },
    course: { id: row.courseId, title: row.courseTitle },
    glossaryTerms: glossary,
    illustrations: media,
    relatedTopics: [],
  };
}
