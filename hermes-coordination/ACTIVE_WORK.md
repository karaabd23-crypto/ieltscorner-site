# Active Work Ledger

Two sections: a **claims table** (append a row before touching any file;
set `status` to `DONE` as the last edit in your own PR — see
`PROTOCOL.md` step 5 — so it's true on `main` exactly when that PR merges)
and **handoff notes** (free text for anything else the other agent should
know). Both Claude Code and Hermes read this before starting
ieltscorner-site work. See `PROTOCOL.md` for the rules this ledger
enforces.

Timestamps are full UTC (`YYYY-MM-DDThh:mmZ`), not just a date — the
staleness rule in `PROTOCOL.md` needs the time to be checkable. Update
`last updated UTC` whenever you touch your own row, including the DONE
edit. Rows from before this column existed are already `DONE`, where
staleness doesn't apply, so they're left as a bare date rather than
backfilled with a time nobody recorded.

## Claims

| agent | task | files/areas | branch | started UTC | last updated UTC | status |
|---|---|---|---|---|---|---|
| muse-laptop | ebook-109-to-144 | ebook page count | — | — | — | DONE |
| hermes | publication-google-info | `public/hermes/{index,privacy,terms}.html`, `netlify.toml`, `astro.config.mjs` | `hermes/publication-google-info` | 2026-10-12 | 2026-10-12 | DONE (merged #6) |
| hermes | ebook-pagecount-109-remaining | `src/pages/celpip/index.astro`, `src/pages/celpip/reading/index.astro`, `src/pages/ebook/thank-you/index.astro`, `src/lib/promotionTools.ts`, `scripts/send-newsletter-digest.mjs`, `hermes-coordination/ACTIVE_WORK.md` | `hermes/ebook-pagecount-fix-20261031` | 2026-10-31T04:50Z | 2026-10-31T04:56Z | DONE (PR #10) |
| claude | hermes-coordination-protocol | `hermes-coordination/*.md`, `CLAUDE.md` | `claude/hermes-coordination-protocol` | 2026-10-17T21:49Z | 2026-10-17T21:56Z | DONE (merged #7) |

## Handoff notes

- 2026-10-17 · claude · Codex's review on #7 caught a real bug in the first
  draft of this protocol: "mark DONE only once merged" had no way to
  actually close a claim, since editing `ACTIVE_WORK.md` after merge would
  itself need its own claim + PR, forever. Fixed by making the DONE edit
  part of the same PR as the work (see `PROTOCOL.md` step 5) instead of a
  follow-up — and added `last updated UTC` so the 24h staleness rule is
  actually checkable.
- 2026-10-17 · claude · Set up the two-way claim/handoff structure in this
  file and tightened `PROTOCOL.md` (branch + PR for every agent, no direct
  pushes, a staleness rule, this notes section) at Kara's request, so Hermes
  and Claude Code stop colliding on ieltscorner-site work. Going forward,
  check this file before starting anything here and leave a note on
  anything the other side should know.
- 2026-10-17 · claude (seo-analyst) · Weekly SEO report published to
  `reports/seo/2026-41.md` on the `cro-data` branch (data branch only, not
  `main`). Two revenue pages (`/ai-feedback/`, `/celpip/writing/`) are stuck
  "Crawled - not indexed" in Search Console — see that report's §1 and §5.
  Running list of open SEO items: `reports/seo/open-items.md` on `cro-data`.
- 2026-10-31T04:56Z · hermes · Page-count cleanup (PR #10). The earlier
  `ebook-109-to-144` claim was marked DONE but only covered the `/ebook/`
  product page: five "109 pages" strings were still live on 2026-10-31
  (`/celpip/` x1, `/celpip/reading/` x1, `/ebook/thank-you/` x1,
  `promotionTools.ts` x1, digest email copy x1). Worse, the 2026-10-30
  15:00 UTC scheduled Kit digest shipped "109 pages" to the list from
  `861814b4b`. The delivered PDF really is 144 pages, so the fix is the
  copy, not the file. PR #10 is string-only (5 files, +5/-5) and its merge
  deadline is the next scheduled send, **2026-11-03 15:00 UTC**. Two
  runnable guards live outside the repo at
  `/data/kay-coordination/product-pages-20261027/check-ebook-claims.py`
  (`--include-noindex`, currently 4 FAIL pages) and
  `check-newsletter-claims.py` (exit 1 on `main` today); both should go
  green after deploy. If you are touching any of those five files, PR #10
  supersedes your copy - rebase rather than re-edit the strings.
