import { applyArchitectureToGeneratedCourse, ensureLessonQuality, normalizeGeneratedCourse } from "../ai/course-quality";
import type { GeneratedCourse, GeneratedCourseArchitecture } from "../ai/types";

function wordCount(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

describe("course quality enforcement", () => {
  it("enforces lesson outline and minimum word count", () => {
    const content = ensureLessonQuality("Short intro paragraph.", "Lesson A", "Topic A", 600);

    expect(content).toContain("## Learning Objectives");
    expect(content).toContain("## Lecture Content");
    expect(content).toContain("## Examples");
    expect(content).toContain("## Exercises");
    expect(content).toContain("### Beginner");
    expect(content).toContain("### Intermediate");
    expect(content).toContain("### Advanced");
    expect(content).toContain("## Quiz and Answer Key");
    expect(content).toContain("## Misconceptions");
    expect(content).toContain("## Further Reading");
    expect(wordCount(content)).toBeGreaterThanOrEqual(600);
  });

  it("ensures multiple lessons in a generated course", () => {
    const base: GeneratedCourse = {
      title: "Single-Lesson Course",
      description: "D",
      chapters: [
        {
          title: "C1",
          description: "CD",
          lessons: [
            {
              title: "L1",
              lessonType: "concept",
              content: "Brief lesson.",
              glossaryTerms: [{ term: "A", definition: "B" }],
              relatedTopics: [],
            },
          ],
        },
      ],
    };

    const normalized = normalizeGeneratedCourse(base, "Topic A");
    const lessonCount = normalized.chapters.reduce((sum, c) => sum + c.lessons.length, 0);

    expect(lessonCount).toBeGreaterThanOrEqual(2);
    expect(wordCount(normalized.chapters[0].lessons[0].content)).toBeGreaterThanOrEqual(600);
  });

  it("maps generated content to architecture with chapter/lesson numbering", () => {
    const architecture: GeneratedCourseArchitecture = {
      courseTitle: "Architecture Test",
      audience: "Learners",
      prerequisites: ["Curiosity"],
      learningOutcomes: ["O1", "O2", "O3"],
      courseComplexity: "generic",
      chapters: [
        {
          title: "Foundations",
          lessons: [
            { id: "L1", title: "Intro", summary: "S1", dependsOn: [] },
            { id: "L2", title: "Deep Dive", summary: "S2", dependsOn: ["L1"] },
            { id: "L3", title: "Practice", summary: "S3", dependsOn: ["L2"] },
          ],
        },
        {
          title: "Applications",
          lessons: [
            { id: "L4", title: "App A", summary: "S4", dependsOn: ["L3"] },
            { id: "L5", title: "App B", summary: "S5", dependsOn: ["L4"] },
            { id: "L6", title: "App C", summary: "S6", dependsOn: ["L5"] },
          ],
        },
        {
          title: "Capstone",
          lessons: [
            { id: "L7", title: "Build", summary: "S7", dependsOn: ["L6"] },
            { id: "L8", title: "Test", summary: "S8", dependsOn: ["L7"] },
            { id: "L9", title: "Ship", summary: "S9", dependsOn: ["L8"] },
          ],
        },
      ],
      dependencyMap: [],
      glossaryCandidates: ["a", "b", "c", "d", "e"],
      finalProjectConcept: "Build project",
    };

    const generated: GeneratedCourse = {
      title: "X",
      description: "Y",
      chapters: [
        {
          title: "Whatever",
          description: "D",
          lessons: [
            {
              title: "Loose lesson title",
              lessonType: "concept",
              content: "Short content",
              glossaryTerms: [],
              relatedTopics: [],
            },
          ],
        },
      ],
    };

    const mapped = applyArchitectureToGeneratedCourse("Topic A", architecture, generated);
    expect(mapped.chapters[0].title).toBe("Chapter 1: Foundations");
    expect(mapped.chapters[0].lessons[0].title).toBe("Lesson 1.1: Loose lesson title");
    expect(mapped.chapters[1].lessons[0].title).toBe("Lesson 2.1: App A");
    expect(wordCount(mapped.chapters[2].lessons[2].content)).toBeGreaterThanOrEqual(600);
  });
});
