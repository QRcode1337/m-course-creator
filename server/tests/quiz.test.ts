import { scoreQuiz } from "../lib/quiz";

describe("quiz scoring", () => {
  it("scores answers and returns per-question results", () => {
    const questions = [
      {
        id: "q1",
        questionText: "One",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "because",
      },
      {
        id: "q2",
        questionText: "Two",
        options: ["A", "B", "C", "D"],
        correctAnswer: "B",
        explanation: "because",
      },
    ];

    const result = scoreQuiz(questions, { q1: "A", q2: "C" });

    expect(result.score).toBe(50);
    expect(result.results.q1.correct).toBe(true);
    expect(result.results.q2.correct).toBe(false);
    expect(result.results.q2.correctAnswer).toBe("B");
  });
});
