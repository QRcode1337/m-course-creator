import { eq } from "drizzle-orm";
import type { db } from "../db";
import { schema } from "../db";
import { config } from "../config";

type DbType = typeof db;

export async function getGlobalSettings(database: DbType) {
  const row = await database.query.settings.findFirst({
    where: eq(schema.settings.id, 1),
  });

  return {
    preferredProvider: row?.preferredProvider ?? config.defaultAiProvider,
    openaiApiKey: row?.openaiApiKey ?? config.openAiApiKey ?? null,
    openaiModel: row?.openaiModel ?? config.defaultOpenAiModel,
    ollamaBaseUrl: row?.ollamaBaseUrl ?? config.defaultOllamaBaseUrl,
    ollamaModel: row?.ollamaModel ?? config.defaultOllamaModel,
    ollamaApiKey: process.env.OLLAMA_API_KEY || null,
  };
}
