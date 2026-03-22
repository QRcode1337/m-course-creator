# V3 Gap Audit

Date: 2026-03-21

This document tracks the remaining donor-era features that are not fully active on trunk yet. It is narrower than a raw file diff: it focuses on user-facing or runtime-relevant gaps against the active `m-course-creator` app.

## Now Active On Trunk

- Course generation and saved course persistence
- Calendar surface adapted to trunk data
- Quiz generation and submission
- Flashcard study flow with SM-2 reviews
- Knowledge graph view
- Course PDF export
- Lesson AI chat
- Lesson notes with autosave
- Lesson previous/next navigation
- Course preview flow at `/preview`
- Document import flow at `/import`

## Remaining Gaps

1. Legacy donor runtime files still present as reference only
- Files such as donor `server/routers.ts`, `server/ai.ts`, `server/documentProcessor.ts`, `server/pdfGenerator.ts`, and `server/storage.ts` are not part of the active TypeScript server build.
- Some donor client files still reference the old runtime/auth layer and should be adapted or removed instead of simply routed.

## Explicit Non-Goals For Porting

- Reintroducing Manus runtime/build coupling
- Re-enabling donor monolith entrypoints instead of the active trunk router/app boundaries

## Recommended Next Step

1. Cleanup of dead donor-only files and exclusions that are no longer needed after parity is reached
