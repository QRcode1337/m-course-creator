export function quizGenerationPrompt(input: { lessonTitle: string; lessonContent: string }) {
  return `Generate a quiz for this lesson. Return ONLY JSON.

Lesson title: ${input.lessonTitle}
Lesson content:
${input.lessonContent.slice(0, 5000)}

Schema:
{
  "questions": [
    {
      "questionText": string,
      "options": [string, string, string, string],
      "correctAnswer": string,
      "explanation": string
    }
  ]
}

Constraints:
- 5 questions
- exactly 4 options each
- correctAnswer must match one option exactly
`;
}
