# SEO Content Gap Map (IELTS + CELPIP)

Last updated: 2026-03-14

## Goal

Build a topic-cluster structure that can compete for high-intent IELTS and CELPIP queries by combining:

- hub pages (exam and skill level),
- task-level strategy pages,
- lesson-level supporting content,
- conversion pages (tutoring, feedback, samples).

## Competitive Pattern Summary

Observed pattern from top IELTS competitors (for example, IELTS Liz):

- Deep task-level pages for specific searches (not just broad exam overviews).
- Dense internal linking between topic pages, models, tips, and FAQs.
- Evergreen “master” pages that aggregate related subtopics.
- Repeated intent coverage for writing/speaking tasks and recurring topic sets.

For CELPIP official ecosystem pages, strongest signal is task clarity and trust framing; opportunity is combining official-format clarity with practical strategy depth.

## Current Coverage Snapshot

### Implemented in this repo

- Core SEO layout support with per-page structured data and noindex controls.
- IELTS skill hubs:
  - /ielts/writing
  - /ielts/speaking
  - /ielts/reading
  - /ielts/listening
- CELPIP skill hubs:
  - /celpip/writing
  - /celpip/speaking
  - /celpip/reading
  - /celpip/listening
- High-intent strategy pages:
  - /blog/ielts-writing-task-2-structure
  - /blog/ielts-speaking-part-2-cue-card
  - /blog/ielts-speaking-part-1-topics
  - /blog/ielts-reading-question-types
  - /blog/celpip-writing-task-1-email
  - /blog/celpip-writing-task-2-survey-response
  - /blog/celpip-speaking-task-1
  - /blog/celpip-sample-answers
- Dynamic lesson-page cross-links to strategy guides in /src/pages/lessons/[category]/[...slug].astro.

### Remaining gaps

- Not enough “master” pages for recurring topic sets (for example, IELTS writing topics, IELTS speaking topics by year, CELPIP writing prompts bank pages).
- Thin article depth in IELTS listening and IELTS reading sub-intents.
- Limited evidence-style pages (case studies, score-improvement breakdowns, before/after writing samples).
- Backlink authority still required; on-site work alone will not close competitive gap globally.

## Prioritized Backlog

Priority scale:

- P1: High-intent pages likely to drive ranking and qualified traffic.
- P2: Supporting cluster pages to strengthen topical authority.
- P3: Trust/conversion support pages.

### P1: Immediate content targets

1. /blog/ielts-writing-task-1-academic-guide
2. /blog/ielts-writing-task-1-general-training-letter
3. /blog/ielts-writing-task-2-opinion-essay
4. /blog/ielts-writing-task-2-discussion-essay
5. /blog/ielts-writing-task-2-advantages-disadvantages
6. /blog/ielts-writing-task-2-problem-solution
7. /blog/ielts-speaking-part-3-questions-guide
8. /blog/ielts-listening-question-types
9. /blog/ielts-listening-common-traps
10. /blog/celpip-writing-task-1-templates
11. /blog/celpip-writing-task-2-templates
12. /blog/celpip-speaking-task-2-opinion-strategy
13. /blog/celpip-speaking-task-5-comparing-options
14. /blog/celpip-reading-question-types
15. /blog/celpip-listening-question-types

### P2: Cluster-depth targets

1. /blog/ielts-band-descriptors-writing-explained
2. /blog/ielts-band-descriptors-speaking-explained
3. /blog/ielts-common-writing-mistakes-band-6-to-7
4. /blog/ielts-speaking-topic-ideas-2026
5. /blog/ielts-essay-ideas-by-topic
6. /blog/celpip-clb-descriptors-writing-explained
7. /blog/celpip-clb-descriptors-speaking-explained
8. /blog/celpip-writing-mistakes-clb-8-to-9
9. /blog/celpip-speaking-fluency-drills
10. /blog/celpip-email-tone-examples

### P3: Trust and conversion support

1. /success-stories/ielts-writing-band-jump-case-study
2. /success-stories/celpip-writing-clb-improvement-case-study
3. /blog/how-ielts-celpip-tutoring-sessions-work
4. /blog/essay-correction-process-and-turnaround
5. /blog/how-to-use-ai-writing-feedback-effectively

## Internal Linking Rules (Execution Standard)

For every new page:

- Add at least 3 internal links to relevant hubs.
- Add at least 2 links to sibling task-level pages.
- Add at least 1 link to conversion page (tutoring, essay correction, or AI feedback).
- Ensure at least 5 existing pages link back to the new page.

Minimum linking targets by section:

- IELTS writing pages must link to /ielts/writing and /lessons/ielts/writing.
- IELTS speaking pages must link to /ielts/speaking and /lessons/ielts/speaking.
- CELPIP writing pages must link to /celpip/writing and /celpip/writing/ai-feedback.
- CELPIP speaking pages must link to /celpip/speaking and /lessons/celpip/speaking.

## KPI Tracking (Post-publish)

Track in Search Console weekly:

- Impressions by URL and query cluster.
- Average position trends per task-level page.
- CTR changes after title/meta revisions.
- Pages with impressions but low CTR (rewrite snippets first).
- Pages with good CTR but low impressions (add internal links and supporting content).

## Note

This roadmap improves topical authority and intent matching, but first-page global outcomes also depend on:

- link authority,
- brand demand,
- content freshness cadence,
- user engagement signals.
