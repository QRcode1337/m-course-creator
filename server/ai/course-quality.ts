import type { GeneratedCourse, GeneratedCourseArchitecture, GeneratedLesson } from "./types";

const REQUIRED_SECTIONS = [
  "Learning Objectives",
  "Lecture Content",
  "Examples",
  "Exercises",
  "Quiz and Answer Key",
  "Misconceptions",
  "Further Reading",
] as const;

function countWords(text: string) {
  return text
    .replace(/[#>*`_-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function sectionBody(topic: string, lessonTitle: string, section: string) {
  switch (section) {
    case "Learning Objectives":
      return `By the end of this lesson, you should be able to explain ${topic} in your own words, identify where "${lessonTitle}" fits into the broader course, and apply the key ideas to a practical scenario. Focus on understanding why each concept matters and how to use it in real work.`;
    case "Lecture Content":
      return `This section presents the core concepts, reasoning models, and practical workflow for ${lessonTitle}. Build from definitions into applied decision-making, and explain how each concept connects to previous lessons so learning remains cumulative.`;
    case "Examples":
      return `Use at least one worked example and one counter-example. For each, explain context, decision path, and why the outcome was correct or incorrect. Tie the example back to ${topic} principles so learners can transfer the pattern to new cases.`;
    case "Exercises":
      return `### Beginner
Complete a focused recall task: define key terms, restate one core idea, and identify where it should be applied.

### Intermediate
Solve a scoped scenario: apply the lesson framework to a realistic case and justify your tradeoffs.

### Advanced
Design and defend a full approach under constraints. Include assumptions, risk analysis, and validation criteria.`;
    case "Quiz and Answer Key":
      return `Provide a short quiz that checks conceptual understanding and applied reasoning. Include a direct answer key with concise explanations for each answer so learners can self-correct immediately.`;
    case "Misconceptions":
      return `Common failures include skipping requirements, using vague success criteria, and making changes without measuring impact. In ${lessonTitle}, avoid jumping to tools before you define the problem and avoid optimizing early before baseline behavior is understood.`;
    case "Further Reading":
      return `List targeted references for next study: one foundational resource, one practical resource, and one advanced resource. Note why each source is relevant to this lesson and what the learner should focus on while reading.`;
    default:
      return "";
  }
}

function ensureHeading(content: string, heading: string, topic: string, lessonTitle: string) {
  const headingPattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
  if (headingPattern.test(content)) return content;
  return `${content}\n\n## ${heading}\n${sectionBody(topic, lessonTitle, heading)}`;
}

function ensureLessonOutline(content: string, lessonTitle: string, topic: string) {
  let result = content.trim();
  if (!result) result = `# ${lessonTitle}`;
  if (!/^#\s+/m.test(result)) {
    result = `# ${lessonTitle}\n\n${result}`;
  }

  for (const section of REQUIRED_SECTIONS) {
    result = ensureHeading(result, section, topic, lessonTitle);
  }

  return result;
}

function padLessonToMinimumWords(content: string, lessonTitle: string, topic: string, minimumWords: number) {
  let result = content;
  let pass = 1;
  while (countWords(result) < minimumWords && pass <= 20) {
    result += `\n\n### Extended Drill ${pass}\nIn this drill, apply "${lessonTitle}" to a new scenario related to ${topic}. Define constraints, choose a method, explain why that method is appropriate, and describe how you would verify the outcome with objective checks.\n\nDocument one tradeoff you made, what risk it introduces, and how you would mitigate that risk in a second iteration. This builds transfer ability so the lesson is useful beyond a single example.`;
    pass += 1;
  }
  return result;
}

export function ensureLessonQuality(content: string, lessonTitle: string, topic: string, minimumWords = 600) {
  const withOutline = ensureLessonOutline(content, lessonTitle, topic);
  return padLessonToMinimumWords(withOutline, lessonTitle, topic, minimumWords);
}

function ensureGlossaryTerms(lesson: GeneratedLesson, topic: string) {
  if (lesson.glossaryTerms.length >= 2) return lesson.glossaryTerms;
  return [
    ...lesson.glossaryTerms,
    { term: `${topic} workflow`, definition: `A repeatable process for applying ${topic} effectively.` },
    { term: `${topic} tradeoff`, definition: `A balance between competing priorities when using ${topic}.` },
  ].slice(0, 5);
}

function ensureRelatedTopics(lesson: GeneratedLesson, topic: string) {
  if (lesson.relatedTopics.length >= 2) return lesson.relatedTopics;
  return [
    ...lesson.relatedTopics,
    { title: `${topic} case studies`, description: `Concrete examples of ${topic} in realistic settings.` },
    { title: `${topic} measurement`, description: `How to evaluate quality and outcomes in ${topic}.` },
  ].slice(0, 5);
}

export function normalizeGeneratedCourse(course: GeneratedCourse, topic: string) {
  const normalized: GeneratedCourse = {
    ...course,
    chapters: course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => ({
        ...lesson,
        content: ensureLessonQuality(lesson.content, lesson.title, topic, 600),
        glossaryTerms: ensureGlossaryTerms(lesson, topic),
        relatedTopics: ensureRelatedTopics(lesson, topic),
      })),
    })),
  };

  const totalLessons = normalized.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  if (totalLessons >= 2) return normalized;

  const supplementalLesson: GeneratedLesson = {
    title: `Applied Practice for ${topic}`,
    lessonType: "application",
    content: ensureLessonQuality("", `Applied Practice for ${topic}`, topic, 600),
    glossaryTerms: [
      { term: `${topic} application`, definition: `Using ${topic} concepts in practical scenarios.` },
      { term: `${topic} validation`, definition: `Checking that outcomes meet explicit quality criteria.` },
    ],
    relatedTopics: [
      { title: `${topic} implementation patterns`, description: `Reusable patterns for applying ${topic}.` },
      { title: `${topic} review loops`, description: `How to improve outcomes through iteration.` },
    ],
  };

  if (normalized.chapters.length === 0) {
    normalized.chapters = [
      {
        title: `${topic} Essentials`,
        description: `Core lessons and practical exercises for ${topic}.`,
        lessons: [supplementalLesson],
      },
    ];
  } else {
    normalized.chapters[0].lessons.push(supplementalLesson);
  }

  return normalized;
}

