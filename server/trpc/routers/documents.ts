import fs from "node:fs";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createAIProvider } from "../../ai/factory";
import { schema } from "../../db";
import { makeId } from "../../lib/id";
import { getGlobalSettings } from "../../lib/settings";
import { createTRPCRouter, publicProcedure } from "../trpc";

function inferTopicFromDocuments(documents: Array<{ title: string | null; fileName: string }>) {
  const preferred = documents.find((doc) => doc.title)?.title || documents[0]?.fileName || "Imported course";
  return preferred.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function buildSourceRequirements(documents: Array<{ fileName: string; extractedContent: string | null }>) {
  return documents
    .map((doc) => `Source document: ${doc.fileName}\n${doc.extractedContent || ""}`)
    .join("\n\n---\n\n")
    .slice(0, 30000);
}

export const documentsRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.importedDocuments)
      .orderBy(desc(schema.importedDocuments.createdAt));
  }),

  delete: publicProcedure
    .input(z.object({ documentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(schema.importedDocuments)
        .where(eq(schema.importedDocuments.id, input.documentId));

      const document = rows[0];
      if (!document) {
        throw new Error("Document not found.");
      }

      if (fs.existsSync(document.storedPath)) {
        fs.unlinkSync(document.storedPath);
      }

      await ctx.db.delete(schema.importedDocuments).where(eq(schema.importedDocuments.id, input.documentId));
      return { success: true };
    }),

  generateCourse: publicProcedure
    .input(
      z.object({
        documentIds: z.array(z.string().min(1)).min(1),
        approach: z.enum(["balanced", "rigorous", "easy"]).default("balanced"),
        courseLength: z.enum(["short", "medium", "comprehensive"]).default("medium"),
        lessonsPerChapter: z.enum(["few", "moderate", "many"]).default("moderate"),
        contentDepth: z.enum(["introductory", "intermediate", "advanced"]).default("intermediate"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const documents = await ctx.db
        .select()
        .from(schema.importedDocuments)
        .where(inArray(schema.importedDocuments.id, input.documentIds));

      if (documents.length !== input.documentIds.length) {
        throw new Error("One or more documents could not be found.");
      }

      const invalidDocument = documents.find((doc) => doc.status !== "ready" || !doc.extractedContent);
      if (invalidDocument) {
        throw new Error(`Document "${invalidDocument.fileName}" is not ready for course generation.`);
      }

      const settings = await getGlobalSettings(ctx.db);
      const provider = createAIProvider(settings);
      const topic = inferTopicFromDocuments(documents);
      const requirements = [
        `Build the course from the imported source material below.`,
        `Preserve the source's terminology, scope, and major themes where appropriate.`,
        `Preferred course length: ${input.courseLength}`,
        `Lessons per chapter preference: ${input.lessonsPerChapter}`,
        buildSourceRequirements(documents),
      ].join("\n\n");

      const generated = await provider.generateCourse({
        topic,
        approach: input.approach,
        familiarityLevel: input.contentDepth,
        requirements,
        courseComplexity: input.contentDepth === "advanced" ? "advanced" : "generic",
      });

      const courseId = makeId();
      const now = Date.now();

      ctx.db.transaction((tx) => {
        tx.insert(schema.courses).values({
          id: courseId,
          title: generated.title,
          description: generated.description,
          approach: input.approach,
          familiarityLevel: input.contentDepth,
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

        for (const document of documents) {
          tx.update(schema.importedDocuments)
            .set({ courseId, updatedAt: Date.now() })
            .where(eq(schema.importedDocuments.id, document.id))
            .run();
        }
      });

      return { courseId };
    }),
});
