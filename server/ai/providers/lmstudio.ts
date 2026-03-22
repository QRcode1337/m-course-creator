import { config } from "../../config";
import { OpenAIProvider } from "./openai";

export class LMStudioProvider extends OpenAIProvider {
  constructor(settings: {
    baseUrl?: string | null;
    model?: string | null;
    apiKey?: string | null;
  }) {
    super({
      apiKey: settings.apiKey || config.lmStudioApiKey || "lm-studio",
      model: settings.model || config.defaultLmStudioModel,
      baseUrl: (settings.baseUrl || config.defaultLmStudioBaseUrl).replace(/\/+$/, ""),
      allowMissingApiKey: true,
    });
  }
}
