import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { config } from "../config";
import * as schema from "./schema";
import { ensureSchema } from "./ensure-schema";

const sqlite = new Database(config.databasePath);
sqlite.pragma("journal_mode = WAL");
ensureSchema(sqlite);

export const db = drizzle(sqlite, { schema });
export { sqlite, schema };

export function createTestDb(path = ":memory:") {
  const testSqlite = new Database(path);
  ensureSchema(testSqlite);
  const testDb = drizzle(testSqlite, { schema });
  return { sqlite: testSqlite, db: testDb };
}
