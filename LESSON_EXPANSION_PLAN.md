# Lesson Expansion Plan: Suggestion 1 Implementation

**Created:** 2026-05-18
**Goal:** Grow the published lesson library from ~10 to 300+ lessons to capture long-tail organic traffic.
**Status:** In progress

---

## Why This Is Priority 1

Each lesson targets a specific low-competition keyword (e.g., "how to use passive voice in IELTS writing", "subject-verb agreement CELPIP task 2"). Individual competition is near zero. At 300 lessons, the cumulative traffic from long-tail keywords becomes significant. These pages also strengthen the site's topical authority for core exam prep queries, which helps hub and blog pages rank higher too.

---

## Current State

- Lesson content collection: `src/content/lessons/`
- Published `.mdx` files (canonical, used by site): `src/content/lessons/ielts/writing/` -- 10 files
- Published `.md` files (flat, used by `/lessons/[category]/[slug]` router): ~60 files in root of lessons dir (seo-batch + celpip-reading files)
- Total target: 300+ published lessons across all categories and exams

---

## Two Lesson Formats in Use

### Format A: MDX in subdirectory (canonical quality format)
- Location: `src/content/lessons/{exam}/{skill}/`
- Rendered by: `src/pages/lessons/[category]/[...slug].astro`
- Uses Astro components: `LessonShell`, `Callout`, `PatternTable`, `MiniQuiz`
- Example: `src/content/lessons/ielts/writing/07-abstract-noun.mdx`
- Quality level: High -- rich formatting, interactive components
- **This is the target format for all new lessons**

### Format B: Flat .md in lessons root (legacy/SEO batch)
- Location: `src/content/lessons/`
- Plain markdown, no Astro components
- Quality level: Low -- skeleton content, placeholder text
- **These need content fill-in, not new generation**

---

## Target Topic Matrix

### IELTS Lessons (target: 120 lessons)

| Skill | Topics | Levels | Count |
|-------|--------|--------|-------|
| Writing | Task 1 academic, Task 1 GT letter, Task 2 all essay types, cohesion, lexical resource | B1, B2, C1 | 30 |
| Speaking | Part 1 topics, Part 2 cue card, Part 3 abstract questions, fluency, pronunciation | B1, B2, C1 | 30 |
| Reading | True/False/NG, matching headings, sentence completion, multiple choice, time management | B1, B2, C1 | 30 |
| Listening | Section strategies, distractor detection, note-taking, maps/diagrams | B1, B2, C1 | 30 |

### CELPIP Lessons (target: 100 lessons)

| Skill | Topics | Levels | Count |
|-------|--------|--------|-------|
| Writing | Task 1 email types, Task 2 survey response, grammar for CLB 9, tone control | B1, B2, C1 | 25 |
| Speaking | Tasks 1-8 strategies, confidence, fluency recovery | B1, B2, C1 | 25 |
| Reading | Keyword matching, inference, paragraph purpose, time control | B1, B2, C1 | 25 |
| Listening | Note capture, speaker intention, recovery, prediction | B1, B2, C1 | 25 |

### Grammar Lessons (target: 60 lessons, both exams)

Core grammar points from A2 to C1 with exam-specific application examples. Topics drawn from `scripts/generate-leech-lessons.mjs` topic bank.

### Vocabulary Lessons (target: 30 lessons, both exams)

Topic-based vocabulary sets: academic verbs, collocations, linking words, social issues, opinion language.

---

## Implementation Steps

### Step 1: Run the improved generator (done)
The script `scripts/generate-lessons.mjs` was improved on 2026-05-18. Run it to generate skeleton MDX files for all planned lessons. Files go to `src/content/lessons/{exam}/{skill}/`.

### Step 2: Review generated files
Each generated file is a complete, valid MDX lesson. Review a sample (5-10 files) to confirm quality before committing.

### Step 3: Commit and deploy
Standard commit to main. Netlify build auto-triggers. Sitemap regenerates automatically (includes new URLs).

### Step 4: Fill the legacy flat .md files
The 50 SEO-batch files in the lessons root have placeholder content. Fill each with real lesson content following `LESSON_LAYOUT_STANDARD.md`. Do 10 per week.

### Step 5: Build lesson series
Once 100+ lessons exist, create "series" index pages that group related lessons (e.g., "Complete IELTS Writing Task 2 Series" linking to 8 related lessons). These series pages rank for broader queries.

---

## Quality Standards for Every Lesson

Reference: `LESSON_LAYOUT_STANDARD.md` and `LESSON_EXCELLENCE_RUBRIC.md`

**Required sections (in order):**
1. Short title with target keyword
2. One-line excerpt (used as meta description)
3. Intro context paragraph (plain English, one breath)
4. Examples table (weak vs strong, with explanation)
5. How It Works (bullets/cards, short sentences)
6. Common Mistakes (real errors + fixes)
7. Practice Lab (interactive, immediate feedback)
8. Why It Matters (score impact)
9. Get Feedback CTA (link to tutoring or AI feedback -- NOT essay correction or webinar, both deprecated)

**Frontmatter requirements:**
- `title`: keyword-rich, e.g., "Passive Voice in IELTS Writing Task 2"
- `category`: must match one of grammar, vocabulary, writing, speaking, listening, reading
- `level`: A1 through C2
- `ieltsBand`: matching score range
- `clb`: matching CLB range
- `exam`: array -- IELTS, CELPIP, or both as appropriate
- `excerpt`: 150-160 chars for meta description use
- `tags`: at least 4 tags including exam name, skill, level
- `draft: false` to publish

**Do not link to:**
- `/essay-correction` (deprecated, redirects to homepage)
- `/webinar` (deprecated, redirects to homepage)

---

## Tracking Progress

Update this table as batches are completed:

| Batch | Topics | Status | Date |
|-------|--------|--------|------|
| IELTS Writing (existing) | 10 lessons | Complete | 2026-02-28 |
| IELTS/CELPIP SEO batch | 50 lessons (skeleton) | Skeletons done, content TBD | 2026-03-25 |
| Improved generator batch | 200+ lessons | In progress | 2026-05-18 |
| Legacy .md content fill | 50 files | Not started | - |
| Grammar series | 60 lessons | Not started | - |
| Vocabulary series | 30 lessons | Not started | - |
