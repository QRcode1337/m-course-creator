import type { GeneratedCourse, GeneratedQuiz } from "./types";

export function fallbackCourse(topic: string): GeneratedCourse {
  return {
    title: `${topic} Fundamentals`,
    description: `A practical introduction to ${topic} with structured lessons and practice.`,
    chapters: [
      {
        title: `Foundations of ${topic}`,
        description: `Core ideas, terminology, and mental models for ${topic}.`,
        lessons: [
          {
            title: `What is ${topic}?`,
            lessonType: "concept",
            content: `# What is ${topic}?\n\n## Core idea\n${topic} is a field you can learn through concepts, examples, and practice.\n\n## Why it matters\n- Builds practical understanding\n- Helps you reason clearly\n- Enables deeper applications\n\n## Quick example\nUse this lesson as a baseline before advanced topics.`,
            glossaryTerms: [
              { term: "Fundamentals", definition: "The basic principles that form the core of a topic." },
              { term: "Concept", definition: "An abstract idea used to understand a domain." },
            ],
            relatedTopics: [
              { title: `History of ${topic}`, description: "How the field evolved over time." },
              { title: `Applications of ${topic}`, description: "Where this topic is used in practice." },
            ],
          },
          {
            title: `${topic} in Practice`,
            lessonType: "application",
            content: `# ${topic} in Practice\n\n## Practical workflow\n1. Define the goal\n2. Select the right method\n3. Evaluate outcomes\n\n## Common mistakes\n- Skipping fundamentals\n- Overcomplicating early\n- Ignoring feedback loops`,
            glossaryTerms: [
              { term: "Workflow", definition: "A repeatable sequence of steps to complete work." },
              { term: "Feedback Loop", definition: "A process where outputs inform future actions." },
            ],
            relatedTopics: [
              { title: `Case studies in ${topic}`, description: "Real scenarios and outcomes." },
              { title: `Advanced ${topic}`, description: "Deeper methods and frameworks." },
            ],
          },
        ],
      },
      {
        title: `Building Competence in ${topic}`,
        description: "Techniques for retention, practice, and mastery.",
        lessons: [
          {
            title: `Key Patterns`,
            lessonType: "pattern",
            content: `# Key Patterns\n\n## Patterns to remember\n- Reuse proven structures\n- Measure outcomes\n- Iterate systematically`,
            glossaryTerms: [
              { term: "Pattern", definition: "A recurring solution to a recurring problem." },
              { term: "Iteration", definition: "Repeated improvement through cycles." },
            ],
            relatedTopics: [
              { title: "Deliberate practice", description: "Focused repetition with feedback." },
              { title: "Performance metrics", description: "How to track improvement." },
            ],
          },
          {
            title: `Review and Next Steps`,
            lessonType: "review",
            content: `# Review and Next Steps\n\n## Review\nSummarize the main models and examples.\n\n## Next steps\n- Practice with new prompts\n- Build a small project\n- Teach the topic to someone else`,
            glossaryTerms: [
              { term: "Retention", definition: "The ability to remember and apply knowledge over time." },
              { term: "Transfer", definition: "Applying learning to new contexts." },
            ],
            relatedTopics: [
              { title: "Project-based learning", description: "Learn by building." },
              { title: "Peer teaching", description: "Use explanation as reinforcement." },
            ],
          },
        ],
      },
    ],
  };
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
