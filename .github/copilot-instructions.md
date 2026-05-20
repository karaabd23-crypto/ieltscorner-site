# AI Agent Instructions for ieltscorner-site

**EVERY agent that opens this repo MUST read this file first and act on it.**

---

## MANDATORY CONTEXT LOADING (Do This Before Anything Else)

Before writing a single line of code, answering any question, or making any plan, silently read these files in order:

1. `memory/project-brief.md` -- project overview, architecture, deploy path, content standards
2. The newest file in `memory/chat-sessions/` (sort descending by filename) -- latest decisions, repo state, unfinished work
3. `TRAFFIC_AUDIT.md` -- full SEO and traffic audit from 2026-05-18, explains why the site lacks visitors and what to fix
4. `LESSON_EXPANSION_PLAN.md` -- the active implementation plan for expanding the lesson library (Priority 1 growth task)

If any of these files are missing, tell the user immediately and do not proceed without them.

---

## Active Priority: Lesson Library Expansion

The site's primary traffic problem is content volume. The lesson library has ~10 high-quality lessons when it needs 300+. Every new session involving lesson files, content generation, or the `/src/content/lessons/` directory MUST be guided by `LESSON_EXPANSION_PLAN.md`.

**Do not generate lessons that:**
- Link to `/essay-correction` (service is deprecated, redirects to homepage)
- Link to `/webinar` (service is deprecated, redirects to homepage)
- Use placeholder content (fill real content or do not generate the file)
- Miss required frontmatter fields (validate against `src/content/config.ts`)

**Always follow:** `LESSON_LAYOUT_STANDARD.md` for section order and `LESSON_EXCELLENCE_RUBRIC.md` for quality bar.

---

## Project Overview

**ieltscorner-ca** is an Astro 5 static site for IELTS, CELPIP, and PTE Core exam preparation, deployed to Netlify from the `main` branch on GitHub. The teacher is Kara Abdolmaleki, TESL Canada certified, based in Canada.

**Live site:** https://ieltscorner.ca
**Stack:** Astro 5, MDX, TypeScript, Netlify, Stripe, Kit (email), Cloudflare Turnstile

---

## Architecture

### Content

- Lessons: `src/content/lessons/` -- markdown/MDX with Zod-validated frontmatter (see `src/content/config.ts`)
- Blog: `src/pages/blog/` -- Astro pages (not content collection)
- Exams: `src/pages/{ielts,celpip,pte-core}/` -- hub and skill pages

### Two lesson formats

**Format A (canonical, high quality):** MDX in subdirectories `src/content/lessons/{exam}/{skill}/`
- Uses Astro components: `LessonShell`, `Callout`, `PatternTable`, `MiniQuiz`
- Rendered by `src/pages/lessons/[category]/[...slug].astro`
- **Always use this format for new lessons**

**Format B (legacy, needs fill):** Flat `.md` in `src/content/lessons/`
- Plain markdown, no Astro components
- The 50 SEO-batch files here have skeleton content that needs real content

### Routing

- `/lessons/{category}/{slug}` -- dynamic route from content collection
- `/ielts/{skill}/` -- IELTS skill hubs
- `/celpip/{skill}/` -- CELPIP skill hubs
- `/pte-core/{skill}/` -- PTE Core skill hubs
- `/blog/{slug}` -- blog articles
- `/lessons/` -- lesson library index

### Key files

| Purpose | Path |
|---------|------|
| Content schema | `src/content/config.ts` |
| Main layout | `src/layouts/Layout.astro` (also in `src/pages/_layout.astro` -- check both) |
| Lesson shell component | `src/components/lesson/LessonShell.astro` |
| Lesson generator script | `scripts/generate-lessons.mjs` |
| SEO lesson generator | `scripts/generate-seo-lessons.mjs` |
| Sitemap config | `astro.config.mjs` |
| Redirects | `netlify.toml` |
| robots.txt | `public/robots.txt` |

---

## Development Workflow

### Commands

```
npm run dev          # Astro dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run preview      # Preview production build locally
```

### Deployment

Commits to `main` trigger Netlify auto-deploy via the GitHub push workflow. Do not use local Netlify CLI unless the GitHub workflow is unavailable.

### Environment variables

Store secrets in `.env` (gitignored). See `.env.example` for required keys. Never commit real secrets.

---

## Deprecated Services -- Do Not Reference

These services are disabled. Both redirect to the homepage (302). Do not link to them in lessons, blog posts, or components.

| Service | URL | Status |
|---------|-----|--------|
| Essay correction | `/essay-correction` | Deprecated |
| Webinar | `/webinar` | Deprecated |

Active services: `/tutoring`, `/ai-feedback`, `/ebook`

---

## Content Standards

### Lessons

- Follow `LESSON_LAYOUT_STANDARD.md` section order exactly
- Meet quality bar in `LESSON_EXCELLENCE_RUBRIC.md`
- All frontmatter fields required (see `src/content/config.ts`)
- `draft: false` to publish; never leave as `true` unless explicitly staging
- CTAs at end: link to `/tutoring` or `/ai-feedback`, not deprecated services

### Blog posts

- Minimum 750 words (current average; target 2,000+ for competitive keywords)
- Include FAQPage schema where applicable
- Include breadcrumb schema
- Add "About The Instructor" section linking to `/about`
- Internal links to at least 3 related lessons

### Do not use em-dashes (`--`) in any content written for the site. Use a comma, period, or colon instead.

---

## Session Logging

After any meaningful work session, create or update a dated file in `memory/chat-sessions/YYYY-MM-DD.md` with:
- What was done
- Files changed
- Unfinished work / next steps
- Decisions made

---

## SEO Priorities (from TRAFFIC_AUDIT.md)

The site's traffic is low primarily because:
1. Lesson library is ~3% built (10 of 300+ planned lessons)
2. Blog posts are too short to rank for competitive keywords
3. No Canada/immigration-specific content despite CELPIP being an immigration test
4. No backlinks -- no pages designed to attract them
5. No local SEO pages for Canadian cities

When proposing or building any feature, consider its SEO impact. Prefer changes that add indexable content, improve internal linking, or create shareable resources.
