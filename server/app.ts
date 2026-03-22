import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { eq } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { config } from "./config";
import { db } from "./db";
import { processDocument, getFileType } from "./documentProcessor";
import { schema } from "./db";
import { buildCoursePdfExport } from "./lib/course-pdf-export";
import { makeId } from "./lib/id";
import { appRouter } from "./trpc/router";
import { createContextFactory } from "./trpc/context";

export function buildApp({ database = db }: { database?: typeof db } = {}) {
  const app = express();
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  });
  const upload = multer({ storage });

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

  app.post("/api/documents/upload", upload.single("file"), async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ message: "No file uploaded." });
        return;
      }

      const fileType = getFileType(file.originalname);
      if (!fileType) {
        fs.unlinkSync(file.path);
        res.status(400).json({ message: "Unsupported file type." });
        return;
      }

      const now = Date.now();
      const documentId = makeId();

      try {
        const processed = await processDocument(file.path, fileType);
        await database.insert(schema.importedDocuments).values({
          id: documentId,
          fileName: file.originalname,
          fileType,
          storedPath: file.path,
          fileSize: file.size,
          status: "ready",
          extractedContent: processed.content,
          wordCount: processed.wordCount,
          title: processed.title ?? null,
          errorMessage: null,
          courseId: null,
          createdAt: now,
          updatedAt: now,
        }).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process document.";
        await database.insert(schema.importedDocuments).values({
          id: documentId,
          fileName: file.originalname,
          fileType,
          storedPath: file.path,
          fileSize: file.size,
          status: "error",
          extractedContent: null,
          wordCount: null,
          title: null,
          errorMessage: message,
          courseId: null,
          createdAt: now,
          updatedAt: now,
        }).run();
      }

      const rows = await database
        .select()
        .from(schema.importedDocuments)
        .where(eq(schema.importedDocuments.id, documentId));
      res.status(201).json({ document: rows[0] });
    } catch (error) {
      next(error);
    }
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
