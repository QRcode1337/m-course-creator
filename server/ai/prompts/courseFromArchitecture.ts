import type { GeneratedCourseArchitecture } from "../types";

export function courseFromArchitecturePrompt(input: {
  topic: string;
  architecture: GeneratedCourseArchitecture;
}) {
  return `STAGE 2
Using the approved course architecture below, write the full course.

Architecture JSON:
${JSON.stringify(input.architecture, null, 2)}

Return JSON only.

For each lesson include these markdown sections:
- ## Learning Objectives
- ## Core Lesson Content
- ## Key Terms
- ## Concrete Examples
- ## Reflection and Synthesis Questions
- ## Quiz and Answer Key
- ## Misconceptions
- ## Further Reading

Requirements:
- Learning objectives must be measurable, realistic, and actually achievable within the lesson scope.
- Keep each lesson substantial, academically accurate, and cumulative.
- Minimum 700 words per lesson.
- Preserve logical dependency order from the architecture.
- Keep chapter and lesson titles aligned with the architecture.
- Core Lesson Content must contain real explanatory content, not a thin outline.
- Concrete Examples must include specific, factual examples (no placeholders, no vague "example goes here" patterns).
- Reflection and Synthesis Questions should replace long drill sets and focus on transfer, critique, and integration.
- Further Reading should include high-quality references (texts, papers, standards, or primary sources where relevant).

Output schema:
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
}`;
}
