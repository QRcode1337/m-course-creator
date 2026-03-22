import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const defaultDbPath = process.env.VERCEL ? "/tmp/app.db" : "./data/app.db";
const databasePath = process.env.DATABASE_PATH || defaultDbPath;
const resolvedDbPath = path.resolve(process.cwd(), databasePath);
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
const uploadsDir = path.resolve(path.dirname(resolvedDbPath), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const corsOrigin = process.env.CORS_ORIGIN?.trim();

export const config = {
  port: Number(process.env.PORT || 3001),
  databasePath: resolvedDbPath,
  uploadsDir,
  corsOrigin: corsOrigin && corsOrigin.length > 0 ? corsOrigin : undefined,
  defaultAiProvider: ["openai", "ollama", "anthropic", "xai", "lmstudio"].includes(process.env.AI_PROVIDER || "")
    ? (process.env.AI_PROVIDER as "openai" | "ollama" | "anthropic" | "xai" | "lmstudio")
    : "openai",
  openAiApiKey: process.env.OPENAI_API_KEY,
  defaultOpenAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultAnthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  xaiApiKey: process.env.XAI_API_KEY,
  defaultXaiModel: process.env.XAI_MODEL || "grok-4.20-beta-latest-non-reasoning",
  defaultOllamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  defaultOllamaModel: process.env.OLLAMA_MODEL || "llama3.1:8b",
  defaultLmStudioBaseUrl: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
  defaultLmStudioModel: process.env.LMSTUDIO_MODEL || "local-model",
  lmStudioApiKey: process.env.LMSTUDIO_API_KEY,
};
