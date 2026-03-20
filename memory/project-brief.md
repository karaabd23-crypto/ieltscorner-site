# IELTS Corner Project Brief

## Purpose

`ieltscorner-site` is an Astro 5 site for IELTS and CELPIP preparation. It mixes content publishing, exam prep funnels, paid writing tools, webinar/tutoring conversion paths, and Netlify-hosted functions.

## Product Priorities

- Grow the IELTS/CELPIP prep site with clearer UX and lower click depth.
- Keep monetized flows visible, especially the writing offer and guided-session funnels.
- Preserve fast local testing for admin-only or paid flows.
- Prefer direct implementation over abstract planning.

## User Preferences

- Keep navigation simple and reduce maze-like flows.
- Do not reintroduce cluttered heroes, frosted panels, or red-heavy visuals unless explicitly requested.
- Keep important CTAs obvious.
- Favor practical, low-friction solutions over elaborate systems.

## Architecture

- Content lives in `src/content/lessons/` as markdown with schema validation in `src/content/config.ts`.
- Lessons render through Astro routes under `src/pages/lessons/`.
- Netlify functions live in `netlify/functions/`.
- Global styling and layout behavior live mostly in `src/styles/global.css` and layout/component files.

## Content Standards

The current lesson standard expects:

1. Visible lesson title
2. Context paragraph
3. `## Examples`
4. Clickable lesson map block
5. `## How It Works`
6. `## Common Mistakes`
7. `## Practice Lab`
8. `## Why It Matters`
9. Feedback CTA

Avoid the older `## Lesson Map`, `## Core Lesson`, duplicated lesson-map intro lines, and generic section-lede banners.

## Deploy Path

- Production site: `https://ieltscorner.ca`
- Repo branch for live updates: `main`
- Live deployment path: GitHub push to `main` triggers `.github/workflows/deploy-live.yml`, which calls the Netlify build hook.
- Local Netlify CLI auth is not required if the GitHub Actions secret `NETLIFY_BUILD_HOOK` is already configured.
- Default deploy rule: always use the GitHub push workflow unless the user explicitly asks for a different deploy path.

## Useful Commands

- `npm run dev`
- `npm run build`
- `npm run lesson:check:standards:working`
- `npm run lesson:qa:changed`
- `npm run session:starter`

## Working Rules For Future Chats

- **MANDATORY FIRST ACTION**: At the start of every new chat, silently read: (1) this file, (2) the newest file in `memory/chat-sessions/`, and (3) `memory/session-catalog.md`. Do not skip this. Do not summarize it back to the user unless asked.
- After meaningful work, update or create a dated note in `memory/chat-sessions/` and run `npm run session:index`.
- If cross-session history matters, refresh and read `memory/session-catalog.md`.
- Record important decisions, validations, and unfinished work in a dated session note.
- Treat `.cache/` as local runtime state, not project source.
- Use commit + push to `main` as the default deployment method. Do not use local Netlify CLI unless the user explicitly asks for it or the GitHub workflow is unavailable.
