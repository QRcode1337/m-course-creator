import { parseCourseJson, parseQuizJson } from "../ai/parser";

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
});
