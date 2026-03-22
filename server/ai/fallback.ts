import { ensureLessonQuality } from "./course-quality";
import type {
  CourseComplexity,
  GeneratedCourse,
  GeneratedCourseArchitecture,
  GeneratedQuiz,
} from "./types";

function lessonCountsForComplexity(complexity: CourseComplexity) {
  if (complexity === "advanced") return [4, 4, 4, 4, 4];
  return [4, 4, 4];
}

function genericLessonTitleTemplates(topic: string) {
  return [
    [
      `Introduction to ${topic}`,
      `Core Concepts of ${topic}`,
      `${topic} Terminology and Mental Models`,
      `Baseline Practices in ${topic}`,
    ],
    [
      `${topic} Systems and Interdependencies`,
      `Applied Methods in ${topic}`,
      `Common Patterns and Use Cases in ${topic}`,
      `Case Study: ${topic} in Practice`,
    ],
    [
      `Implementation Techniques for ${topic}`,
      `Integrating ${topic} into Real Workflows`,
      `Pitfalls, Risks, and Responsible Practice in ${topic}`,
      `Capstone Planning and Future Directions for ${topic}`,
    ],
  ];
}

function advancedLessonTitleTemplates(topic: string) {
  return [
    [
      `Advanced Foundations of ${topic}`,
      `Formal Models in ${topic}`,
      `Analytical Frameworks for ${topic}`,
      `Measurement and Evaluation in ${topic}`,
    ],
    [
      `${topic} Architecture and Design Decisions`,
      `Optimization Strategies in ${topic}`,
      `Tradeoff Analysis for ${topic}`,
      `Reliability and Robustness in ${topic}`,
    ],
    [
      `${topic} Integration Patterns`,
      `Complex Scenario Planning in ${topic}`,
      `Scaling ${topic} Workflows`,
      `Operational Governance for ${topic}`,
    ],
    [
      `Advanced Case Studies in ${topic}`,
      `Failure Analysis in ${topic}`,
      `Iterative Improvement Loops in ${topic}`,
      `High-Impact Applications of ${topic}`,
    ],
    [
      `${topic} Capstone Scoping`,
      `Capstone Implementation for ${topic}`,
      `Capstone Validation and Review`,
      `${topic} Frontier Research and Next Steps`,
    ],
  ];
}

export function fallbackCourseArchitecture(
  topic: string,
  complexity: CourseComplexity = "generic",
): GeneratedCourseArchitecture {
  const lessonCounts = lessonCountsForComplexity(complexity);
  const chapterThemes = [
    `Foundations of ${topic}`,
    `${topic} in Practice`,
    `Integration and Application of ${topic}`,
    `Advanced Patterns in ${topic}`,
    `${topic} Capstone Development`,
    `${topic} Optimization`,
    `${topic} Future Directions`,
  ];
  const lessonTitleSets =
    complexity === "advanced" ? advancedLessonTitleTemplates(topic) : genericLessonTitleTemplates(topic);
  let lessonIndex = 1;
  const chapters = lessonCounts.map((lessonCount, chapterIndex) => ({
    title: chapterThemes[chapterIndex] || `${topic} Chapter ${chapterIndex + 1}`,
    lessons: Array.from({ length: lessonCount }).map((_, lessonInChapterIndex) => {
      const currentId = `L${lessonIndex}`;
      const dependsOn = lessonIndex === 1 ? [] : [`L${lessonIndex - 1}`];
      const defaultTitle =
        lessonTitleSets[chapterIndex]?.[lessonInChapterIndex]
        || `${topic} Lesson ${lessonIndex}`;
      const lesson = {
        id: currentId,
        title: defaultTitle,
        summary: `Build practical understanding of ${topic} through concept, application, and review.`,
        dependsOn,
      };
      lessonIndex += 1;
      return lesson;
    }),
  }));

  const allLessons = chapters.flatMap((c) => c.lessons);
  const dependencyMap = allLessons
    .filter((lesson) => lesson.dependsOn.length > 0)
    .map((lesson) => ({
      fromLessonId: lesson.dependsOn[0],
      toLessonId: lesson.id,
      reason: "This lesson builds directly on concepts from the previous lesson.",
    }));

  return {
    courseTitle: `${topic} ${complexity === "advanced" ? "Advanced Program" : "Foundations"}`,
    audience:
      complexity === "advanced"
        ? `Learners with prior exposure who want deeper, production-grade ${topic} capability.`
        : `Learners who want a practical and structured introduction to ${topic}.`,
    prerequisites:
      complexity === "advanced"
        ? ["Baseline familiarity with the domain", "Comfort with self-directed practice"]
        : ["General curiosity", "Willingness to practice consistently"],
    learningOutcomes: [
      `Explain core ${topic} concepts with correct terminology`,
      `Apply ${topic} frameworks to realistic scenarios`,
      `Evaluate tradeoffs and choose defensible approaches`,
      `Create a final project that demonstrates cumulative mastery`,
    ],
    chapters,
    dependencyMap,
    glossaryCandidates: [
      `${topic} fundamentals`,
      `${topic} workflow`,
      `${topic} architecture`,
      `${topic} tradeoff`,
      `${topic} validation`,
      `${topic} optimization`,
      `${topic} risk management`,
      `${topic} best practices`,
    ],
    finalProjectConcept: `Design and present a practical ${topic} solution that demonstrates planning, implementation, evaluation, and iteration.`,
    courseComplexity: complexity,
  };
}

