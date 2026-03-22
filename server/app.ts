import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { config } from "./config";
import { db } from "./db";
import { buildCoursePdfExport } from "./lib/course-pdf-export";
import { appRouter } from "./trpc/router";
import { createContextFactory } from "./trpc/context";

export function buildApp({ database = db }: { database?: typeof db } = {}) {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin ?? true,
      credentials: true,
      exposedHeaders: ["Content-Disposition"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: createContextFactory(database),
    }),
  );

  app.get("/api/courses/:courseId/pdf", async (req, res, next) => {
    try {
      const pdfExport = await buildCoursePdfExport(database, req.params.courseId);
      if (!pdfExport) {
        res.status(404).json({ message: "Course not found." });
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${pdfExport.filename}"`);
      res.setHeader("Cache-Control", "no-store");
      res.send(pdfExport.buffer);
    } catch (error) {
      next(error);
    }
  });

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
