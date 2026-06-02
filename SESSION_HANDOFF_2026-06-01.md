# Session Handoff: SEO + Retention Work (2026-06-01)

Worked independently on SEO, retention, and traffic per the GA4 data (May 4-31).
All changes build cleanly (`npm run build` -> 577 pages). Work is committed to the
branch `seo-retention-2026-06-01` (not merged to main; review and merge when ready).

Two commits on the branch:
1. `Add lesson HowTo schema, retention tools block, and de-dupe quiz prompts`
2. `Optimize hero images to WebP and add blog internal links`

## Performance + linking (commit 2)

- **Hero images: 23.6MB -> 0.5MB (-98%).** All hero background images converted
  PNG -> WebP and references repointed (`--hero-bg` url() and
  `pteCoreConfig.heroImage`). Big LCP / bounce win. Original PNGs kept as
  OG/social fallback; `ogImage` still serves PNG on purpose. Scripts:
  `scripts/optimize-hero-images.mjs`, `scripts/update-hero-refs-to-webp.mjs`.
- **Fixed a latent casing bug:** hero file was `IELTS.png` but some refs used
  `/heroes/ielts.png`, which is broken on case-sensitive hosting (Netlify).
  Now lowercase `ielts.webp` with all refs lowercased.
- **Blog internal links:** the three top blog posts by traffic/engagement
  (CELPIP speaking complete guide [340s], IELTS writing T2 structure, IELTS
  speaking part 3) now link to lessons + the CLB calculator + free test, so
  engaged readers have a path deeper in. They previously had zero such links.

### Action needed from you (commit 2)

5 pages had **pre-existing uncommitted edits** (hero headline copy changes that
were already in your working tree before this session) entangled in the same
diff hunk as the hero-bg .webp change: `src/pages/index.astro`,
`src/pages/ielts/index.astro`, `src/pages/questions/index.astro`,
`src/pages/celpip/reading/index.astro`, `src/pages/celpip/speaking/index.astro`.
I did NOT commit them (not my work to commit). Their .webp hero change IS in the
working tree. Review your own edits there and commit them when ready — the WebP
files already exist so the .webp refs will work.

## What the GA4 data told us

- Lesson pages get traffic but near-zero engagement time (many at 0s, 1-2
  sessions each). They dead-end with no path deeper into the site.
- The stickiest pages are tools and tests, not lessons: `/celpip/reading/free-test`
  (207s), `/blog/celpip-speaking-tasks-complete-guide` (340s), `/celpip/writing`
  (285s), `/clb-calculator` (56s), `/celpip` (51s), `/pte-core` (72s).
- Takeaway: CELPIP + free tests + tools retain users; auto-generated lessons do not.

## Changes made this session

1. **HowTo structured data on every lesson page.**
   `src/pages/lessons/[category]/[...slug].astro` now emits a `HowTo` JSON-LD
   schema built from the lesson's own H2 sections (when there are 2+). This can
   earn HowTo rich results and lift click-through at the same ranking position.
   Verified present in built output.

2. **Retention block on lesson pages ("Keep practicing: free tools and tests").**
   Same file. Each lesson now surfaces 2-3 of the site's stickiest destinations,
   chosen by exam (CELPIP -> free reading test + writing samples + CLB calculator;
   IELTS -> free reading test + CLB calculator; PTE -> simulator + CLB calculator).
   Goal: turn single-page visits into multi-page sessions. Click-tracked via
   existing `data-track-*` attributes (`lesson-next-step-tool`).

3. **De-duplicated robotic quiz prompts across 148 lessons.**
   ~146 root lesson `.md` files shared three identical, machine-generated quiz
   prompts with only the title swapped in (e.g. "What should you check first when
   editing <Title>?"). This is a classic unhelpful-content / low-effort signal.
   `scripts/vary-robotic-quiz-prompts.mjs` rewrote ONLY the `prompt:` text into
   varied natural phrasings. **Answer options, correctIndex, and explanations were
   not touched**, so every quiz stays correct (verified: 443 lines changed 1:1,
   no file changed more than 3 lines). Script is idempotent (deterministic by
   filename) and re-runnable; safe to delete after merge if you prefer.

4. **Google Search Console verification support (needs your token to finish).**
   `src/layouts/Layout.astro` now emits
   `<meta name="google-site-verification" ...>` when the env var
   `GOOGLE_SITE_VERIFICATION` is set. **Action required from you:** in Search
   Console -> Settings -> Ownership verification -> HTML tag, copy the token
   (the `content="..."` value) and add it as `GOOGLE_SITE_VERIFICATION` in
   Netlify env vars, then redeploy. No token was hardcoded.

## Decision I deliberately did NOT make (needs your call)

**I did not blanket-`noindex` the thin lessons.** The earlier plan floated
noindexing ~250 low-engagement lessons. On inspection they are individually
distinct (all 305 excerpts unique, bodies mostly unique) and are real indexed
assets. Removing 250+ URLs while you were away is destructive and runs against
the goal of *more* traffic, so I left it to you. If you still want to prune,
the safer version is: noindex only pages with 0 sessions AND 0 engagement over
a 90-day window, measured in GSC once verification is live (see above). The
`noindex` prop already exists on `Layout.astro` if you decide to.

## Known pre-existing issue (not introduced this session, not fixed)

`src/pages/lessons/[category]/[...slug].astro` has a TS type warning: `trackTest`
can be `"pte_core"` but `OfferLadderBlock`/`OfferSequenceBlock` type their `test`
prop as `"ielts" | "celpip" | "general"`. It's unreachable at runtime (those
blocks only render for writing/celpip-reading lessons, never PTE) and the build
passes, so I left it. Fix would be widening the component prop types.

## Still open from the traffic audit (not done this session)

- Backlink acquisition (guest posts, settlement agencies, directories) - biggest
  untapped lever, off-site work.
- Image optimization (Astro Image still not implemented).
- Standalone student case-study pages (currently just a testimonials block).
- Weekly publishing cadence (ongoing).
- Consider expanding the free-test format (highest engagement) to CELPIP writing,
  listening, speaking.
