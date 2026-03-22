# m-course-creator (Production Trunk)

Self-owned AI course platform (Fly.io backend + Netlify frontend).  
Canonical base: `m-course-creator`.

`course-creatorv3` is used only as a donor/reference repo. Manus runtime coupling is not part of trunk runtime.

## Stack

- Client: Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style UI
- API: Express + tRPC
- Database: SQLite + Drizzle ORM + better-sqlite3
- AI: OpenAI + Ollama provider abstraction with deterministic fallback generation

## Runtime Boundaries

- Frontend API target is controlled by `VITE_API_BASE_URL` in [`client/src/main.tsx`](client/src/main.tsx).
- All app data operations go through `/api/trpc` on your backend.
- Backend CORS policy can be locked to Netlify origin via `CORS_ORIGIN`.

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

Server:
- `PORT` (default: `3001`)
- `DATABASE_PATH` (default: `./data/app.db`)
- `CORS_ORIGIN` (optional, recommended in production: your Netlify origin)
- `AI_PROVIDER` (`openai` or `ollama`, default: `openai`)
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OLLAMA_BASE_URL` (default: `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default: `llama3.1:8b`)
- `OLLAMA_API_KEY` (optional)

Frontend:
- `VITE_API_BASE_URL` (empty in local same-origin/proxy setups; set to Fly backend URL on Netlify)

## Deploy: Fly.io Backend

This repo includes [`fly.toml`](fly.toml).

1. Set secrets/env on Fly (example)

```bash
fly secrets set OPENAI_API_KEY=... CORS_ORIGIN=https://<your-site>.netlify.app
```

2. Deploy

```bash
fly deploy
```

3. Verify backend

```bash
curl https://manus-course-backend-1774135937.fly.dev/api/health
```

## Deploy: Netlify Frontend

This repo includes [`netlify.toml`](netlify.toml) with:
- build command: `npm run build:client`
- publish dir: `dist/client`
- SPA fallback redirect to `/index.html`

Set this Netlify env var:
- `VITE_API_BASE_URL=https://manus-course-backend-1774135937.fly.dev`

Then deploy the site normally from this repo.

## Current Product Flow (Audited)

- Course creation: `/` (wizard) and `/create` call `trpc.courses.generate`
- Two-stage generation: architecture + full lessons in `server/trpc/routers/courses.ts`
- Lesson view: chat + regenerate in `server/trpc/routers/lessons.ts`
- Quiz flow: generate + submit in `server/trpc/routers/quizzes.ts`
- Flashcards: initialize + due queue + SM-2 rating in `server/trpc/routers/flashcards.ts`
- PDF export: server-side course PDF generation in `server/lib/pdf.ts` via `trpc.courses.exportPdf`
- Persistence: SQLite at `DATABASE_PATH` with Drizzle schema in `server/db/schema.ts`

## Donor Porting Log

See [`docs/v3-port-log.md`](docs/v3-port-log.md) for imported donor features and explicitly rejected Manus-coupled code.
