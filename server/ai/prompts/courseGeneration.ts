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
- lesson content in markdown with headings and bullet points
- glossaryTerms: 2-5 per lesson
- relatedTopics: 2-4 per lesson
`;
}
