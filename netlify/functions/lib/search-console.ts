/**
 * Google Search Console adapter for the SEO data spine.
 *
 * Pulls Search Analytics (queries, pages, clicks, impressions, CTR, position),
 * sitemap submission status, and URL Inspection (the only per-URL index
 * status the API exposes) for a fixed priority list plus a rotating sitemap
 * sample, from the Search Console API,
 * authenticating with the SAME service-account credential the GA4 adapter
 * uses. Auth is a self-signed OAuth2 JWT via ./google-auth (no extra npm
 * dependency).
 *
 * Config:
 *   credential            = the service-account JSON key, verbatim, resolved by
 *                           ./analytics-credential (shared with the GA4 spine).
 *   GSC_SITE_URL          = the Search Console property, exactly as it appears in
 *                           GSC. URL-prefix: "https://ieltscorner.ca/". Domain
 *                           property: "sc-domain:ieltscorner.ca".
 *
 * The service account must be granted at least "Restricted" access on the
 * property (Search Console → Settings → Users and permissions → Add user →
 * the ...@....iam.gserviceaccount.com email).
 *
 * Do NOT read sitemaps.contents[].indexed: Google documents it as "Deprecated;
 * do not use" and it is always 0. It made the site look 0% indexed for eleven
 * weeks (2026-07..09). Index status comes from URL Inspection instead.
 */

import { fetchAccessToken, parseServiceAccount } from './google-auth.js';

// Search Analytics + sitemaps both live under the Webmasters v3 host. (The
// searchconsole.googleapis.com host serves only the URL Inspection API and
// returns a generic HTML 404 for searchAnalytics — do not use it for that.)
const WEBMASTERS_API = 'https://www.googleapis.com/webmasters/v3';
const URL_INSPECTION_API = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

/** URLs inspected per pull. URL Inspection quota is 2000/day and 600/min per property. */
const INSPECTION_SAMPLE_SIZE = 40;
const INSPECTION_CONCURRENCY = 20;
/**
 * Stop starting new inspections after this long. Scheduled functions are killed
 * at 30s, each inspection takes 1-6s, and two GitHub commits follow, so the
 * sample may come back short. `sampled` records how many actually ran.
 */
const INSPECTION_BUDGET_MS = 10_000;

export interface DateRange {
  /** Inclusive start, ISO date (YYYY-MM-DD). */
  start: string;
  /** Inclusive end, ISO date (YYYY-MM-DD). */
  end: string;
}

export interface SearchRow {
  /** The dimension value (a query string, or a page URL). */
  key: string;
  clicks: number;
  impressions: number;
  /** 0..1 fraction. */
  ctr: number;
  /** Average position (1 = top). Lower is better. */
  position: number;
}

export interface QueryPageRow extends SearchRow {
  page: string;
}

export interface SitemapSummary {
  path: string;
  /** URLs the sitemap declares. */
  submitted: number;
  errors: number;
  warnings: number;
  isPending: boolean;
  lastDownloaded?: string;
  lastSubmitted?: string;
}

export interface InspectedUrl {
  url: string;
  /** e.g. "Submitted and indexed", "Crawled - currently not indexed". */
  coverageState: string;
  verdict: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  /** Set when the inspection call itself failed (auth, quota, bad URL). */
  error?: string;
}

export interface IndexCoverageSample {
  /** Sitemap URLs at pull time. */
  sitemapUrls: number;
  /** Rotating offset into the sorted sitemap list; the sample walks the whole sitemap over several weeks. */
  offset: number;
  sampled: number;
  /** Count of sampled URLs per coverageState. */
  byState: Record<string, number>;
  /** sampled URLs that are "Submitted and indexed", as a 0..1 fraction. */
  indexedShare: number;
  urls: InspectedUrl[];
}

export interface SearchConsoleSnapshot {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  /** Dates in the range that have data, so a partial week is visible. */
  daysWithData: string[];
  /**
   * Share of totals that appears in query rows. Google drops anonymized
   * (rare) queries from query-level data, so on a small site most impressions
   * have no query attached. Page-level data is not affected.
   */
  queryCoverage: { clicks: number; impressions: number };
  /** Sorted by impressions desc, then clicks desc. */
  topQueries: SearchRow[];
  /** Sorted by impressions desc, then clicks desc. */
  topPages: SearchRow[];
  /** Which page each top query sends impressions to. */
  queryPages: QueryPageRow[];
  /** Queries ranking positions 8..20 — the "page-2, push to page-1" wins. */
  page2Queries: SearchRow[];
  /** Pages with impressions but zero clicks — a title/meta problem. */
  impressionsNoClicks: SearchRow[];
  sitemaps: SitemapSummary[];
  /** The same priority URLs every week (hub and revenue pages), so their status is a trend line. */
  urlInspections: InspectedUrl[];
  /** Rotating sitemap sample; the share of the whole site that is indexed. */
  indexCoverage: IndexCoverageSample | null;
  /** Non-fatal failures (sitemaps, inspection) that left a section empty. */
  errors: Array<{ source: string; message: string }>;
}

