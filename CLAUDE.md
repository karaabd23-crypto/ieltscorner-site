# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ieltscorner.ca: an Astro 5 static site (MDX, TypeScript) for IELTS, CELPIP and PTE Core prep, run by Kara Abdolmaleki (TESL Canada). It is hosted on Netlify, with paid tools through Stripe, email through Kit and spam protection through Cloudflare Turnstile. `.github/copilot-instructions.md` is the shared agent rulebook. Its key rules are folded in below.

## Commands

```bash
npm run dev            # Astro dev server, localhost:4321
npm run build          # production build to dist/ (this is the main correctness check)
npm run astro -- check # type-check .astro/.ts files

# Lesson QA (there is no unit-test framework; these scripts are the "tests")
npm run lesson:check:standards:working   # quality gate on uncommitted lesson files
npm run lesson:qa:changed                # gate + topic audit on files changed vs a base
node scripts/enforce-lesson-quality-gate.mjs --changed --base=origin/main   # same, explicit base
npm run lesson:check:frontmatter         # frontmatter validity across all lessons
npm run celpip:calibration:check         # CELPIP writing sample/score calibration
npm run reading:check                    # CELPIP reading item quality
```

Most other `package.json` scripts are ops tooling (Telegram, Kit newsletter, CRO credentials). Their `:dry` / `--dry-run` variants do not write. Run those first.

## Deploy path

- A push to `main` runs `.github/workflows/deploy-live.yml`, which POSTs the Netlify build hook. Don't use the local Netlify CLI unless asked.
- `netlify.toml` `ignore` skips builds when `src public netlify scripts astro.config.mjs package*.json tsconfig.json` are unchanged, so docs-only commits don't deploy.
- Claude sessions work on a `claude/*` branch, and changes reach `main` through a PR.

## Architecture

**Content collections** (`src/content/config.ts`, Zod-validated):
- `lessons`: ~300 files. There are two formats:
  - *Format A (canonical, use for all new lessons):* MDX in `src/content/lessons/{celpip,ielts,shared}/...`, using `src/components/lesson/` (`LessonShell`, `Callout`, `PatternTable`, `MiniQuiz`).
  - *Format B (legacy):* flat `.md` directly in `src/content/lessons/`. Many are SEO-batch skeletons that need real content.
  - Both render through `src/pages/lessons/[category]/[...slug].astro`. `test` is normalized to uppercase by the schema. `draft: true` hides a lesson.
- `questions`: CELPIP writing tasks (`taskType: email|survey`, `targetCLB` 6-10), rendered by `src/pages/questions/[...slug].astro`.

**Pages**: `src/pages/{ielts,celpip,pte-core}/` hold exam and skill hubs. CELPIP also has city landing pages (toronto, vancouver, ...). Blog posts are plain Astro pages in `src/pages/blog/`, not a collection. There are three layouts: `Layout` (site), `LessonLayout`, and `ConversionLayout` (funnel pages).

**Offers / funnels**: offer definitions live in `src/lib/offers.ts` and `src/lib/promotionTools.ts`. Per-exam config is in `src/lib/examConfig.ts`. The CELPIP writing/reading logic (data, AI evaluator, score calibration) is in `src/lib/celpip*.mjs` and is shared by pages and functions.

**Netlify functions** (`netlify/functions/`):
- Stripe checkout and portal per product (`create-*-checkout`, `create-*-portal`) plus a single `stripe-webhook.js`.
- `validate-*-session` gates paid tools.
- `account-*` is the user account area, using Netlify Identity and Blobs.
- `evaluate-celpip-writing` and `pte-core-grade-*` do AI grading.
- Shared helpers are in `_utils/` (Stripe per product, accounts, request security).

**SEO/CRO data spine**: scheduled functions `gsc-weekly-pull.ts` and `cro-weekly-pull.ts` (via `lib/analytics-adapter.ts`, so providers are never called directly) commit weekly JSON snapshots to `cro/snapshots/` on the **`cro-data` branch only**. Read them with `git show origin/cro-data:cro/snapshots/<file>`. The `seo-analyst` subagent (`.claude/agents/`) turns them into a weekly report. See `cro/README.md`.

**SEO plumbing**: the sitemap is built in `astro.config.mjs`, and `SITEMAP_EXCLUDE` must stay in sync with `noindex` pages and the force-redirects in `netlify.toml`. 301s for dead URLs and the canonical-host rules (https, no www, celpipcorner.* aliases) live in `netlify.toml`. `public/robots.txt` blocks function endpoints. The site is recovering from a mid-2026 indexing crash (duplicate content), so avoid creating near-duplicate pages.

**Other**: `workers/telegram-bot/` is a Cloudflare Worker (wrangler). Most scheduled automation (Telegram, Kit, newsletter) runs as GitHub Actions in `.github/workflows/`, not Netlify cron. Global styles are `src/styles/global.css` and `theme-tokens.css`.

## Content rules

- New lessons follow `LESSON_LAYOUT_STANDARD.md` (title, context, Examples, clickable lesson map, How It Works, Common Mistakes, Practice Lab, Why It Matters, feedback CTA) and meet `LESSON_EXCELLENCE_RUBRIC.md`. `LESSON_EXPANSION_PLAN.md` is the active growth plan.
- Never link to `/essay-correction` or `/webinar`, which are deprecated and 302 to `/`. CTAs go to `/tutoring`, `/ai-feedback` or `/ebook`.
- No em dashes in site copy. No placeholder content: write it fully or don't create the file.
- Design taste: simple navigation, obvious CTAs, no cluttered heroes, frosted panels or red-heavy visuals.

## Project memory

`memory/project-brief.md` holds durable context, and `memory/chat-sessions/YYYY-MM-DD.md` holds dated session notes. After meaningful work, add or update a dated note (what changed, files, open items, decisions). Some handoffs also live at the repo root (e.g. `SESSION_HANDOFF_2026-06-01.md`). Check the newest of both when you need history.
