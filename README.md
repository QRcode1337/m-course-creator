# Manus Course Creator (MVP)

Local-first AI course generator with lessons, quizzes, flashcards (SM-2), and a course library.

## Stack

- Client: Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style UI
- API: Express + tRPC
- Database: SQLite + Drizzle ORM + better-sqlite3
- AI: OpenAI-first provider abstraction with fallback generation when no API key is set

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create environment file

```bash
cp .env.example .env
```

3. (Optional) Sync schema with Drizzle

```bash
npm run db:push
```

4. Start development

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

## Commands

```bash
npm run dev          # Run client + server
npm run build        # Build client + compile server
npm run start        # Run built server (serves API + built client)
npm run db:push      # Push Drizzle schema to SQLite
npm run db:studio    # Open Drizzle Studio
npm run typecheck    # Type-check client + server
npm test             # Run unit + integration tests
```

## Environment Variables

- `PORT` (default: `3001`)
- `DATABASE_PATH` (default: `./data/app.db`)
- `OPENAI_API_KEY` (optional for live OpenAI generation)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)

If `OPENAI_API_KEY` is not set, the app uses deterministic fallback generation so the full learning loop still works locally.

## MVP Scope Implemented

- Course generation from topic (with approach/familiarity input)
- Course library and course detail views
- Lesson view with markdown content, glossary, completion toggle, AI chat, and regenerate
- Quiz generation + submit + scoring
- Flashcard initialization + due queue + rating with SM-2 scheduling
- Global settings for OpenAI provider key/model

## Deferred (Post-MVP)

- Full auth/multi-user isolation
- Production-grade knowledge graph recommendations
- Calendar optimization
- PDF export and media generation production pipeline
