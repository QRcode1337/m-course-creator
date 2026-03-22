import type Database from "better-sqlite3";

function hasColumn(sqlite: Database.Database, table: string, column: string) {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function addColumnIfMissing(sqlite: Database.Database, table: string, column: string, statement: string) {
  if (hasColumn(sqlite, table, column)) return;

  try {
    sqlite.exec(statement);
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate column name")) {
      return;
    }
    throw error;
  }
}

export function ensureSchema(sqlite: Database.Database) {
  sqlite.pragma("foreign_keys = ON");

  const defaultProvider = ["openai", "ollama", "anthropic", "xai", "lmstudio"].includes(process.env.AI_PROVIDER || "")
    ? (process.env.AI_PROVIDER as "openai" | "ollama" | "anthropic" | "xai" | "lmstudio")
    : "openai";
  const defaultOpenAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const defaultAnthropicModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  const defaultXaiModel = process.env.XAI_MODEL || "grok-4.20-beta-latest-non-reasoning";
  const defaultOllamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const defaultOllamaModel = process.env.OLLAMA_MODEL || "llama3.1:8b";
  const defaultLmStudioBaseUrl = process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1";
  const defaultLmStudioModel = process.env.LMSTUDIO_MODEL || "local-model";

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      preferred_provider TEXT NOT NULL DEFAULT 'openai',
      openai_api_key TEXT,
      openai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      anthropic_api_key TEXT,
      anthropic_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
      xai_api_key TEXT,
      xai_model TEXT NOT NULL DEFAULT 'grok-4.20-beta-latest-non-reasoning',
      ollama_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
      ollama_model TEXT NOT NULL DEFAULT 'llama3.1:8b',
      lmstudio_base_url TEXT NOT NULL DEFAULT 'http://localhost:1234/v1',
      lmstudio_model TEXT NOT NULL DEFAULT 'local-model',
      lmstudio_api_key TEXT,
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

    CREATE TABLE IF NOT EXISTS imported_documents (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready',
      extracted_content TEXT,
      word_count INTEGER,
      title TEXT,
      error_message TEXT,
      course_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_notes (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_imported_documents_course_id ON imported_documents(course_id);
    CREATE INDEX IF NOT EXISTS idx_imported_documents_created_at ON imported_documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_notes_lesson_id ON user_notes(lesson_id);
  `);

  addColumnIfMissing(sqlite, "settings", "ollama_base_url", "ALTER TABLE settings ADD COLUMN ollama_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434'");
  addColumnIfMissing(sqlite, "settings", "ollama_model", "ALTER TABLE settings ADD COLUMN ollama_model TEXT NOT NULL DEFAULT 'llama3.1:8b'");
  addColumnIfMissing(sqlite, "settings", "anthropic_api_key", "ALTER TABLE settings ADD COLUMN anthropic_api_key TEXT");
  addColumnIfMissing(sqlite, "settings", "anthropic_model", `ALTER TABLE settings ADD COLUMN anthropic_model TEXT NOT NULL DEFAULT '${defaultAnthropicModel}'`);
  addColumnIfMissing(sqlite, "settings", "xai_api_key", "ALTER TABLE settings ADD COLUMN xai_api_key TEXT");
  addColumnIfMissing(sqlite, "settings", "xai_model", `ALTER TABLE settings ADD COLUMN xai_model TEXT NOT NULL DEFAULT '${defaultXaiModel}'`);
  addColumnIfMissing(sqlite, "settings", "lmstudio_base_url", `ALTER TABLE settings ADD COLUMN lmstudio_base_url TEXT NOT NULL DEFAULT '${defaultLmStudioBaseUrl}'`);
  addColumnIfMissing(sqlite, "settings", "lmstudio_model", `ALTER TABLE settings ADD COLUMN lmstudio_model TEXT NOT NULL DEFAULT '${defaultLmStudioModel}'`);
  addColumnIfMissing(sqlite, "settings", "lmstudio_api_key", "ALTER TABLE settings ADD COLUMN lmstudio_api_key TEXT");

  const now = Date.now();
  sqlite.prepare(`
    INSERT INTO settings (
      id, preferred_provider, openai_model, anthropic_model, xai_model,
      ollama_base_url, ollama_model, lmstudio_base_url, lmstudio_model, updated_at
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(
    defaultProvider,
    defaultOpenAiModel,
    defaultAnthropicModel,
    defaultXaiModel,
    defaultOllamaBaseUrl,
    defaultOllamaModel,
    defaultLmStudioBaseUrl,
    defaultLmStudioModel,
    now,
  );
}
