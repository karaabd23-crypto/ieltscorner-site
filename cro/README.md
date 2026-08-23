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

### Backfilling a missed week

Each stage retries 3x with backoff, but a run can still fail (week **2026-32**
has a `gsc-` snapshot and no CRO one — the 06:00 pull failed and nothing retried
or alerted at the time). Because the schedule only ever looks at *last* week, a
lost week stays lost unless it is backfilled explicitly:

```bash
curl "https://ieltscorner.ca/.netlify/functions/cro-weekly-pull?week=2026-32"
```

`?week=YYYY-WW` is the ISO year-week; the function resolves it to that week's
Mon–Sun range and commits `cro/snapshots/YYYY-WW.json` as usual. GA4 retains
event-scoped data for a limited window (2 or 14 months, per property settings),
so backfill soon after noticing a gap.

> A snapshot showing `events: 0` for every goal is usually **not** a bug. At this
> site's volume (2–46 visits per goal per week) zero clicks is a plausible real
> result — week 2026-30 did record `tutoring_private_class events: 1`, which
> confirms the browser→GA4→snapshot path works end to end.

### Analytics adapters

| Provider   | Module                          | Status                    |
| ---------- | ------------------------------- | ------------------------- |
| `plausible`| `netlify/functions/lib/plausible.ts` | Full (Stats API v1)  |
| `ga4`      | `netlify/functions/lib/ga4.ts`  | Full (Data API v1beta)    |

Add a provider by implementing `AnalyticsAdapter` and registering it in
`getAdapter()`. The snapshot schema is provider-independent.

## Environment variables

| Var                  | Required | Purpose                                             |
| -------------------- | -------- | --------------------------------------------------- |
| `GITHUB_TOKEN`       | yes      | Repo-scoped token allowed to commit to `cro-data`.  |
| `ANALYTICS_PROVIDER` | yes      | `plausible` or `ga4`.                               |
| `ANALYTICS_API_KEY`  | see below | Provider secret. Plausible: Stats API key (Bearer). GA4: the full service-account JSON key, verbatim. |
| `ANALYTICS_SITE_ID`  | yes      | Plausible: the domain (e.g. `ieltscorner.ca`). GA4: the numeric property id (e.g. `123456789`), NOT the `G-XXXX` measurement id. |
| `CRO_GITHUB_REPO`    | no       | `owner/name` (default `karaabd23-crypto/ieltscorner-site`). |
| `CRO_DATA_BRANCH`    | no       | Target data branch (default `cro-data`).            |

Set these in the Netlify dashboard (Site settings → Environment variables).

### Where the provider credential lives

A GA4 service-account key is ~2.4KB. Netlify functions running in **Lambda
compatibility mode** inherit AWS Lambda's 4KB cap on the *entire* environment,
and a key that size takes up more than half of it — enough to push this site
over the limit and make Netlify reject every function in a deploy with
`Your environment variables exceed the 4KB limit imposed by AWS Lambda`.

So the credential is not read from the function environment. `resolveAnalyticsApiKey()`
(`netlify/functions/lib/analytics-credential.ts`) resolves it in this order:

1. `ANALYTICS_API_KEY` — used by local runs and any non-Lambda runner.
2. The `cro-config` blob store, key `analytics-api-key` — the source of truth
   for the deployed function.

Store or rotate it with:

```bash
ANALYTICS_API_KEY="$(cat sa-key.json)" npm run cro:credential:set
npm run cro:credential:verify   # prints size + fingerprint only, never the key
```

Because the credential is in Blobs, `ANALYTICS_API_KEY` can safely be narrowed
to the **builds** scope in Netlify (or removed entirely), which frees ~2.4KB of
function environment headroom. The pull works either way.

> **This is not currently done, and it is the live risk on this site.**
> As of 2026-08-22 `ANALYTICS_API_KEY` is scoped to `builds`, `functions` and
> `runtime`, putting the function environment at roughly **3959 of the 4096-byte
> AWS Lambda cap — about 137 bytes of headroom**. One more function-scoped env
> var, or a slightly longer token on rotation, makes Netlify reject *every*
> function in the deploy. Narrow the scope to **builds** in Site settings →
> Environment variables.
>
> Order does not matter: `resolveAnalyticsApiKey()` now copies the env var into
> the blob store on any run that reads it, so the blob is seeded automatically
> before the env var is narrowed. To confirm the blob independently:
>
> ```bash
> NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... npm run cro:credential:verify
> ```
>
> It prints only a byte count and a truncated fingerprint, never the key.

### GA4 setup (one-time)

To use `ANALYTICS_PROVIDER=ga4` with a free Google service account:

