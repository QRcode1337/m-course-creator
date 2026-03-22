import type { CourseComplexity } from "../types";

export function courseArchitecturePrompt(input: {
  topic: string;
  approach?: string;
  familiarityLevel?: string;
  requirements?: string;
  courseComplexity?: CourseComplexity;
}) {
  const complexity = input.courseComplexity === "advanced" ? "advanced" : "generic";
  const structureRule =
    complexity === "advanced"
      ? "5-7 chapters with 4-5 lessons per chapter."
      : "3-5 chapters with 3-4 lessons per chapter, target 10-12 lessons total.";

  return `STAGE 1
Generate only the course architecture for topic: ${input.topic}

Context:
- approach: ${input.approach || "balanced"}
- familiarity level: ${input.familiarityLevel || "new"}
- extra requirements: ${input.requirements || "none"}
- complexity mode: ${complexity}

Output JSON only. Do NOT write full lesson content.

Planning objective:
- Think holistically first: design chapter and lesson titles so the full sequence covers the breadth and depth of the topic.
- Ensure lesson progression is logically cumulative and collectively complete (no major conceptual gaps).
- Ensure architecture naturally supports meaningful related topics and cross-links.

Required fields:
- courseTitle
- audience
- prerequisites (array)
- learningOutcomes (array)
- chapters (array): each chapter has title and lessons
- dependencyMap (array): each item has fromLessonId, toLessonId, reason
- glossaryCandidates (array)
- finalProjectConcept
- courseComplexity

Lesson structure constraints:
- ${structureRule}
- lesson IDs must be stable strings like L1, L2, ...
- each lesson needs title, summary, dependsOn
- optimize logical progression and minimal redundancy
- avoid generic lesson titles; titles must be academically specific and content-bearing

Schema:
{
  "courseTitle": string,
  "audience": string,
  "prerequisites": [string],
  "learningOutcomes": [string],
  "chapters": [
    {
      "title": string,
      "lessons": [
        {
          "id": string,
          "title": string,
          "summary": string,
          "dependsOn": [string]
        }
      ]
    }
  ],
  "dependencyMap": [
    {
      "fromLessonId": string,
      "toLessonId": string,
      "reason": string
    }
  ],
  "glossaryCandidates": [string],
  "finalProjectConcept": string,
  "courseComplexity": "generic" | "advanced"
}`;
}
