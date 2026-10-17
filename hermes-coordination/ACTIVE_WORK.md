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
