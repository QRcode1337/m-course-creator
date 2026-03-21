interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export function scoreQuiz(questions: Question[], answers: Record<string, string>) {
  const results: Record<
    string,
    { correct: boolean; userAnswer: string | null; correctAnswer: string; explanation: string }
  > = {};

  let correctCount = 0;
  for (const question of questions) {
    const userAnswer = answers[question.id] ?? null;
    const correct = userAnswer === question.correctAnswer;
    if (correct) correctCount += 1;

    results[question.id] = {
      correct,
      userAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  }

  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  return { score, results };
}
