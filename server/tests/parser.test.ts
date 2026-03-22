import { parseCourseArchitectureJson, parseCourseJson, parseQuizJson } from "../ai/parser";

describe("AI JSON parsing", () => {
  it("parses valid course output", () => {
    const raw = JSON.stringify({
      title: "T",
      description: "D",
      chapters: [
        {
          title: "C1",
          description: "CD",
          lessons: [
            {
              title: "L1",
              lessonType: "concept",
              content: "# Hello",
              glossaryTerms: [{ term: "A", definition: "B" }],
              relatedTopics: [],
            },
          ],
        },
      ],
    });

    const parsed = parseCourseJson(raw);
    expect(parsed.chapters[0].lessons[0].title).toBe("L1");
  });

  it("normalizes quiz answers when correctAnswer is invalid", () => {
    const raw = JSON.stringify({
      questions: [
        {
          questionText: "Q",
          options: ["A", "B", "C", "D"],
          correctAnswer: "X",
          explanation: "E",
        },
      ],
    });

    const parsed = parseQuizJson(raw);
    expect(parsed.questions[0].correctAnswer).toBe("A");
  });

  it("parses valid stage-1 architecture output", () => {
    const raw = JSON.stringify({
      courseTitle: "Course A",
      audience: "Beginners",
      prerequisites: ["Curiosity"],
      learningOutcomes: ["Outcome 1", "Outcome 2", "Outcome 3"],
      chapters: [
        {
          title: "Chapter 1",
          lessons: [
            { id: "L1", title: "L1", summary: "S1", dependsOn: [] },
            { id: "L2", title: "L2", summary: "S2", dependsOn: ["L1"] },
            { id: "L3", title: "L3", summary: "S3", dependsOn: ["L2"] },
            { id: "L4", title: "L4", summary: "S4", dependsOn: ["L3"] },
          ],
        },
        {
          title: "Chapter 2",
          lessons: [
            { id: "L5", title: "L5", summary: "S5", dependsOn: ["L4"] },
            { id: "L6", title: "L6", summary: "S6", dependsOn: ["L5"] },
            { id: "L7", title: "L7", summary: "S7", dependsOn: ["L6"] },
          ],
        },
        {
          title: "Chapter 3",
          lessons: [
            { id: "L8", title: "L8", summary: "S8", dependsOn: ["L7"] },
            { id: "L9", title: "L9", summary: "S9", dependsOn: ["L8"] },
            { id: "L10", title: "L10", summary: "S10", dependsOn: ["L9"] },
          ],
        },
      ],
      dependencyMap: [{ fromLessonId: "L1", toLessonId: "L2", reason: "Progression" }],
      glossaryCandidates: ["a", "b", "c", "d", "e"],
      finalProjectConcept: "Build project",
      courseComplexity: "generic",
    });

    const parsed = parseCourseArchitectureJson(raw);
    expect(parsed.courseComplexity).toBe("generic");
    expect(parsed.chapters.length).toBe(3);
  });
});
