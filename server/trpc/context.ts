import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db } from "../db";

export function createContextFactory(database: typeof db) {
  return function createContext(_opts: CreateExpressContextOptions) {
    return { db: database };
  };
}

export const createContext = createContextFactory(db);

export type Context = Awaited<ReturnType<typeof createContext>>;
