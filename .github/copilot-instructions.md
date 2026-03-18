# AI Agent Instructions for ieltscorner-site

## Persistent Memory

Before starting substantial work in a new chat, read:

1. `memory/project-brief.md`
2. The newest note in `memory/chat-sessions/`
3. `memory/session-catalog.md` when prior chat history is relevant to the task

After meaningful work, add or update a dated note in `memory/chat-sessions/` so future chats can resume with the latest decisions, verification results, and unfinished work.

For deployment in this repo, default to the GitHub push workflow on `main`. Do not use local Netlify CLI unless the user explicitly asks for it or the GitHub workflow path is unavailable.

## Project Overview

**ieltscorner-site** is an Astro 5 static site builder for IELTS and CELPIP exam preparation. It delivers structured lessons via file-based content with dynamic routing and quiz components. The site is deployed to Netlify with strict TypeScript configuration.

## Architecture & Key Patterns

### Content-First Structure
- **Lessons live in `/src/content/lessons/`** as markdown files with YAML frontmatter
- Schema defined in `src/content/config.ts` enforces: `title`, `category` (grammar|vocabulary|writing|speaking), `level`, `exam` array (IELTS|CELPIP), `excerpt`, `date`, `tags`, `draft` flag
- Example: [advanced-use-of-would.md](src/content/lessons/advanced-use-of-would.md) shows multi-section lesson format with explanation + natural/problematic examples

### Dynamic Routing with Layouts
- **Single-file lesson router**: `src/pages/lessons/[category]/[slug].astro` generates URLs like `/lessons/grammar/advanced-use-of-would/`
- **Lesson layout**: `src/layouts/LessonLayout.astro` accepts: `title`, `description`, `pill` (badge), `meta` (tags), `nav` (breadcrumbs), `videoEmbed`, `quickCheck` (JSX content), `progressPct`
- Page categories subdivide exam types: `/ielts/`, `/celpip/` organize by skill (listening, reading, writing, speaking)

### Component Conventions
- **Quiz component** (`src/components/Quiz.astro`): accepts `title` and `questions` array with `{prompt, options, correctIndex, explanation}`
- Components use **Astro-style type definitions** (Props interface in frontmatter script)
- **Utility classes** from global.css: `surface`, `stack`, `cluster`, `card`, `pill`, `shell` for layout/styling

### Data Flow
1. Markdown frontmatter → `src/content/config.ts` Zod schema validation
2. Router loads lesson via `getCollection('lessons')`
3. Lesson content passed to `LessonLayout` via `Astro.props`
4. Layout renders with optional embedded `quickCheck` JSX and quiz

## Development Workflow

### Commands
- `npm run dev` → Astro dev server at `localhost:4321`
- `npm run build` → Produces `./dist/` for Netlify deployment
- `npm run preview` → Local preview of production build
- `npm run astro -- [command]` → Raw Astro CLI (e.g., `astro check` for TypeScript validation)

### Environment variables

- Store secrets in a `.env` file at the project root or in your shell environment; the repo already has `.env` and `.env.production` in `.gitignore`.
- A template `.env.example` shows the required variables. Never check real secrets into source control.

## Deployment & Live Updates

### Why changes don't appear on ieltscorner.ca immediately

The site deploys via GitHub → Netlify. For changes to appear live:

1. **Code must be committed and pushed to main** (you did this ✅)
2. **NETLIFY_BUILD_HOOK secret must be set** in GitHub Actions (this is required)
3. **Workflow deploy-live.yml** runs on push to main and triggers Netlify

If changes aren't live after 5 minutes:
- Check GitHub Actions tab: did `Deploy live site` workflow run?
- If it failed, check for missing `NETLIFY_BUILD_HOOK` secret
- Verify Netlify build hook URL in GitHub Secrets → Actions → NETLIFY_BUILD_HOOK

### To set up live deploys (one-time)

1. Get your Netlify build hook from Netlify → Site settings → Build & deploy → Build hooks
2. Add it to GitHub: Settings → Secrets and variables → Actions → New secret
3. Name: `NETLIFY_BUILD_HOOK` | Value: the full hook URL
4. Next push to main will trigger automatic deploy

## Monetization & AdSense

### Google AdSense setup

- Template prepared in `src/layouts/Layout.astro` with placeholder `ca-pub-YOUR_ADSENSE_ID`
- Ad slot already added to header (`<div class="ad-slot">Ad placeholder (AdSense)</div>`)
- Replace placeholder with your actual AdSense client ID once approved

### To enable AdSense

1. Get approved at google.com/adsense
2. Copy your client ID (ca-pub-xxxxx)
3. In [src/layouts/Layout.astro](src/layouts/Layout.astro#L22): replace `ca-pub-YOUR_ADSENSE_ID` with your real ID
4. Deploy (push to main)
5. AdSense script will load and start serving ads

## Common Tasks & Patterns

### Adding a New Lesson
1. Create `.md` file in `src/content/lessons/` with required frontmatter
2. Router auto-generates page at `lessons/[category]/[slug]/`
3. Use `<Quiz>` component inside markdown via Astro integration
4. Set `draft: false` to publish; `draft: true` to hide

### Extending Routes
- New skill pages follow pattern: `src/pages/[exam]/[skill]/index.astro` (e.g., `writing/index.astro`)
- Use `LessonLayout` for consistent header/footer styling
- Link between sections via `nav` prop in layout

### TypeScript & Config
- Extends strict `astro/tsconfigs/strict`; includes `.astro/types.d.ts` and all files except `dist`
- Component props validated at build time; use `as Props` cast if needed for type safety

## Project-Specific Decisions

- **No integrations configured** in `astro.config.mjs` (no React/Vue); pure Astro components + markdown
- **Zod schema** enforces content structure; new fields require schema updates in `config.ts`
- **Draft flag** used for content staging (not branch-based); set in frontmatter
- **Exam array** supports both IELTS and CELPIP simultaneously; lessons can serve both exams

## File Reference Guide

- **Router**: `src/pages/lessons/[category]/[slug].astro`
- **Layout template**: `src/layouts/LessonLayout.astro`
- **Quiz component**: `src/components/Quiz.astro`
- **Content schema**: `src/content/config.ts`
- **Styles**: `src/styles/global.css` (design tokens: `--s-*` spacing, `--*-font` typography)
- **Build config**: `netlify.toml`, `tsconfig.json`

## Testing & Debugging

- Use `npm run astro -- --check` to validate TypeScript without building
- Browser DevTools for quiz interactivity debugging
- Netlify deploy previews for feature branch testing
- Verify content frontmatter against schema in `src/content/config.ts` when adding lessons
