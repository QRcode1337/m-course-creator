import { config } from "../../config";
import { OpenAIProvider } from "./openai";

export class XAIProvider extends OpenAIProvider {
  constructor(settings: { apiKey?: string | null; model?: string | null }) {
    super({
      apiKey: settings.apiKey,
      model: settings.model || config.defaultXaiModel,
      baseUrl: "https://api.x.ai/v1",
      fallbackApiKey: config.xaiApiKey,
    });
  }
}
