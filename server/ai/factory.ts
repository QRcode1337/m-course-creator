import type { AIProvider } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { OllamaProvider } from "./providers/ollama";
import { config } from "../config";

export function createAIProvider(settings: {
  preferredProvider?: string | null;
  openaiApiKey?: string | null;
  openaiModel?: string | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
  ollamaApiKey?: string | null;
}): AIProvider {
  if ((settings.preferredProvider ?? config.defaultAiProvider) === "ollama") {
    return new OllamaProvider({
      baseUrl: settings.ollamaBaseUrl,
      model: settings.ollamaModel,
      apiKey: settings.ollamaApiKey,
    });
  }

  return new OpenAIProvider({
    apiKey: settings.openaiApiKey,
    model: settings.openaiModel,
  });
}
