import request from "supertest";
import { createTestDb, schema } from "../db";
import { makeId } from "../lib/id";
import { buildApp } from "../app";

function seedCourse(database: ReturnType<typeof createTestDb>["db"]) {
  const courseId = makeId();
  const chapterId = makeId();
  const lessonId = makeId();

  database.insert(schema.courses).values({
    id: courseId,
    title: "Smoke PDF Course",
    description: "Binary PDF route test",
    approach: "balanced",
    familiarityLevel: "intermediate",
    createdAt: Date.now(),
  }).run();

  database.insert(schema.chapters).values({
    id: chapterId,
    courseId,
    title: "Chapter 1",
    description: "First chapter",
    orderIndex: 0,
  }).run();

  database.insert(schema.lessons).values({
    id: lessonId,
    chapterId,
    title: "Lesson 1",
    content: "# Core lesson content\n\n- Binary route works\n- PDF bytes are valid",
    lessonType: "concept",
    completed: 0,
    orderIndex: 0,
  }).run();

  database.insert(schema.glossaryTerms).values({
    id: makeId(),
    lessonId,
    term: "PDF",
    definition: "Portable Document Format",
  }).run();

  return courseId;
}

function binaryParser(res: NodeJS.ReadableStream, callback: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
  res.on("error", (error) => callback(error, Buffer.alloc(0)));
}

describe("GET /api/courses/:courseId/pdf", () => {
  it("returns a binary PDF attachment", async () => {
    const { db, sqlite } = createTestDb(":memory:");
    const courseId = seedCourse(db);
    const app = buildApp({ database: db });

    const response = await request(app)
      .get(`/api/courses/${courseId}/pdf`)
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain('filename="Smoke_PDF_Course.pdf"');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 4).toString("ascii")).toBe("%PDF");

    sqlite.close();
  });
});
