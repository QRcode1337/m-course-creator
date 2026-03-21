import type { AIProvider } from "./types";
import { OpenAIProvider } from "./providers/openai";

export function createAIProvider(settings: {
  preferredProvider?: string | null;
  openaiApiKey?: string | null;
  openaiModel?: string | null;
}): AIProvider {
  return new OpenAIProvider({
    apiKey: settings.openaiApiKey,
    model: settings.openaiModel,
  });
}
