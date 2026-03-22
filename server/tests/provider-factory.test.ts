import { createAIProvider } from "../ai/factory";

describe("AI provider factory", () => {
  it("creates Ollama provider when selected", () => {
    const provider = createAIProvider({
      preferredProvider: "ollama",
      ollamaBaseUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.1:8b",
    });

    expect(provider.constructor.name).toBe("OllamaProvider");
  });

  it("creates Anthropic provider when selected", () => {
    const provider = createAIProvider({
      preferredProvider: "anthropic",
      anthropicApiKey: "test-key",
      anthropicModel: "claude-sonnet-4-20250514",
    });

    expect(provider.constructor.name).toBe("AnthropicProvider");
  });

  it("creates xAI provider when selected", () => {
    const provider = createAIProvider({
      preferredProvider: "xai",
      xaiApiKey: "test-key",
      xaiModel: "grok-4.20-beta-latest-non-reasoning",
    });

    expect(provider.constructor.name).toBe("XAIProvider");
  });

  it("creates LM Studio provider when selected", () => {
    const provider = createAIProvider({
      preferredProvider: "lmstudio",
      lmStudioBaseUrl: "http://localhost:1234/v1",
      lmStudioModel: "local-model",
    });

    expect(provider.constructor.name).toBe("LMStudioProvider");
  });

  it("defaults to OpenAI provider", () => {
    const provider = createAIProvider({
      preferredProvider: "openai",
    });

    expect(provider.constructor.name).toBe("OpenAIProvider");
  });
});
