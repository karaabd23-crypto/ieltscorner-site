/**
 * Google Search Console adapter for the SEO data spine.
 *
 * Pulls Search Analytics (queries, pages, clicks, impressions, CTR, position)
 * and sitemap/coverage summaries from the Search Console API, authenticating
 * with the SAME service-account credential the GA4 adapter uses — the account
 * just needs to be added as a user on the Search Console property. Auth is a
 * self-signed OAuth2 JWT via ./google-auth (no extra npm dependency).
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
 */

import { fetchAccessToken, parseServiceAccount } from './google-auth.js';

// Search Analytics + sitemaps both live under the Webmasters v3 host. (The
// searchconsole.googleapis.com host serves only the URL Inspection API and
// returns a generic HTML 404 for searchAnalytics — do not use it here.)
const WEBMASTERS_API = 'https://www.googleapis.com/webmasters/v3';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

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

export interface SitemapSummary {
  path: string;
  /** URLs the sitemap declares. */
  submitted: number;
  /** URLs Google has indexed from it (isPending=false, warnings/errors aside). */
  indexed: number;
  errors: number;
  warnings: number;
  lastDownloaded?: string;
}

export interface SearchConsoleSnapshot {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: SearchRow[];
  topPages: SearchRow[];
  /** Queries ranking positions 8..20 — the "page-2, push to page-1" wins. */
  page2Queries: SearchRow[];
  /** Pages with impressions but zero clicks — a title/meta problem. */
  impressionsNoClicks: SearchRow[];
  sitemaps: SitemapSummary[];
}

export interface SearchConsoleConfig {
  /** The full service-account JSON key, verbatim. */
  credential: string;
  /** GSC property: "https://ieltscorner.ca/" or "sc-domain:ieltscorner.ca". */
  siteUrl: string;
}

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

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

  /** One Search Analytics query grouped by a single dimension. */
  async function query(
    range: DateRange,
    dimension: 'query' | 'page',
    nowSec: number,
    rowLimit = 100,
  ): Promise<SearchRow[]> {
    const url = `${WEBMASTERS_API}/sites/${encodedSite}/searchAnalytics/query`;
    const data = await api<{ rows?: SearchAnalyticsRow[] }>(url, nowSec, {
      method: 'POST',
      body: JSON.stringify({
        startDate: range.start,
        endDate: range.end,
        dimensions: [dimension],
        rowLimit,
        dataState: 'final',
      }),
    });
    return (data.rows ?? []).map(toRow);
  }

  /** Property-wide totals (no dimension) for the range. */
  async function totals(range: DateRange, nowSec: number): Promise<SearchConsoleSnapshot['totals']> {
    const url = `${WEBMASTERS_API}/sites/${encodedSite}/searchAnalytics/query`;
    const data = await api<{ rows?: SearchAnalyticsRow[] }>(url, nowSec, {
      method: 'POST',
      body: JSON.stringify({ startDate: range.start, endDate: range.end, dataState: 'final' }),
    });
    const row = data.rows?.[0];
    return {
      clicks: num(row?.clicks),
      impressions: num(row?.impressions),
      ctr: round(num(row?.ctr), 4),
      position: round(num(row?.position), 1),
    };
  }

  /** Sitemap submission/index counts — the coverage signal that crashed in 2026-07. */
  async function sitemaps(nowSec: number): Promise<SitemapSummary[]> {
    const url = `${WEBMASTERS_API}/sites/${encodedSite}/sitemaps`;
    const data = await api<{
      sitemap?: Array<{
        path?: string;
        errors?: string;
        warnings?: string;
        lastDownloaded?: string;
        contents?: Array<{ submitted?: string; indexed?: string }>;
      }>;
    }>(url, nowSec);
    return (data.sitemap ?? []).map((s) => {
      const submitted = (s.contents ?? []).reduce((sum, c) => sum + Number(c.submitted ?? 0), 0);
      const indexed = (s.contents ?? []).reduce((sum, c) => sum + Number(c.indexed ?? 0), 0);
      return {
        path: s.path ?? '',
        submitted,
        indexed,
        errors: Number(s.errors ?? 0),
        warnings: Number(s.warnings ?? 0),
        lastDownloaded: s.lastDownloaded,
      };
    });
  }

  async function getSnapshot(range: DateRange, nowSec: number): Promise<SearchConsoleSnapshot> {
    const [t, topQueries, topPages, sitemapList] = await Promise.all([
      totals(range, nowSec),
      query(range, 'query', nowSec, 250),
      query(range, 'page', nowSec, 250),
      sitemaps(nowSec).catch(() => [] as SitemapSummary[]), // sitemaps scope may lag; don't fail the pull
    ]);

    // page-2 opportunities: ranking 8..20 with real impressions, best position first.
    const page2Queries = topQueries
      .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 5)
      .sort((a, b) => a.position - b.position)
      .slice(0, 25);

    // title/meta problems: impressions but no clicks, most impressions first.
    const impressionsNoClicks = topQueries
      .filter((r) => r.impressions >= 10 && r.clicks === 0)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25);

    return {
      totals: t,
      topQueries: topQueries.slice(0, 50),
      topPages: topPages.slice(0, 50),
      page2Queries,
      impressionsNoClicks,
      sitemaps: sitemapList,
    };
  }

  return { provider: 'search-console' as const, getSnapshot };
}
