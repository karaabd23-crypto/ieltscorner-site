# Phase 1 Scaffolding — Approved
**Date:** 2026-04-16
**Branch:** phase-1-scaffolding

## What was built

The worker added a `questions` content collection to `src/content/config.ts` with a clean Zod schema (`title`, `taskType` enum email/survey, `targetCLB` number 6-10, `prompt`, `tags`, `publishedAt`). Two Astro pages were added: `src/pages/questions/index.astro` (listing page, sorted by date) and `src/pages/questions/[...slug].astro` (individual question detail page). Two placeholder `.md` files were included solely to exercise the schema and confirm routes render — they are clearly labeled as Phase 3 replacements.

## Check results

| Check | Result |
|-------|--------|
| 1. Build passes | PASS |
| 2. Astro check | PASS (all errors pre-existing on main in CelpipPracticeHub.astro, none introduced by Phase 1) |
| 3. Schema correct | PASS — all required fields present, no z.any(), no uninvited extras |
| 4. Routes render | PASS — /questions/ and both placeholder slug pages generated cleanly |
| 5. Diff scoped | PASS — no Kit API code, no email forms, no filtering UI |
| 6. No secrets | PASS |

## Flags (non-blocking)

- **Placeholder .md files in content/questions/:** Technically Phase 3 territory, but the worker labeled them unambiguously as scaffolding-only entries and they serve the legitimate purpose of proving the schema works end-to-end. Watch that they're replaced (not appended to) in Phase 3.
- **lesson-seeds deprecation warning:** Pre-existing, not introduced by this branch. Worth resolving separately.
- **TypeScript errors in CelpipPracticeHub.astro:** Pre-existing on main, unrelated to this work.

## What Phase 2 should touch

Phase 2 is email capture only. The worker should wire up the Kit API form to the `/questions/` listing page — a gate where the user submits their email before seeing questions. Phase 2 files to expect: a Kit API Netlify function (or inline fetch), a form component or inline form on the index page, and a confirmation/thank-you state. Phase 2 must NOT add real question content, filtering UI, or modify the content collection schema.
