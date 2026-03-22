import { config } from "../../config";
import {
  fallbackCourse,
  fallbackCourseArchitecture,
  fallbackCourseFromArchitecture,
  fallbackQuiz,
} from "../fallback";
import { parseCourseArchitectureJson, parseCourseJson, parseQuizJson } from "../parser";
import { courseArchitecturePrompt } from "../prompts/courseArchitecture";
import { courseFromArchitecturePrompt } from "../prompts/courseFromArchitecture";
import { lessonChatPrompt } from "../prompts/lessonChat";
import { quizGenerationPrompt } from "../prompts/quizGeneration";
import type { AIProvider, GeneratedCourseArchitecture } from "../types";
import { applyArchitectureToGeneratedCourse, ensureLessonQuality, normalizeGeneratedCourse } from "../course-quality";

type OllamaGenerateResponse = {
  response?: string;
};

export class OllamaProvider implements AIProvider {
  constructor(
    private readonly settings: {
      baseUrl?: string | null;
      model?: string | null;
      apiKey?: string | null;
    },
  ) {}

  private getBaseUrl() {
    return (this.settings.baseUrl || config.defaultOllamaBaseUrl).replace(/\/+$/, "");
  }

  private getModel() {
    return this.settings.model || config.defaultOllamaModel;
  }

  private async generateText(prompt: string, temperature: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const res = await fetch(`${this.getBaseUrl()}/api/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.settings.apiKey ? { authorization: `Bearer ${this.settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.getModel(),
          prompt,
          stream: false,
          options: { temperature },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama request failed: ${res.status}`);
      }

      const data = (await res.json()) as OllamaGenerateResponse;
      if (typeof data.response !== "string" || data.response.trim().length === 0) {
        throw new Error("Empty Ollama response");
      }

      return data.response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateCourse(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
    courseComplexity?: "generic" | "advanced";
  }) {
    try {
      const architecture = await this.generateCourseArchitecture(params);
      return this.generateCourseFromArchitecture({ ...params, architecture });
    } catch {
      return normalizeGeneratedCourse(fallbackCourse(params.topic, params.courseComplexity || "generic"), params.topic);
    }
  }

  async generateCourseArchitecture(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
    courseComplexity?: "generic" | "advanced";
  }) {
    try {
      const raw = await this.generateText(courseArchitecturePrompt(params), 0.2);
      return parseCourseArchitectureJson(raw);
    } catch {
      return fallbackCourseArchitecture(params.topic, params.courseComplexity || "generic");
    }
  }

  async generateCourseFromArchitecture(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
    courseComplexity?: "generic" | "advanced";
    architecture: GeneratedCourseArchitecture;
  }) {
    try {
      const raw = await this.generateText(courseFromArchitecturePrompt(params), 0.2);
      return applyArchitectureToGeneratedCourse(params.topic, params.architecture, parseCourseJson(raw));
    } catch {
      return applyArchitectureToGeneratedCourse(
        params.topic,
        params.architecture,
        fallbackCourseFromArchitecture(params.topic, params.architecture),
      );
    }
  }

  async generateQuiz(params: { lessonTitle: string; lessonContent: string }) {
    try {
      const raw = await this.generateText(quizGenerationPrompt(params), 0.2);
      return parseQuizJson(raw);
    } catch {
      return fallbackQuiz(params.lessonTitle);
    }
  }

  async chat(params: {
    lessonTitle: string;
    lessonContent: string;
    message: string;
    conversationHistory: Array<{ role: string; content: string }>;
  }) {
    try {
      const message = await this.generateText(lessonChatPrompt(params), 0.4);
      return { message };
    } catch {
      return {
        message: "I couldn't answer right now. Try again with a narrower question from this lesson.",
      };
    }
  }

  async regenerateLesson(params: {
    courseTitle: string;
    lessonTitle: string;
    existingContent: string;
  }) {
    const prompt = `Rewrite this lesson content with improved clarity and structure. Return markdown only.\n\nCourse: ${params.courseTitle}\nLesson: ${params.lessonTitle}\n\nRequired lesson format (in order):
- ## Learning Objectives
- ## Lecture Content
- ## Examples
- ## Exercises
  - ### Beginner
  - ### Intermediate
  - ### Advanced
- ## Quiz and Answer Key
- ## Misconceptions
- ## Further Reading

Length requirements:
- At least 600 words.
- Keep content practical and specific.

Original:\n${params.existingContent}`;

    try {
      const content = await this.generateText(prompt, 0.3);
      return { content: ensureLessonQuality(content, params.lessonTitle, params.courseTitle, 600) };
    } catch {
      return { content: ensureLessonQuality(params.existingContent, params.lessonTitle, params.courseTitle, 600) };
    }
  }
}