function stripPrefix(value: string, patterns: RegExp[]) {
  let next = value.trim();
  for (const pattern of patterns) {
    next = next.replace(pattern, "").trim();
  }
  return next;
}

function normalizeChapterTitle(title: string, chapterNumber: number) {
  const core = stripPrefix(title, [/^chapter\s+\d+\s*:\s*/i, /^chapter\s+\d+\s*/i]);
  return `Chapter ${chapterNumber}: ${core}`;
}

function normalizeLessonTitle(title: string, chapterNumber: number, lessonNumber: number) {
  const core = stripPrefix(title, [
    /^lesson\s+\d+(\.\d+)?\s*:\s*/i,
    /^lesson\s+\d+(\.\d+)?\s*/i,
  ]);
  return `Lesson ${chapterNumber}.${lessonNumber}: ${core}`;
}

function defaultLessonSeed(topic: string, lessonTitle: string, dependencies: string[]) {
  return `# ${lessonTitle}

This lesson is part of a cumulative sequence on ${topic}. Prerequisites from architecture: ${dependencies.join(", ") || "none"}.

Use the sections below to study systematically, practice at increasing difficulty, and validate your understanding before progressing.`;
}

export function applyArchitectureToGeneratedCourse(
  topic: string,
  architecture: GeneratedCourseArchitecture,
  generated: GeneratedCourse,
) {
  const generatedChapters = generated.chapters || [];

  const chapters = architecture.chapters.map((architectureChapter, chapterIndex) => {
    const chapterNumber = chapterIndex + 1;
    const generatedChapter = generatedChapters[chapterIndex];
    const generatedLessons = generatedChapter?.lessons || [];

    const lessons = architectureChapter.lessons.map((architectureLesson, lessonIndex) => {
      const lessonNumber = lessonIndex + 1;
      const generatedLesson = generatedLessons[lessonIndex];
      const lessonTitle = normalizeLessonTitle(
        generatedLesson?.title || architectureLesson.title,
        chapterNumber,
        lessonNumber,
      );

      const seededContent =
        generatedLesson?.content
        || defaultLessonSeed(topic, lessonTitle, architectureLesson.dependsOn);

      const content = ensureLessonQuality(seededContent, lessonTitle, topic, 600);
      const glossaryTerms = ensureGlossaryTerms(
        generatedLesson || {
          title: lessonTitle,
          content,
          lessonType: "concept",
          glossaryTerms: [],
          relatedTopics: [],
        },
        topic,
      );
      const relatedTopics = ensureRelatedTopics(
        generatedLesson || {
          title: lessonTitle,
          content,
          lessonType: "concept",
          glossaryTerms: [],
          relatedTopics: [],
        },
        topic,
      );

      return {
        title: lessonTitle,
        lessonType: generatedLesson?.lessonType || "concept",
        content,
        glossaryTerms,
        relatedTopics,
      };
    });

    const lessonCount = lessons.length;
    return {
      title: normalizeChapterTitle(architectureChapter.title, chapterNumber),
      description: `This chapter contains ${lessonCount} lessons in a cumulative sequence.`,
      lessons,
    };
  });

  const normalized = normalizeGeneratedCourse(
    {
      title: architecture.courseTitle || generated.title || `${topic} Course`,
      description:
        generated.description
        || `This course explores ${topic} for ${architecture.audience}.`,
      chapters,
    },
    topic,
  );

  return normalized;
}
