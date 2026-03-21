import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

export function buildApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  app.get("/api/auth/session", (_req, res) => {
    res.json({ user: { id: "local-user", email: "local@course-creator.local", name: "Local User" } });
  });

  const clientDist = path.resolve(process.cwd(), "dist/client");
  if (!process.env.VERCEL && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("/{*any}", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return app;
}

export const app = buildApp();
