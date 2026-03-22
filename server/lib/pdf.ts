import PDFDocument from "pdfkit";

type CoursePdfLesson = {
  title: string;
  content: string;
  lessonType?: string | null;
};

type CoursePdfChapter = {
  title: string;
  description: string;
  lessons: CoursePdfLesson[];
};

type CoursePdfGlossaryTerm = {
  term: string;
  definition: string;
};

export type CoursePdfData = {
  title: string;
  description: string;
  approach?: string | null;
  familiarityLevel?: string | null;
  createdAt: number;
  chapters: CoursePdfChapter[];
  glossaryTerms: CoursePdfGlossaryTerm[];
};

function buildPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

function renderMarkdownish(doc: PDFKit.PDFDocument, markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock) doc.moveDown(0.5);
      continue;
    }

    if (inCodeBlock) {
      doc.font("Courier").fontSize(9).fillColor("#1f2937").text(line || " ", {
        indent: 16,
      });
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      doc.moveDown(0.5);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(13).fillColor("#111827").text(cleanInlineMarkdown(trimmed.slice(4)));
      continue;
    }

    if (trimmed.startsWith("## ")) {
      doc.moveDown(0.75);
      doc.font("Helvetica-Bold").fontSize(15).fillColor("#111827").text(cleanInlineMarkdown(trimmed.slice(3)));
      continue;
    }

    if (trimmed.startsWith("# ")) {
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827").text(cleanInlineMarkdown(trimmed.slice(2)));
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      doc.font("Helvetica").fontSize(11).fillColor("#1f2937").text(`• ${cleanInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}`, {
        indent: 14,
      });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      doc.font("Helvetica").fontSize(11).fillColor("#1f2937").text(cleanInlineMarkdown(trimmed), {
        indent: 14,
      });
      continue;
    }

    doc.font("Helvetica").fontSize(11).fillColor("#1f2937").text(cleanInlineMarkdown(trimmed), {
      paragraphGap: 4,
    });
  }
}

export async function generateCoursePdf(data: CoursePdfData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 54,
    info: {
      Title: data.title,
      Author: "m-course-creator",
      Subject: "AI-generated course export",
    },
  });

  doc.font("Helvetica-Bold").fontSize(24).fillColor("#111827").text(data.title);

  doc.moveDown(0.35);
  doc.font("Helvetica").fontSize(10).fillColor("#4b5563");
  doc.text(`Created ${new Date(data.createdAt).toLocaleDateString()}`);
  if (data.approach) doc.text(`Approach: ${data.approach}`);
  if (data.familiarityLevel) doc.text(`Depth: ${data.familiarityLevel}`);

  if (data.description) {
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(12).fillColor("#1f2937").text(data.description);
  }

  for (const [chapterIndex, chapter] of data.chapters.entries()) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(19).fillColor("#111827").text(`Chapter ${chapterIndex + 1}: ${chapter.title}`);

    if (chapter.description) {
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(11).fillColor("#4b5563").text(chapter.description);
    }

    for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(15).fillColor("#111827").text(`${chapterIndex + 1}.${lessonIndex + 1} ${lesson.title}`);

      if (lesson.lessonType) {
        doc.moveDown(0.2);
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#6b7280").text(lesson.lessonType);
      }

      doc.moveDown(0.4);
      renderMarkdownish(doc, lesson.content);
    }
  }

  if (data.glossaryTerms.length > 0) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827").text("Glossary");
    doc.moveDown(0.8);

    for (const term of data.glossaryTerms) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(term.term);
      doc.font("Helvetica").fontSize(10).fillColor("#374151").text(term.definition);
      doc.moveDown(0.5);
    }
  }

  return buildPdfBuffer(doc);
}
