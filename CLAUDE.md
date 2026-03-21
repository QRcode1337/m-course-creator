# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

AI-powered personal course creator. Users enter a topic, AI generates a full course with chapters, lessons (markdown), glossary terms, quizzes, flashcards with SM-2 spaced repetition, and a knowledge graph. Self-hosted, single-user or small-team.

## Tech Stack

- **Frontend:** Vite + React 19 + TypeScript, Tailwind CSS v4 + shadcn/ui
- **Routing:** Wouter (client), tRPC (API)
- **State:** TanStack React Query + tRPC React hooks
- **Backend:** Express.js + tRPC
- **Database:** SQLite via better-sqlite3, Drizzle ORM
- **Auth:** bcrypt + HTTP-only cookie sessions
- **AI:** Multi-provider (Anthropic, OpenAI, OpenRouter, Grok) via factory pattern
- **Other:** React Flow (graph viz), DnD Kit (drag & drop), react-markdown

## Commands

```bash
npm run dev          # Client (Vite) + server (tsx watch) concurrently
npm run build        # Build client + compile server
npm run db:push      # Push Drizzle schema to SQLite
npm run db:studio    # Open Drizzle Studio
```

## Architecture

### Client-Server Communication
tRPC end-to-end type safety. Client creates typed hooks via `client/src/utils/trpc.ts` which imports `AppRouter` type from `server/trpc/router.ts`. API mounted at `/api/trpc`. Credentials included via `fetch` wrapper for cookie-based auth.

### AI Provider System
Factory pattern in `server/ai/`. `AIProvider` interface defines `generateCourse`, `generateQuiz`, `chat`, `regenerateLesson`. Provider selected per-user from settings. Prompts live in `server/ai/prompts/`.

### Auth Flow
Session token in HTTP-only SameSite=Strict cookie → tRPC middleware reads cookie → looks up session → attaches user to context. Protected procedures throw UNAUTHORIZED if no valid session.

### tRPC Router Structure
Root router in `server/trpc/router.ts` merges sub-routers: `auth`, `courses`, `lessons`, `quizzes`, `flashcards`, `settings`, `knowledgeGraph`, `media`.

### Flashcard Spaced Repetition
SM-2 algorithm. Rating mapping: again→0, hard→2, good→4, easy→5. Quality < 3 resets interval. EaseFactor floor: 1.3.

### Client Contexts
- `ThemeContext` — dark/light mode
- `StyleThemeContext` — visual style theming

### Status
Project is in early development. Client page/component shells exist. Server, database, and package configuration are not yet scaffolded.
