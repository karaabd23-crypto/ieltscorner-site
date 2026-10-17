# Active Work Ledger

Two sections: a **claims table** (append a row before touching any file;
mark `DONE` only once your PR is merged, not just opened) and **handoff
notes** (free text for anything else the other agent should know). Both
Claude Code and Hermes read this before starting ieltscorner-site work. See
`PROTOCOL.md` for the rules this ledger enforces.

## Claims

| agent | task | files/areas | branch | started UTC | status |
|---|---|---|---|---|---|
| muse-laptop | ebook-109-to-144 | ebook page count | — | — | DONE |
| hermes | publication-google-info | `public/hermes/{index,privacy,terms}.html`, `netlify.toml`, `astro.config.mjs` | `hermes/publication-google-info` | 2026-10-12 | DONE (merged #6) |
| claude | hermes-coordination-protocol | `hermes-coordination/*.md`, `CLAUDE.md` | `claude/hermes-coordination-protocol` | 2026-10-17 | IN PROGRESS |

## Handoff notes

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
