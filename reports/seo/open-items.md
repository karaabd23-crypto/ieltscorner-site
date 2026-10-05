# SEO Open Items Ledger

Running list of recurring findings from `reports/seo/*.md`, so each week's
report doesn't have to re-derive status from memory. Updated by the
`seo-analyst` agent whenever it produces a weekly report. "Weeks flagged"
counts are sourced from the cited report's own text where this ledger's
first entry postdates the finding — see the Source column.

| # | Item | First flagged | Weeks flagged (through 2026-40) | Status | Source |
|---|---|---|---|---|---|
| 1 | GSC indexing is 0 of 477 submitted URLs, every week since the dedupe fix merged 2026-07-25, with 0 sitemap errors/warnings — needs the GSC Page Indexing (Coverage) report + URL Inspection tool run manually; the automated snapshot can't diagnose further. | ~wk 30 (per `reports/seo/2026-39.md`, which states "ten consecutive post-fix weekly pulls") | 29-40 (12 snapshots, 11 weekly reports recommending the manual check) | **OPEN — highest priority.** Never actioned. | `reports/seo/2026-39.md`, `reports/seo/2026-40.md`, `cro/snapshots/gsc-2026-{29..40}.json` |
| 2 | Non-canonical `http://ieltscorner.ca/` homepage dominates GSC impressions/position over the canonical `https://` URL; no `[[redirects]]` rule in `netlify.toml` forces `http://` → `https://` (only the alias domains celpipcorner.com/.ca redirect). | ~wk 35 (per `reports/seo/2026-39.md`, "fifth week flagged" as of wk 39) | 35-40 (6 weeks) | **OPEN.** Confirmed still missing directly in `netlify.toml` on `main` as of 2026-10-05, even after this week's unrelated 48-rule redirect batch (item #4). Gap in wk 40: https 8 impr/pos 30.4 vs. http 62 impr/pos 9.6. | `reports/seo/2026-39.md`, `reports/seo/2026-40.md`, `netlify.toml` |
| 3 | AI feedback (and intermittently subscription) checkout clicks show visits every week with 0 (or near-0) GA4 conversion events — originally flagged as a possible tracking-instrumentation gap. | ~wk 37-38 (per `reports/seo/2026-39.md`, "at least three weeks running" as of wk 39) | 38-40 directly verified from snapshots (43→0, 35→0, 36→0); subscription 0 in 39 and 40, 1 event in 38 | **OPEN, but narrowed this week.** Read the actual code on 2026-10-05: `GaConversionBridge.astro`'s `.hub-checkout-btn` / `[data-reading-checkout="true"]` / `#reading-hub-start-checkout` selectors do match real buttons in `CelpipPracticeHub.astro` and `celpip/reading/index.astro`, and both pages load the bridge via `Layout.astro`. No obvious selector/markup mismatch at the code level. Next step is a live GA4 Realtime/DebugView check while clicking the button, not another code read. | `reports/seo/2026-39.md`, `reports/seo/2026-40.md`, `src/components/GaConversionBridge.astro`, `src/components/CelpipPracticeHub.astro`, `src/pages/ai-feedback.astro` |
| 4 | GSC Pages report (2026-09-20) showed 24 dead URLs 404ing plus 5 "other 4xx" hits on `/.netlify/functions/*`. | wk 40 (new this week) | 1 | **DONE 2026-10-04.** Commit `e7ac102` ("Fix GSC 404s: 301 dead URLs to live hubs, block function endpoints in robots") added 48 redirect rules + 1 robots.txt disallow line. Landed inside this week's data window, so the wk 40 GSC snapshot (data through ~10-01/02) predates any crawl effect — check the next Pages report for the 404 count to drop. | `reports/seo/2026-40.md`, commit `e7ac102` |
| 5 | Backlinks are the longer-term authority gap once indexing recovers. | pre-dates this ledger | ongoing, not counted weekly by design | **OPEN, standing.** Deliberately not repeated in every weekly report per the `seo-analyst` agent's own rule ("say so once and point to `BACKLINK_OUTREACH_KIT.md` — don't repeat it every week"). Listed here so it isn't lost. | `BACKLINK_OUTREACH_KIT.md`, `reports/seo/2026-39.md` |
| 6 | Week-40 GA4 traffic spike (pageviews +81%, visitors +144%) coincided with 0 organic clicks, a dataset-high 91.2% bounce rate, and a 12.3s avg. session duration — looks more like bot/referral traffic than real growth. | wk 40 (new this week) | 1 | **OPEN — needs a traffic-source check.** Not diagnosable from the snapshot schema (no channel/source breakdown field); needs a direct GA4 look. | `reports/seo/2026-40.md` |

## How to update this ledger

- When a report confirms an item is still open, bump "Weeks flagged" and
  update Status with anything new learned that week (don't just repeat
  last week's text).
- When an item is fixed and a later GSC/GA4 snapshot confirms the effect
  (not just that a commit landed), mark it **RESOLVED \<week\>** and keep
  the row for history rather than deleting it.
- Add a new row the first time a finding recurs or looks likely to recur;
  don't add one-off observations that won't be checked again.
