# Trunk Audit (m-course-creator)

Date: 2026-03-22  
Canonical base: `m-course-creator`  
Donor reference: `course-creatorv3` (read-only)

## 1) Course Creation

Status: Working.

- UI entrypoints:
  - `client/src/pages/Home.tsx` via `CourseSetupWizard`
  - `client/src/pages/CreateCourse.tsx` (ported donor UI)
- API path: `trpc.courses.generate`
- Server flow: `server/trpc/routers/courses.ts`
  - Generates architecture first (`generateCourseArchitecture`)
  - Generates full course from architecture (`generateCourseFromArchitecture`)
  - Persists courses/chapters/lessons/glossary in SQLite transaction

Notes:
- `CreateCourse` maps donor-only knobs (`courseLength`, `lessonsPerChapter`) into `assessmentAnswers` to preserve backend contract.

## 2) Lesson Generation + Chat

Status: Working.

- Lesson read + context: `trpc.lessons.getById`
- Regeneration: `trpc.lessons.regenerate`
- Lesson chat: `trpc.lessons.chat`
- UI: `client/src/pages/LessonView.tsx`

Notes:
- Chat history is currently session/local page state and not persisted server-side.

## 3) Quiz Flow

Status: Working.

- Generate quiz: `trpc.quizzes.generate`
- Retrieve by lesson: `trpc.quizzes.getByLessonId`
- Submit + score: `trpc.quizzes.submit`
- UI: `client/src/components/Quiz.tsx`

## 4) Flashcards + Spaced Repetition

Status: Working.

- Seed from course glossary: `trpc.flashcards.initializeFromCourse`
- Due queue: `trpc.flashcards.getDue`
- Stats: `trpc.flashcards.getStats`
- Rating/SM-2 update: `trpc.flashcards.rate`
- UI:
  - Library: `client/src/pages/FlashcardLibrary.tsx`
  - Study: `client/src/pages/FlashcardStudy.tsx`
  - Calendar metrics: `client/src/pages/Calendar.tsx`

## 5) Persistence

Status: Working.

- DB driver: `better-sqlite3`
- ORM: Drizzle
- Schema: `server/db/schema.ts`
- Initialization/migration guard: `server/db/ensure-schema.ts`
- Path control: `DATABASE_PATH` in `server/config.ts`
- Fly mount target: `/data/app.db` via `fly.toml`

## 6) Deployment Boundary Verification

Status: Clean and explicit.

- Frontend runtime target:
  - `client/src/main.tsx` uses `VITE_API_BASE_URL` + `/api/trpc`
- Backend CORS control:
  - `server/config.ts` exposes optional `CORS_ORIGIN`
  - `server/app.ts` applies `cors({ origin: config.corsOrigin ?? true, credentials: true })`
- Netlify build config:
  - `netlify.toml` sets build/publish + SPA fallback

## 7) Gaps / Known Limitations

- Auth is currently local/stubbed (`server/trpc/routers/auth.ts`) for single-user/self-hosted workflow.
- Document ingestion/upload from donor has not been ported yet due missing clean backend boundary in trunk.
