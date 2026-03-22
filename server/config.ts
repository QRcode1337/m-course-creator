import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const defaultDbPath = process.env.VERCEL ? "/tmp/app.db" : "./data/app.db";
const databasePath = process.env.DATABASE_PATH || defaultDbPath;
const resolvedDbPath = path.resolve(process.cwd(), databasePath);
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

const corsOrigin = process.env.CORS_ORIGIN?.trim();

export const config = {
  port: Number(process.env.PORT || 3001),
  databasePath: resolvedDbPath,
  corsOrigin: corsOrigin && corsOrigin.length > 0 ? corsOrigin : undefined,
  defaultAiProvider: process.env.AI_PROVIDER === "ollama" ? "ollama" : "openai",
  openAiApiKey: process.env.OPENAI_API_KEY,
  defaultOpenAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  defaultOllamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  defaultOllamaModel: process.env.OLLAMA_MODEL || "llama3.1:8b",
};
