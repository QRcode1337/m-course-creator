import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db } from "../db";

export function createContext(_opts: CreateExpressContextOptions) {
  return { db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
