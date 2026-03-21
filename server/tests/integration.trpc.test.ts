import { createTestDb } from "../db";
import { appRouter } from "../trpc/router";

function makeCaller() {
  const { db, sqlite } = createTestDb(":memory:");
  const caller = appRouter.createCaller({ db } as any);
  return { caller, sqlite };
}

describe("tRPC integration", () => {
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
});
