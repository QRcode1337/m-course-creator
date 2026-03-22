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

type AnthropicMessageResponse = {
  content?: Array<
    | { type: "text"; text: string }
    | { type: string }
  >;
};

export class AnthropicProvider implements AIProvider {
  constructor(private readonly settings: { apiKey?: string | null; model?: string | null }) {}

  private getApiKey() {
    return this.settings.apiKey || config.anthropicApiKey;
  }

  private getModel() {
    return this.settings.model || config.defaultAnthropicModel;
  }

  private async generateText(prompt: string, temperature: number, maxTokens = 4000) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Missing Anthropic API key");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.getModel(),
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Anthropic request failed: ${response.status}`);
      }

      const data = (await response.json()) as AnthropicMessageResponse;
      const text = (data.content || [])
        .filter((item): item is { type: "text"; text: string } => item.type === "text")
        .map((item) => item.text)
        .join("\n");

      if (!text.trim()) {
        throw new Error("Empty Anthropic response");
      }

      return text;
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
      const raw = await this.generateText(quizGenerationPrompt(params), 0.2, 2500);
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
      const message = await this.generateText(lessonChatPrompt(params), 0.4, 1200);
      return { message };
    } catch {
      return { message: "I couldn't answer right now. Try again with a narrower question from this lesson." };
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
      const content = await this.generateText(prompt, 0.3, 4000);
      return { content: ensureLessonQuality(content, params.lessonTitle, params.courseTitle, 600) };
    } catch {
      return { content: ensureLessonQuality(params.existingContent, params.lessonTitle, params.courseTitle, 600) };
    }
  }
}