export function fallbackCourseFromArchitecture(
  topic: string,
  architecture: GeneratedCourseArchitecture,
): GeneratedCourse {
  return {
    title: architecture.courseTitle,
    description: `A structured course on ${topic} for ${architecture.audience}.`,
    chapters: architecture.chapters.map((chapter) => ({
      title: chapter.title,
      description: `Cumulative progression through ${chapter.title}.`,
      lessons: chapter.lessons.map((lesson) => ({
        title: lesson.title,
        lessonType: "concept",
        content: ensureLessonQuality(
          `# ${lesson.title}\n\nThis lesson develops skills required for the final project while reinforcing prior dependencies: ${lesson.dependsOn.join(", ") || "none"}.`,
          lesson.title,
          topic,
          600,
        ),
        glossaryTerms: [
          { term: `${topic} concept`, definition: `A core concept used in ${lesson.title}.` },
          { term: `${topic} dependency`, definition: "A prerequisite relationship between lessons." },
        ],
        relatedTopics: [
          { title: `${topic} implementation`, description: "Practical implementation patterns." },
          { title: `${topic} evaluation`, description: "How to validate outcomes and iterate." },
        ],
      })),
    })),
  };
}

export function fallbackCourse(topic: string, complexity: CourseComplexity = "generic"): GeneratedCourse {
  const architecture = fallbackCourseArchitecture(topic, complexity);
  return fallbackCourseFromArchitecture(topic, architecture);
}

export function fallbackQuiz(lessonTitle: string): GeneratedQuiz {
  return {
    questions: [
      {
        questionText: `What is the primary goal of "${lessonTitle}"?`,
        options: ["Understand key concepts", "Memorize random facts", "Avoid practice", "Skip foundations"],
        correctAnswer: "Understand key concepts",
        explanation: "The lesson is designed to build clear conceptual understanding.",
      },
      {
        questionText: "Which approach improves long-term learning?",
        options: ["Single pass reading", "No review", "Iterative practice", "Ignoring feedback"],
        correctAnswer: "Iterative practice",
        explanation: "Repeated practice with feedback improves retention and transfer.",
      },
      {
        questionText: "What should come before advanced topics?",
        options: ["Foundational knowledge", "Random experimentation", "Unrelated material", "No preparation"],
        correctAnswer: "Foundational knowledge",
        explanation: "Foundations provide the context needed for advanced learning.",
      },
      {
        questionText: "Why are examples useful?",
        options: ["They add confusion", "They connect theory to practice", "They replace all concepts", "They remove structure"],
        correctAnswer: "They connect theory to practice",
        explanation: "Examples make abstract ideas concrete and actionable.",
      },
      {
        questionText: "What is a good next step after finishing a lesson?",
        options: ["Never revisit", "Apply it in practice", "Ignore key terms", "Skip all review"],
        correctAnswer: "Apply it in practice",
        explanation: "Application strengthens understanding and retention.",
      },
    ],
  };
}
