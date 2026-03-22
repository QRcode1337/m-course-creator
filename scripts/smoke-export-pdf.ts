import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { eq } from "drizzle-orm";
import { chromium } from "playwright";
import { buildApp } from "../server/app";
import { db, schema } from "../server/db";
import { makeId } from "../server/lib/id";

function ensureSmokeCourse() {
  const courseId = makeId();
  const chapterId = makeId();
  const lessonId = makeId();
  const glossaryTermId = makeId();
  const now = Date.now();

  db.insert(schema.courses).values({
    id: courseId,
    title: "Playwright PDF Smoke Course",
    description: "Browser smoke test for PDF export",
    approach: "balanced",
    familiarityLevel: "intermediate",
    createdAt: now,
  }).run();

  db.insert(schema.chapters).values({
    id: chapterId,
    courseId,
    title: "Chapter 1",
    description: "Smoke test chapter",
    orderIndex: 0,
  }).run();

  db.insert(schema.lessons).values({
    id: lessonId,
    chapterId,
    title: "Lesson 1",
    content: "# Core lesson content\n\nThis smoke test verifies that the export button downloads a valid PDF.",
    lessonType: "concept",
    completed: 0,
    orderIndex: 0,
  }).run();

  db.insert(schema.glossaryTerms).values({
    id: glossaryTermId,
    lessonId,
    term: "Smoke test",
    definition: "A narrow end-to-end verification of a critical path.",
  }).run();

  return {
    courseId,
    chapterId,
    lessonId,
    glossaryTermId,
  };
}

async function main() {
  const clientIndex = path.resolve(process.cwd(), "dist/client/index.html");
  if (!fs.existsSync(clientIndex)) {
    throw new Error("Build artifacts are missing. Run `npm run build` before the smoke test.");
  }

  const app = buildApp();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to determine server address for smoke test.");
  }

  const smokeCourse = ensureSmokeCourse();
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const outputDir = path.resolve(process.cwd(), "output/playwright");
  const outputPath = path.join(outputDir, "pdf-export-smoke.pdf");

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    await page.goto(`http://127.0.0.1:${address.port}/course/${smokeCourse.courseId}`, {
      waitUntil: "networkidle",
    });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF" }).click();
    const download = await downloadPromise;
    await download.saveAs(outputPath);

    const pdf = fs.readFileSync(outputPath);
    const header = pdf.subarray(0, 4).toString("ascii");
    if (header !== "%PDF") {
      throw new Error(`Downloaded file is not a PDF. Header was ${header}.`);
    }

    console.log(JSON.stringify({
      courseId: smokeCourse.courseId,
      outputPath,
      filename: download.suggestedFilename(),
      bytes: pdf.length,
      header,
    }, null, 2));
  } finally {
    db.delete(schema.glossaryTerms).where(eq(schema.glossaryTerms.id, smokeCourse.glossaryTermId)).run();
    db.delete(schema.lessons).where(eq(schema.lessons.id, smokeCourse.lessonId)).run();
    db.delete(schema.chapters).where(eq(schema.chapters.id, smokeCourse.chapterId)).run();
    db.delete(schema.courses).where(eq(schema.courses.id, smokeCourse.courseId)).run();
    await browser.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
