import type Database from "better-sqlite3";

function hasColumn(sqlite: Database.Database, table: string, column: string) {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

export function ensureSchema(sqlite: Database.Database) {
  sqlite.pragma("foreign_keys = ON");

  const defaultProvider = process.env.AI_PROVIDER === "ollama" ? "ollama" : "openai";
  const defaultOpenAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const defaultOllamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const defaultOllamaModel = process.env.OLLAMA_MODEL || "llama3.1:8b";

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      preferred_provider TEXT NOT NULL DEFAULT 'openai',
      openai_api_key TEXT,
      openai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      ollama_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
      ollama_model TEXT NOT NULL DEFAULT 'llama3.1:8b',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      approach TEXT,
      familiarity_level TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      lesson_type TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      order_index INTEGER NOT NULL,
      FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS glossary_terms (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      term TEXT NOT NULL,
      definition TEXT NOT NULL,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL,
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id TEXT PRIMARY KEY,
      glossary_term_id TEXT NOT NULL,
      next_review_date INTEGER NOT NULL,
      interval REAL NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      repetitions INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER,
      FOREIGN KEY(glossary_term_id) REFERENCES glossary_terms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS illustrations (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_glossary_lesson_id ON glossary_terms(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON quiz_questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_term_id ON flashcard_reviews(glossary_term_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_next_review ON flashcard_reviews(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_illustrations_lesson_id ON illustrations(lesson_id);
  `);

  if (!hasColumn(sqlite, "settings", "ollama_base_url")) {
    sqlite.exec("ALTER TABLE settings ADD COLUMN ollama_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434'");
  }
  if (!hasColumn(sqlite, "settings", "ollama_model")) {
    sqlite.exec("ALTER TABLE settings ADD COLUMN ollama_model TEXT NOT NULL DEFAULT 'llama3.1:8b'");
  }

  const now = Date.now();
  sqlite.prepare(`
    INSERT INTO settings (id, preferred_provider, openai_model, ollama_base_url, ollama_model, updated_at)
    VALUES (1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(defaultProvider, defaultOpenAiModel, defaultOllamaBaseUrl, defaultOllamaModel, now);
}