export interface SearchConsoleConfig {
  /** The full service-account JSON key, verbatim. */
  credential: string;
  /** GSC property: "https://ieltscorner.ca/" or "sc-domain:ieltscorner.ca". */
  siteUrl: string;
  /** Live sitemap index to sample URL Inspection targets from. */
  sitemapIndexUrl?: string;
}

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

type Dimension = 'query' | 'page' | 'date';

function num(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function toRow(row: SearchAnalyticsRow): SearchRow {
  return {
    key: row.keys?.[0] ?? '',
    clicks: num(row.clicks),
    impressions: num(row.impressions),
    ctr: round(num(row.ctr), 4),
    position: round(num(row.position), 1),
  };
}

/** The API orders rows by clicks and breaks ties arbitrarily; at 0-click volume that reads as alphabetical. */
function byImpressions(a: SearchRow, b: SearchRow): number {
  return b.impressions - a.impressions || b.clicks - a.clicks || a.position - b.position;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Create a Search Console adapter bound to one property. `nowSec` is threaded in
 * from the caller (never read from the clock here) so runs are deterministic and
 * a single access token is reused across every request in one pull.
 */
export function createSearchConsoleAdapter(config: SearchConsoleConfig) {
  const key = parseServiceAccount(config.credential, 'GSC');
  const siteUrl = config.siteUrl.trim();
  if (!siteUrl) throw new Error('GSC: siteUrl is required (GSC_SITE_URL).');
  const encodedSite = encodeURIComponent(siteUrl);
  const sitemapIndexUrl = config.sitemapIndexUrl ?? 'https://ieltscorner.ca/sitemap-index.xml';

  let tokenPromise: Promise<string> | null = null;
  function accessToken(nowSec: number): Promise<string> {
    if (!tokenPromise) tokenPromise = fetchAccessToken(key, SCOPE, nowSec);
    return tokenPromise;
  }

  async function api<T>(url: string, nowSec: number, init?: RequestInit): Promise<T> {
    const token = await accessToken(nowSec);
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GSC ${res.status} ${res.statusText} for ${url}: ${body}`.trim());
    }
    return (await res.json()) as T;
  }

  /**
   * One Search Analytics query. dataState 'all' includes days Google has not
   * finalized yet; with 'final', a Monday pull silently dropped the weekend
   * (wk37-39 lost 21-37% of impressions). The caller re-pulls the previous
   * week on the next run, so provisional numbers get replaced.
   */
  async function query(
    range: DateRange,
    dimensions: Dimension[],
    nowSec: number,
    rowLimit = 1000,
  ): Promise<SearchAnalyticsRow[]> {
    const url = `${WEBMASTERS_API}/sites/${encodedSite}/searchAnalytics/query`;
    const data = await api<{ rows?: SearchAnalyticsRow[] }>(url, nowSec, {
      method: 'POST',
      body: JSON.stringify({
        startDate: range.start,
        endDate: range.end,
        ...(dimensions.length ? { dimensions } : {}),
        rowLimit,
        dataState: 'all',
      }),
    });
    return data.rows ?? [];
  }

  /** Sitemap submission status. contents[].indexed is deliberately not read (deprecated, always 0). */
  async function sitemaps(nowSec: number): Promise<SitemapSummary[]> {
    const url = `${WEBMASTERS_API}/sites/${encodedSite}/sitemaps`;
    const data = await api<{
      sitemap?: Array<{
        path?: string;
        errors?: string;
        warnings?: string;
        isPending?: boolean;
        lastDownloaded?: string;
        lastSubmitted?: string;
        contents?: Array<{ submitted?: string }>;
      }>;
    }>(url, nowSec);
    return (data.sitemap ?? []).map((s) => ({
      path: s.path ?? '',
      submitted: (s.contents ?? []).reduce((sum, c) => sum + Number(c.submitted ?? 0), 0),
      errors: Number(s.errors ?? 0),
      warnings: Number(s.warnings ?? 0),
      isPending: Boolean(s.isPending),
      lastDownloaded: s.lastDownloaded,
      lastSubmitted: s.lastSubmitted,
    }));
  }

  /** Every <loc> in the live sitemap index and its child sitemaps. */
  async function liveSitemapUrls(): Promise<string[]> {
    const locs = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`sitemap ${url}: ${res.status}`);
      const xml = await res.text();
      return { xml, locs: [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]) };
    };
    const index = await locs(sitemapIndexUrl);
    if (!/<sitemapindex/.test(index.xml)) return index.locs;
    const children = await Promise.all(index.locs.map(async (u) => (await locs(u)).locs));
    return [...new Set(children.flat())].sort();
  }

  async function inspect(url: string, nowSec: number): Promise<InspectedUrl> {
    const data = await api<{
      inspectionResult?: {
        indexStatusResult?: {
          coverageState?: string;
          verdict?: string;
          lastCrawlTime?: string;
          googleCanonical?: string;
          userCanonical?: string;
        };
      };
    }>(URL_INSPECTION_API, nowSec, {
      method: 'POST',
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
    });
    const r = data.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      coverageState: r.coverageState ?? 'unknown',
      verdict: r.verdict ?? 'unknown',
      lastCrawlTime: r.lastCrawlTime,
      googleCanonical: r.googleCanonical,
      userCanonical: r.userCanonical,
    };
  }

  /** Never throws, so one bad URL doesn't drop the rest. */
  function inspectSafe(url: string, nowSec: number): Promise<InspectedUrl> {
    return inspect(url, nowSec).catch((error) => ({
      url,
      coverageState: 'inspection failed',
      verdict: 'VERDICT_UNSPECIFIED',
      error: message(error).slice(0, 200),
    }));
  }

  /**
   * Inspect a rotating slice of the sitemap. `rotation` (the ISO week number)
   * moves the window each week, so the whole sitemap is covered every
   * ceil(urls / INSPECTION_SAMPLE_SIZE) weeks.
   */
  async function indexCoverage(rotation: number, nowSec: number): Promise<IndexCoverageSample> {
    const all = await liveSitemapUrls();
    const offset = all.length ? (rotation * INSPECTION_SAMPLE_SIZE) % all.length : 0;
    const targets = Array.from(
      { length: Math.min(INSPECTION_SAMPLE_SIZE, all.length) },
      (_, i) => all[(offset + i) % all.length],
    );

    const urls: InspectedUrl[] = [];
    const queue = [...targets];
    const deadline = Date.now() + INSPECTION_BUDGET_MS;
    await Promise.all(
      Array.from({ length: INSPECTION_CONCURRENCY }, async () => {
        while (queue.length && Date.now() < deadline) {
          const target = queue.shift() as string;
          urls.push(await inspectSafe(target, nowSec));
        }
      }),
    );
    urls.sort((a, b) => a.url.localeCompare(b.url));

    const byState: Record<string, number> = {};
    for (const u of urls) byState[u.coverageState] = (byState[u.coverageState] ?? 0) + 1;
    const indexed = byState['Submitted and indexed'] ?? 0;
    return {
      sitemapUrls: all.length,
      offset,
      sampled: urls.length,
      byState,
      indexedShare: urls.length ? round(indexed / urls.length, 4) : 0,
      urls,
    };
  }

  async function getSnapshot(
    range: DateRange,
    nowSec: number,
    options: { inspectionRotation?: number; priorityUrls?: string[] } = {},
  ): Promise<SearchConsoleSnapshot> {
    const errors: SearchConsoleSnapshot['errors'] = [];
    const soft = <T>(source: string, fallback: T) => (error: unknown): T => {
      errors.push({ source, message: message(error) });
      console.error(`[search-console] ${source} failed:`, message(error));
      return fallback;
    };

    const [totalRows, dateRows, queryRows, pageRows, queryPageRows, sitemapList, priority, coverage] =
      await Promise.all([
        query(range, [], nowSec),
        query(range, ['date'], nowSec),
        query(range, ['query'], nowSec),
        query(range, ['page'], nowSec),
        query(range, ['query', 'page'], nowSec, 250),
        sitemaps(nowSec).catch(soft('sitemaps', [] as SitemapSummary[])),
        Promise.all((options.priorityUrls ?? []).map((u) => inspectSafe(u, nowSec))),
        options.inspectionRotation === undefined
          ? Promise.resolve(null)
          : indexCoverage(options.inspectionRotation, nowSec).catch(
              soft('urlInspection', null as IndexCoverageSample | null),
            ),
      ]);

    const t = totalRows[0];
    const totals = {
      clicks: num(t?.clicks),
      impressions: num(t?.impressions),
      ctr: round(num(t?.ctr), 4),
      position: round(num(t?.position), 1),
    };
    const topQueries = queryRows.map(toRow).sort(byImpressions);
    const topPages = pageRows.map(toRow).sort(byImpressions);
    const sum = (rows: SearchRow[], k: 'clicks' | 'impressions') =>
      rows.reduce((s, r) => s + r[k], 0);

    return {
      totals,
      daysWithData: dateRows.map((r) => r.keys?.[0] ?? '').filter(Boolean).sort(),
      queryCoverage: {
        clicks: totals.clicks ? round(sum(topQueries, 'clicks') / totals.clicks, 4) : 0,
        impressions: totals.impressions
          ? round(sum(topQueries, 'impressions') / totals.impressions, 4)
          : 0,
      },
      topQueries: topQueries.slice(0, 50),
      topPages: topPages.slice(0, 50),
      queryPages: queryPageRows
        .map((r) => ({ ...toRow(r), page: r.keys?.[1] ?? '' }))
        .sort(byImpressions)
        .slice(0, 50),
      // page-2 opportunities: ranking 8..20 with real impressions, best position first.
      page2Queries: topQueries
        .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 3)
        .sort((a, b) => a.position - b.position)
        .slice(0, 25),
      // title/meta problems: PAGES (not hit by query anonymization) seen but never clicked.
      impressionsNoClicks: topPages
        .filter((r) => r.impressions >= 5 && r.clicks === 0)
        .slice(0, 25),
      sitemaps: sitemapList,
      urlInspections: priority,
      indexCoverage: coverage,
      errors,
    };
  }

  return { provider: 'search-console' as const, getSnapshot };
}
