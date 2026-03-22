import { eq } from "drizzle-orm";
import type { db } from "../db";
import { schema } from "../db";
import { getCoursesTree } from "./course-tree";
import { generateCoursePdf } from "./pdf";

type DbType = typeof db;

function toSafePdfFilename(title: string) {
  const safeTitle = title.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${safeTitle || "course"}.pdf`;
}

export async function buildCoursePdfExport(database: DbType, courseId: string) {
  const course = (await getCoursesTree(database, courseId))[0];
  if (!course) {
    return null;
  }

  const glossaryTerms = await database
    .select({
      term: schema.glossaryTerms.term,
      definition: schema.glossaryTerms.definition,
    })
    .from(schema.glossaryTerms)
    .innerJoin(schema.lessons, eq(schema.glossaryTerms.lessonId, schema.lessons.id))
    .innerJoin(schema.chapters, eq(schema.lessons.chapterId, schema.chapters.id))
    .where(eq(schema.chapters.courseId, courseId));

  const buffer = await generateCoursePdf({
    title: course.title,
    description: course.description ?? "",
    approach: course.approach ?? null,
    familiarityLevel: course.familiarityLevel ?? null,
    createdAt: course.createdAt,
    chapters: course.chapters.map((chapter: any) => ({
      title: chapter.title,
      description: chapter.description ?? "",
      lessons: (chapter.lessons ?? []).map((lesson: any) => ({
        title: lesson.title,
        content: lesson.content ?? "",
        lessonType: lesson.lessonType ?? null,
      })),
    })),
    glossaryTerms,
  });

  return {
    buffer,
    filename: toSafePdfFilename(course.title),
  };
}
