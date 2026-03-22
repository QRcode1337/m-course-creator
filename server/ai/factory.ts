import type { AIProvider } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { OllamaProvider } from "./providers/ollama";
import { AnthropicProvider } from "./providers/anthropic";
import { XAIProvider } from "./providers/xai";
import { LMStudioProvider } from "./providers/lmstudio";
import { config } from "../config";

export function createAIProvider(settings: {
  preferredProvider?: string | null;
  openaiApiKey?: string | null;
  openaiModel?: string | null;
  anthropicApiKey?: string | null;
  anthropicModel?: string | null;
  xaiApiKey?: string | null;
  xaiModel?: string | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
  ollamaApiKey?: string | null;
  lmStudioBaseUrl?: string | null;
  lmStudioModel?: string | null;
  lmStudioApiKey?: string | null;
}): AIProvider {
  const preferredProvider = settings.preferredProvider ?? config.defaultAiProvider;

  if (preferredProvider === "anthropic") {
    return new AnthropicProvider({
      apiKey: settings.anthropicApiKey,
      model: settings.anthropicModel,
    });
  }

  if (preferredProvider === "xai") {
    return new XAIProvider({
      apiKey: settings.xaiApiKey,
      model: settings.xaiModel,
    });
  }

  if (preferredProvider === "lmstudio") {
    return new LMStudioProvider({
      baseUrl: settings.lmStudioBaseUrl,
      model: settings.lmStudioModel,
      apiKey: settings.lmStudioApiKey,
    });
  }

  if (preferredProvider === "ollama") {
    return new OllamaProvider({
      baseUrl: settings.ollamaBaseUrl,
      model: settings.ollamaModel,
      apiKey: settings.ollamaApiKey,
    });
  }

  return new OpenAIProvider({
    apiKey: settings.openaiApiKey,
    model: settings.openaiModel,
    fallbackApiKey: config.openAiApiKey,
  });
}
