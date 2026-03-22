import OpenAI from "openai";
import { config } from "../../config";
import type { AIProvider, GeneratedCourseArchitecture } from "../types";
import { courseArchitecturePrompt } from "../prompts/courseArchitecture";
import { courseFromArchitecturePrompt } from "../prompts/courseFromArchitecture";
import { quizGenerationPrompt } from "../prompts/quizGeneration";
import { lessonChatPrompt } from "../prompts/lessonChat";
import {
  fallbackCourse,
  fallbackCourseArchitecture,
  fallbackCourseFromArchitecture,
  fallbackQuiz,
} from "../fallback";
import { parseCourseArchitectureJson, parseCourseJson, parseQuizJson } from "../parser";
import { applyArchitectureToGeneratedCourse, ensureLessonQuality, normalizeGeneratedCourse } from "../course-quality";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null;

  constructor(private readonly settings: { apiKey?: string | null; model?: string | null }) {
    const key = settings.apiKey || config.openAiApiKey;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
  }

  private getModel() {
    return this.settings.model || config.defaultOpenAiModel;
  }

  async generateCourseArchitecture(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
    courseComplexity?: "generic" | "advanced";
  }) {
    if (!this.client) return fallbackCourseArchitecture(params.topic, params.courseComplexity || "generic");

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.2,
        messages: [{ role: "user", content: courseArchitecturePrompt(params) }],
      });
      const raw = completion.choices[0]?.message?.content || "";
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
    if (!this.client) {
      return applyArchitectureToGeneratedCourse(
        params.topic,
        params.architecture,
        fallbackCourseFromArchitecture(params.topic, params.architecture),
      );
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.2,
        messages: [{ role: "user", content: courseFromArchitecturePrompt(params) }],
      });
      const raw = completion.choices[0]?.message?.content || "";
      return applyArchitectureToGeneratedCourse(params.topic, params.architecture, parseCourseJson(raw));
    } catch {
      return applyArchitectureToGeneratedCourse(
        params.topic,
        params.architecture,
        fallbackCourseFromArchitecture(params.topic, params.architecture),
      );
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

  async generateQuiz(params: { lessonTitle: string; lessonContent: string }) {
    if (!this.client) return fallbackQuiz(params.lessonTitle);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.2,
        messages: [{ role: "user", content: quizGenerationPrompt(params) }],
      });
      const raw = completion.choices[0]?.message?.content || "";
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
    if (!this.client) {
      return {
        message: `Quick explanation: ${params.message}. Focus on the lesson's core terms and apply one concrete example.`,
      };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.4,
        messages: [{ role: "user", content: lessonChatPrompt(params) }],
      });
      return { message: completion.choices[0]?.message?.content || "I could not generate a response." };
    } catch {
      return { message: "I couldn't answer right now. Try again with a narrower question from this lesson." };
    }
  }

  async regenerateLesson(params: {
    courseTitle: string;
    lessonTitle: string;
    existingContent: string;
  }) {
    if (!this.client) {
      return {
        content: ensureLessonQuality(
          `${params.existingContent}\n\n## Refreshed Summary\n- Reframed key points for clarity\n- Added concise next-step guidance`,
          params.lessonTitle,
          params.courseTitle,
          600,
        ),
      };
    }

    try {
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
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      });
      return {
        content: ensureLessonQuality(
          completion.choices[0]?.message?.content || params.existingContent,
          params.lessonTitle,
          params.courseTitle,
          600,
        ),
      };
    } catch {
      return { content: ensureLessonQuality(params.existingContent, params.lessonTitle, params.courseTitle, 600) };
    }
  }
}
