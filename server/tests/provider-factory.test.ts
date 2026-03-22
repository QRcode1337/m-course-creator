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

  it("defaults to OpenAI provider", () => {
    const provider = createAIProvider({
      preferredProvider: "openai",
    });

    expect(provider.constructor.name).toBe("OpenAIProvider");
  });
});