1. **Google Cloud Console** → create/select a project → **APIs & Services →
   Enable APIs** → enable **Google Analytics Data API**.
2. **IAM & Admin → Service Accounts → Create service account** (no roles
   needed). Open it → **Keys → Add key → Create new key → JSON** → download.
3. **GA4 Admin → Property → Property Access Management → Add users** → paste the
   service account's email (`...@....iam.gserviceaccount.com`) → role **Viewer**.
4. Find the **numeric property id** in GA4 Admin → Property Settings (a number,
   not `G-XXXX`).
5. In Netlify set `ANALYTICS_PROVIDER=ga4` and `ANALYTICS_SITE_ID` = the numeric
   property id, then store the downloaded JSON with
   `npm run cro:credential:set` (see above).

Auth is a self-signed OAuth2 JWT (RS256) exchanged for an access token — no extra
npm dependency required.

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

---

# SEO Data Spine (Search Console)

The SEO spine is the same shape as the CRO spine but sourced from **Google
Search Console** — because the site's real bottleneck is *indexing/ranking*, not
just on-site conversion. A second scheduled function
[`netlify/functions/gsc-weekly-pull.ts`](../netlify/functions/gsc-weekly-pull.ts)
runs every **Monday 06:15 UTC** (15 min after the CRO pull, to avoid racing on
the `cro-data` branch head) and commits `cro/snapshots/gsc-YYYY-WW.json`.

The Phase-2 reader is the **`seo-analyst`** agent
([`.claude/agents/seo-analyst.md`](../.claude/agents/seo-analyst.md)): it reads
both the `gsc-*` and the GA4 snapshots and outputs a prioritized weekly action
report (indexing recovery, page-2 keyword wins, impressions-without-clicks,
conversion trend). Run it with the Agent tool (`seo-analyst`) or on a schedule.

## GSC snapshot schema

`cro/snapshots/gsc-YYYY-WW.json`:

```jsonc
{
  "schemaVersion": 1,
  "week": "2026-30",
  "range": { "start": "2026-07-20", "end": "2026-07-26" },
  "provider": "search-console",
  "siteUrl": "https://ieltscorner.ca/",
  "generatedAt": "2026-07-27T06:15:00.000Z",
  "search": {
    "totals": { "clicks": 0, "impressions": 0, "ctr": 0, "position": 0 },
    "topQueries": [ { "key": "celpip writing task 1", "clicks": 3, "impressions": 120, "ctr": 0.025, "position": 12.4 } ],
    "topPages":   [ { "key": "https://ieltscorner.ca/lessons/...", "clicks": 5, "impressions": 200, "ctr": 0.025, "position": 9.1 } ],
    "page2Queries":        [ /* position 8..20, real impressions — fastest wins */ ],
    "impressionsNoClicks": [ /* rank but no clicks — title/meta problem */ ],
    "sitemaps": [ { "path": "https://ieltscorner.ca/sitemap-index.xml", "submitted": 551, "indexed": 3, "errors": 0, "warnings": 0 } ]
  }
}
```

## Environment variables (SEO spine)

| Var             | Required | Purpose                                                                 |
| --------------- | -------- | ----------------------------------------------------------------------- |
| `GITHUB_TOKEN`  | yes      | Reuses the CRO token; commits to `cro-data`.                            |
| `GSC_SITE_URL`  | yes      | The Search Console property, EXACTLY as shown in GSC. URL-prefix: `https://ieltscorner.ca/` — Domain: `sc-domain:ieltscorner.ca`. |

The **provider credential is shared with GA4** — the same service-account JSON
key already stored in the `cro-config` blob store (`analytics-api-key`). No new
credential to store; the GSC adapter reads it via the same
`resolveAnalyticsApiKey()`.

### GSC setup (one-time)

1. Reuse the **existing GA4 service account** (the one already granted Viewer on
   the GA4 property). No new key needed.
2. **Enable the Search Console API**: Google Cloud Console → APIs & Services →
   Enable APIs → **Google Search Console API**.
3. **Search Console → Settings → Users and permissions → Add user** → paste the
   service account email (`...@....iam.gserviceaccount.com`) → permission
   **Restricted** (read is enough) or Full.
4. In Netlify set `GSC_SITE_URL` to the exact property string (step above).

Auth reuses the shared self-signed JWT in
[`netlify/functions/lib/google-auth.ts`](../netlify/functions/lib/google-auth.ts)
with the `webmasters.readonly` scope — no extra npm dependency.

> Note: GSC finalizes data ~2–3 days late; the adapter requests `dataState:
> 'final'`, so the freshest 2–3 days are excluded in exchange for stable numbers.
