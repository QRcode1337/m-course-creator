# course-creatorv3 Donor Port Log

Policy:
- Trunk: `m-course-creator`
- Donor: `course-creatorv3`
- Port feature boundaries only; do not import Manus runtime/build coupling.

Date: 2026-03-22

## Imported (Accepted)

1. Course creation UI boundary (adapted to trunk API)
- `client/src/pages/CreateCourse.tsx`
- `client/src/App.tsx` (`/create` route)
- Notes: rewired to `trpc.courses.generate` + canonical `useAuth`/`trpc` client.

2. Calendar UI boundary (adapted to available trunk data)
- `client/src/pages/Calendar.tsx`
- `client/src/App.tsx` (`/calendar` + `/calendar-legacy` fallback)
- Notes: replaced donor `trpc.progress.*` calls with trunk routers:
  - `trpc.courses.list`
  - `trpc.lessons.getCompleted`
  - `trpc.flashcards.getDue`
  - `trpc.flashcards.getStats`

3. Lesson content quality prompt shaping (two-stage emphasis)
- `server/ai/prompts/courseArchitecture.ts`
- `server/ai/prompts/courseFromArchitecture.ts`
- `server/ai/prompts/courseGeneration.ts`
- Notes: aligned with real academic content goals (`Core Lesson Content`, `Key Terms`, concrete examples, reflection/synthesis questions).

4. Deployment/runtime boundary hardening
- `server/config.ts` (`CORS_ORIGIN` support)
- `server/app.ts` (CORS origin wiring)
- `.env.example` (`VITE_API_BASE_URL`, `CORS_ORIGIN`)
- `netlify.toml` (explicit Netlify build/publish + SPA fallback)

5. Trunk-native PDF export implementation
- `server/lib/pdf.ts`
- `server/trpc/routers/courses.ts`
- `client/src/pages/CourseView.tsx`
- Notes: implemented directly in trunk instead of importing donor Puppeteer export.

## Rejected / Excluded (Manus-coupled or not boundary-clean)

1. Manus Vite runtime plugin
- Rejected source pattern: `vite-plugin-manus-runtime`
- Action: removed from root `vite.config.ts`.

2. Donor Puppeteer PDF generator
- Rejected source file: `server/pdfGenerator.ts`
- Reason: adds heavier browser runtime coupling than needed for trunk deployment.

3. Donor runtime/auth substrate
- `client/src/_core/**`
- `server/_core/**`
- Reason: Manus runtime assumptions and non-trunk service coupling.

4. Donor monolithic backend entry + coupled modules
- `server/routers.ts`
- `server/ai.ts`
- `server/documentProcessor.ts`
- `server/pdfGenerator.ts`
- `server/storage.ts`
- Reason: not aligned with trunk router/factory boundaries; excluded from server TS build.

5. Donor document ingestion UI path (for now)
- `client/src/pages/ImportDocument.tsx` remains unported to active routing.
- Reason: depends on backend document/upload routes not present in trunk boundary.

## Next Candidate Ports (One-at-a-time)

1. Richer lesson chat UX
- Improve `LessonView` chat UI while reusing existing `trpc.lessons.chat` backend contract.

2. Document ingestion
- Define trunk-native router contract first (`documents.*`), then adapt donor UI.
