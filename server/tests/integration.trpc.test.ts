import { createTestDb } from "../db";
import { schema } from "../db";
import { makeId } from "../lib/id";
import { appRouter } from "../trpc/router";

function makeCaller() {
  const { db, sqlite } = createTestDb(":memory:");
  const caller = appRouter.createCaller({ db } as any);
  return { caller, sqlite, db };
}

describe("tRPC integration", () => {
  it("supports unsaved course preview generation", async () => {
    const { caller, sqlite } = makeCaller();

    const result = await caller.courses.preview({
      topic: "Graph Theory",
      approach: "balanced",
      familiarityLevel: "introductory",
      assessmentAnswers: [{ question: "Goal", answer: "Understand the basics" }],
    });

    expect(result.preview.title).toBeTruthy();
    expect(result.preview.chapters.length).toBeGreaterThan(0);
    expect(result.architecture.chapters.length).toBeGreaterThan(0);

    const storedCourses = await caller.courses.list();
    expect(storedCourses).toHaveLength(0);

    sqlite.close();
  });

  it("supports core learning loop mutations and queries", async () => {
    const { caller, sqlite } = makeCaller();

    const generated = await caller.courses.generate({
      topic: "Distributed Systems",
      approach: "balanced",
      familiarityLevel: "new",
      assessmentAnswers: [{ question: "Goal", answer: "Interview prep" }],
    });
    expect(generated.courseId).toBeTruthy();

    const course = await caller.courses.getById({ courseId: generated.courseId });
    expect(course?.chapters.length).toBeGreaterThan(0);

    const lessonId = (course?.chapters[0] as any).lessons[0].id as string;
    await caller.lessons.toggleComplete({ lessonId, completed: true });

    const completed = await caller.lessons.getCompleted();
    expect(completed.length).toBeGreaterThan(0);

    await caller.flashcards.initializeFromCourse({ courseId: generated.courseId });
    const due = await caller.flashcards.getDue();
    expect(due.length).toBeGreaterThan(0);

    const rated = await caller.flashcards.rate({ glossaryTermId: due[0].term.id, rating: "good" });
    expect(rated.review.repetitions).toBeGreaterThan(0);

    await caller.quizzes.generate({ lessonId });
    const quizData = await caller.quizzes.getByLessonId({ lessonId });
    expect(quizData.quiz).toBeTruthy();
    expect(quizData.questions.length).toBeGreaterThan(0);

    const answers: Record<string, string> = {};
    for (const q of quizData.questions) {
      answers[q.id] = q.correctAnswer;
    }

    const result = await caller.quizzes.submit({ quizId: quizData.quiz!.id, answers });
    expect(result.score).toBe(100);

    sqlite.close();
  });

  it("supports imported-document generation and lesson notes", async () => {
    const { caller, sqlite, db } = makeCaller();
    const now = Date.now();
    const documentId = makeId();

    db.insert(schema.importedDocuments).values({
      id: documentId,
      fileName: "graph-theory-notes.txt",
      fileType: "txt",
      storedPath: "/tmp/graph-theory-notes.txt",
      fileSize: 256,
      status: "ready",
      extractedContent: "Graph theory studies nodes, edges, paths, trees, and graph traversal algorithms.",
      wordCount: 12,
      title: "Graph Theory Notes",
      errorMessage: null,
      courseId: null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const generated = await caller.documents.generateCourse({
      documentIds: [documentId],
      approach: "balanced",
      courseLength: "short",
      lessonsPerChapter: "few",
      contentDepth: "introductory",
    });

    const course = await caller.courses.getById({ courseId: generated.courseId });
    expect(course?.chapters.length).toBeGreaterThan(0);

    const lessonId = (course?.chapters[0] as any).lessons[0].id as string;
    await caller.notes.save({ lessonId, content: "Remember Euler paths and spanning trees." });

    const note = await caller.notes.getByLessonId({ lessonId });
    expect(note?.content).toContain("Euler paths");

    sqlite.close();
  });

  it("supports lesson media generation, reorder, delete, and course batch generation", async () => {
    const { caller, sqlite } = makeCaller();

    const generated = await caller.courses.generate({
      topic: "Algorithms",
      approach: "balanced",
      familiarityLevel: "introductory",
      assessmentAnswers: [{ question: "Goal", answer: "Build intuition" }],
    });

    const course = await caller.courses.getById({ courseId: generated.courseId });
    const firstLessonId = (course?.chapters[0] as any).lessons[0].id as string;

    await caller.media.generate({ lessonId: firstLessonId, prompt: "Algorithm flow diagram" });
    await caller.media.generate({ lessonId: firstLessonId, prompt: "Sorting illustration" });

    const illustrations = await caller.media.getByLesson({ lessonId: firstLessonId });
    expect(illustrations).toHaveLength(2);

    await caller.media.reorder({
      lessonId: firstLessonId,
      orderedIds: [illustrations[1].id, illustrations[0].id],
    });

    const reordered = await caller.media.getByLesson({ lessonId: firstLessonId });
    expect(reordered[0].id).toBe(illustrations[1].id);

    await caller.media.delete({ illustrationId: reordered[0].id });
    const remaining = await caller.media.getByLesson({ lessonId: firstLessonId });
    expect(remaining).toHaveLength(1);

    const batch = await caller.media.generateAllForCourse({
      courseId: generated.courseId,
      skipExisting: true,
    });
    expect(batch.total).toBeGreaterThan(0);
    expect(batch.generated + batch.skipped).toBe(batch.total);

    sqlite.close();
  });
});
