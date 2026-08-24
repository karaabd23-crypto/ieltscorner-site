# CRO env scope fix — 2026-08-24

Deferred infra fix from `cro/README.md` ("Where the provider credential lives"):
narrow `ANALYTICS_API_KEY` to the `builds` scope once the `cro-config` Blobs
store is confirmed seeded. Result: **not applied — Step 1 verification was
inconclusive, so no change was made**, per the task's own rule ("if
verification is inconclusive prefer doing nothing and reporting it").

## Step 1 — verify seeding (mandatory gate)

**Outcome: could not confirm via Netlify. Corroborating evidence found via
git/GitHub, but the mandatory primary check (the Netlify function log line)
was inaccessible.**

What was checked:

- **Netlify connector (function logs):** The Netlify MCP connector reports as
  `connected: true` / `enabledInChat: true` for this org, but no Netlify tools
  were ever exposed to this session — repeated `ToolSearch` queries (`netlify`,
  `deploy`, `site`, `env var`, `logs`, `blob store`, `project services`, exact
  guessed tool names, etc.) all returned zero matching tools after the server
  finished connecting. This session runs as a scheduled/headless task, and
  interactively-authenticated MCP connectors are documented to sometimes be
  absent in that mode. Net effect: **I had no way to read function logs, list
  env vars, or read the `cro-config` blob store this run.** I did not attempt
  to work around this (e.g. guessing at API tokens or hitting Netlify's API
  directly) since the credential/token for that isn't available to this
  session either, and the task specified checking "via the Netlify connector."

- **Corroborating check (git, available):** `origin/cro-data` has commit
  `chore(cro): weekly snapshot 2026-34` (98 lines, `cro/snapshots/2026-34.json`
  only), with `generatedAt: 2026-08-24T06:00:40.383Z` and
  `range: 2026-08-17..2026-08-23` — consistent with a normal Monday 06:00 UTC
  run of `cro-weekly-pull` executing today. This is real evidence the
  scheduled function ran and completed successfully today (it reached GA4,
  computed metrics, and committed), which is a necessary precondition for the
  self-seed to have fired. It is **not** proof the seed line was written,
  since `resolveAnalyticsApiKey()` only logs
  `[analytics-credential] seeded "analytics-api-key" in "cro-config"` the
  first time the blob's contents differ from the env var — a successful pull
  is possible whether or not that specific log line appeared.

Because the one mandatory, primary signal (the log line, via Netlify) could
not be checked at all, and a secondary signal is not a substitute for it, this
gate is **not satisfied**. Per the task's explicit instruction, I stopped here
and changed nothing.

## Step 2 — narrow `ANALYTICS_API_KEY` scope

**Not attempted.** Gated on Step 1, which did not pass. No env var scopes were
read or modified. The site (`bab5a495-e355-48be-81e2-bd41b09fba6e`) should
still have `ANALYTICS_API_KEY` scoped to `builds`, `functions`, `runtime` as
of the last known state (2026-08-22, per `cro/README.md`), i.e. the ~137-byte
headroom risk documented there is still live.

## Step 3 — backfill `cro/snapshots/2026-32.json`

**Not attempted, outstanding.** The backfill requires either invoking the
scheduled function internally (via Netlify, which was unavailable this run —
see Step 1) or an external GET, which the function itself rejects with 403
since it's a scheduled function. No repeated retries were made, per
instructions. Week 2026-32 (2026-08-03..2026-08-09) remains missing a CRO
snapshot; `cro/snapshots/gsc-2026-32.json` already exists on `cro-data`, so
only the GA4-derived CRO side is missing. GA4 event-scoped data retention is
limited (2 or 14 months depending on property settings), so this gap should
be backfilled as soon as Netlify access is available again — the longer it
waits, the more likely the underlying GA4 events have already expired.

## Outstanding

1. **Netlify connector access from this (headless/scheduled) session** — no
   Netlify tools were exposed at all, blocking every step of this task that
   needed the provider. Needs investigation independent of the CRO work:
   confirm whether the Netlify connector requires interactive
   re-authorization that a scheduled session can't perform, or whether this
   was a transient issue.
2. **Env var scope narrowing** (Step 2) — still pending, still the "live risk"
   flagged in `cro/README.md`: `ANALYTICS_API_KEY` at ~3959/4096 bytes of the
   Lambda function-environment cap, ~137 bytes of headroom.
3. **`cro/snapshots/2026-32.json` backfill** (Step 3) — still missing, time-
   sensitive due to GA4 retention.

No credential values were printed, logged, or committed at any point in this
run.
