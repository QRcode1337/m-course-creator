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

6. Preview flow
- `server/trpc/routers/courses.ts` (`courses.preview`)
- `client/src/pages/CreateCourse.tsx`
- `client/src/pages/PreviewCourse.tsx`
- `client/src/App.tsx` (`/preview` route)
- Notes: preview is trunk-native and reuses the generated architecture to create the saved course.

7. Richer lesson workspace
- `client/src/components/AIChatBox.tsx`
- `client/src/pages/LessonView.tsx`
- `server/trpc/routers/notes.ts`
- Notes: upgraded lesson chat UI, added autosaved lesson notes, and added previous/next lesson navigation.

8. Document ingestion
- `server/app.ts` (`/api/documents/upload`)
- `server/trpc/routers/documents.ts`
- `server/documentProcessor.ts`
- `client/src/pages/ImportDocument.tsx`
- `client/src/App.tsx` (`/import` route)
- Notes: implemented as a trunk-native local upload + extraction flow on the active SQLite stack.

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

5. Donor component showcase and legacy helper surfaces
- `client/src/pages/ComponentShowcase.tsx`
- some excluded donor-only UI helpers
- Reason: demo/reference surfaces, not product-critical runtime features.

## Next Candidate Ports (One-at-a-time)

1. Final donor parity cleanup
- Remove or adapt remaining excluded donor-only files that are no longer needed.
