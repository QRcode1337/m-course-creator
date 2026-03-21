export interface GeneratedGlossaryTerm {
  term: string;
  definition: string;
}

export interface GeneratedRelatedTopic {
  title: string;
  description?: string;
}

export interface GeneratedLesson {
  title: string;
  lessonType?: string;
  content: string;
  glossaryTerms: GeneratedGlossaryTerm[];
  relatedTopics: GeneratedRelatedTopic[];
}

export interface GeneratedChapter {
  title: string;
  description: string;
  lessons: GeneratedLesson[];
}

export interface GeneratedCourse {
  title: string;
  description: string;
  chapters: GeneratedChapter[];
}

export interface GeneratedQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GeneratedQuiz {
  questions: GeneratedQuizQuestion[];
}

export interface AIProvider {
  generateCourse(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
  }): Promise<GeneratedCourse>;
  generateQuiz(params: {
    lessonTitle: string;
    lessonContent: string;
  }): Promise<GeneratedQuiz>;
  chat(params: {
    lessonTitle: string;
    lessonContent: string;
    message: string;
    conversationHistory: Array<{ role: string; content: string }>;
  }): Promise<{ message: string }>;
  regenerateLesson(params: {
    courseTitle: string;
    lessonTitle: string;
    existingContent: string;
  }): Promise<{ content: string }>;
}
