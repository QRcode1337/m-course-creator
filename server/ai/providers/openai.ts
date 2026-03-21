import OpenAI from "openai";
import { config } from "../../config";
import type { AIProvider } from "../types";
import { courseGenerationPrompt } from "../prompts/courseGeneration";
import { quizGenerationPrompt } from "../prompts/quizGeneration";
import { lessonChatPrompt } from "../prompts/lessonChat";
import { fallbackCourse, fallbackQuiz } from "../fallback";
import { parseCourseJson, parseQuizJson } from "../parser";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null;

  constructor(private readonly settings: { apiKey?: string | null; model?: string | null }) {
    const key = settings.apiKey || config.openAiApiKey;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
  }

  private getModel() {
    return this.settings.model || config.defaultOpenAiModel;
  }

  async generateCourse(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
  }) {
    if (!this.client) return fallbackCourse(params.topic);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.2,
        messages: [{ role: "user", content: courseGenerationPrompt(params) }],
      });
      const raw = completion.choices[0]?.message?.content || "";
      return parseCourseJson(raw);
    } catch {
      return fallbackCourse(params.topic);
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
        content: `${params.existingContent}\n\n## Refreshed Summary\n- Reframed key points for clarity\n- Added concise next-step guidance`,
      };
    }

    try {
      const prompt = `Rewrite this lesson content with improved clarity and structure. Return markdown only.\n\nCourse: ${params.courseTitle}\nLesson: ${params.lessonTitle}\n\nOriginal:\n${params.existingContent}`;
      const completion = await this.client.chat.completions.create({
        model: this.getModel(),
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      });
      return { content: completion.choices[0]?.message?.content || params.existingContent };
    } catch {
      return { content: params.existingContent };
    }
  }
}
