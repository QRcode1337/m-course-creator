import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const defaultDbPath = process.env.VERCEL ? "/tmp/app.db" : "./data/app.db";
const databasePath = process.env.DATABASE_PATH || defaultDbPath;
const resolvedDbPath = path.resolve(process.cwd(), databasePath);
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

export const config = {
  port: Number(process.env.PORT || 3001),
  databasePath: resolvedDbPath,
  openAiApiKey: process.env.OPENAI_API_KEY,
  defaultOpenAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
};
