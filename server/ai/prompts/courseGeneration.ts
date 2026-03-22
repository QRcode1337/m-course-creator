export function courseGenerationPrompt(input: {
  topic: string;
  approach?: string;
  familiarityLevel?: string;
  requirements?: string;
}) {
  return `You are a course designer. Return ONLY valid JSON. No markdown, no prose.

Topic: ${input.topic}
Approach: ${input.approach || "balanced"}
Familiarity: ${input.familiarityLevel || "new"}
Requirements: ${input.requirements || "none"}

Schema:
{
  "title": string,
  "description": string,
  "chapters": [
    {
      "title": string,
      "description": string,
      "lessons": [
        {
          "title": string,
          "lessonType": string,
          "content": string,
          "glossaryTerms": [{ "term": string, "definition": string }],
          "relatedTopics": [{ "title": string, "description": string }]
        }
      ]
    }
  ]
}

Constraints:
- 3-5 chapters
- 2-4 lessons per chapter
- at least 2 lessons total in the course
- each lesson content must be markdown and follow this exact section outline:
  1) ## Learning Objectives
  2) ## Core Lesson Content
  3) ## Key Terms
  4) ## Concrete Examples
  5) ## Reflection and Synthesis Questions
  6) ## Quiz and Answer Key
  7) ## Misconceptions
  8) ## Further Reading
- learning objectives must be measurable and achievable
- each lesson must be at least 700 words of real explanatory content
- no placeholder examples; concrete examples must contain actual information
- glossaryTerms: 2-5 per lesson
- relatedTopics: 2-4 per lesson
`;
}
