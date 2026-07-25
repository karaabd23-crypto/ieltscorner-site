# CRO Data Spine (Phase 1)

A weekly metrics pull that writes revenue-focused snapshots into the repo for a
downstream analysis agent (Phase 2). Phase 1 is **data only** — it collects and
stores numbers; it does not analyze, recommend, or change anything on the site.

## What it does

Every **Monday 06:00 UTC**, the Netlify Scheduled Function
[`netlify/functions/cro-weekly-pull.ts`](../netlify/functions/cro-weekly-pull.ts):

1. Computes the **previous complete ISO week** (Mon–Sun) date range.
2. Pulls metrics through the **analytics adapter** interface
   ([`netlify/functions/lib/analytics-adapter.ts`](../netlify/functions/lib/analytics-adapter.ts)) —
   never a provider endpoint directly. The provider is chosen at runtime by
   `ANALYTICS_PROVIDER`.
3. Breaks out **visits and conversion events per revenue route**, using the goal
   definitions in [`conversions.json`](./conversions.json).
4. Commits a JSON snapshot to `cro/snapshots/YYYY-WW.json` on the dedicated
   **`cro-data`** branch via the GitHub Contents API. The data branch is created
   automatically (from the default branch head) if it does not exist yet.

Data commits land **only** on `cro-data`, never on `main` or any code branch, so
snapshots never mix with application code.

### Analytics adapters

| Provider   | Module                          | Status                    |
| ---------- | ------------------------------- | ------------------------- |
| `plausible`| `netlify/functions/lib/plausible.ts` | Full (Stats API v1)  |
| `ga4`      | `netlify/functions/lib/ga4.ts`  | Stub — `TODO`, throws     |

Add a provider by implementing `AnalyticsAdapter` and registering it in
`getAdapter()`. The snapshot schema is provider-independent.

## Environment variables

| Var                  | Required | Purpose                                             |
| -------------------- | -------- | --------------------------------------------------- |
| `GITHUB_TOKEN`       | yes      | Repo-scoped token allowed to commit to `cro-data`.  |
| `ANALYTICS_PROVIDER` | yes      | `plausible` or `ga4`.                               |
| `ANALYTICS_API_KEY`  | yes      | Provider API key / token.                           |
| `ANALYTICS_SITE_ID`  | yes      | Provider site / property id.                        |
| `CRO_GITHUB_REPO`    | no       | `owner/name` (default `karaabd23-crypto/ieltscorner-site`). |
| `CRO_DATA_BRANCH`    | no       | Target data branch (default `cro-data`).            |

Set these in the Netlify dashboard (Site settings → Environment variables).

## Snapshot schema

`cro/snapshots/YYYY-WW.json` (ISO year + week, e.g. `2026-24.json`):

```jsonc
{
  "schemaVersion": 1,
  "week": "2026-24",                       // ISO year-week
  "range": { "start": "2026-06-08", "end": "2026-06-14" }, // Mon–Sun, UTC
  "provider": "plausible",
  "generatedAt": "2026-06-16T06:00:03.000Z",
  "metrics": {
    "pageviews": 12345,
    "visitors": 6789,
    "bounceRate": 0.62,                     // 0..1 fraction
    "avgDuration": 84.3,                    // seconds
    "topPages": [
      { "path": "/", "pageviews": 3200, "visitors": 2100 }
    ],
    "conversions": [
      {
        "id": "ebook",                      // matches conversions.json goal id
        "label": "Ebook purchase intent",
        "visits": 540,                      // visits to the goal's landing path(s)
        "events": 32,                       // conversion events recorded
        "rate": 0.0593                       // events / visits, 4dp (0 if visits=0)
      }
      // ...one entry per goal in conversions.json
    ]
  }
}
```

### Conversion goals ([`conversions.json`](./conversions.json))

Each goal maps a revenue route to its analytics event name and the landing
path(s) whose visits feed the funnel. Tracked routes: `/ebook`,
`/tutoring#book-private-class`, `/ai-feedback`, webinar signup, and subscription.

## How Phase 2 (analysis agent) consumes it

- Read snapshots from `cro/snapshots/*.json` on the **`cro-data`** branch,
  sorted by the `week` field.
- Trust `schemaVersion` for shape; treat unknown fields as additive.
- Compare consecutive weeks for trends (traffic, bounce, per-goal `rate`).
- Join `conversions[].id` back to `conversions.json` for label/path/revenue flag.
- Phase 2 remains read-only on this data; it produces its own analysis output
  separately and never rewrites snapshots.
