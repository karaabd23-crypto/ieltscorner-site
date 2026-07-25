/**
 * GA4 implementation of the analytics adapter.
 *
 * Reads from the Google Analytics Data API v1 (analyticsdata.googleapis.com)
 * over native fetch. Authenticates with a Google Cloud service account using a
 * self-signed OAuth2 JWT (RS256) exchanged for a short-lived access token, so
 * the CRO spine stays dependency-free (no googleapis / jsonwebtoken).
 *
 * Config mapping (set in Netlify env):
 *   ANALYTICS_PROVIDER = ga4
 *   ANALYTICS_API_KEY  = the service-account JSON key, verbatim (the whole
 *                        {"type":"service_account",...} file contents).
 *   ANALYTICS_SITE_ID  = the GA4 numeric property id (e.g. 123456789),
 *                        NOT the "G-XXXX" measurement id.
 *
 * The service account must be granted Viewer on the GA4 property.
 */

import { createSign } from 'node:crypto';

import {
  computeRate,
  type AdapterConfig,
  type AnalyticsAdapter,
  type ConversionResult,
  type DateRange,
  type GoalDef,
  type TopPage,
  type WeeklyMetrics,
} from './analytics-adapter.js';

const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/** Parse the service-account JSON from ANALYTICS_API_KEY, with a clear error. */
function parseServiceAccount(apiKey: string): ServiceAccountKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(apiKey);
  } catch {
    throw new Error(
      'GA4: ANALYTICS_API_KEY must be the full service-account JSON key (it did not parse as JSON).',
    );
  }
  const key = parsed as Partial<ServiceAccountKey>;
  if (!key.client_email || !key.private_key) {
    throw new Error('GA4: service-account JSON is missing client_email or private_key.');
  }
  return key as ServiceAccountKey;
}

/** base64url without padding, from a Buffer or string. */
function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build and RS256-sign an OAuth2 JWT assertion, then exchange it for an access
 * token. `nowSec` is passed in (not read from the clock here) so the caller
 * controls time; iat/exp span 3600s, the max Google allows.
 */
async function fetchAccessToken(key: ServiceAccountKey, nowSec: number): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: key.client_email,
    scope: SCOPE,
    aud: key.token_uri || TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64url(signer.sign(key.private_key));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(key.token_uri || TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GA4 token exchange failed: ${res.status} ${res.statusText} ${body}`.trim());
  }
  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) {
    throw new Error('GA4 token exchange returned no access_token.');
  }
  return token.access_token;
}

// --- runReport response shapes (only the fields we read) ---
interface ReportRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}
interface RunReportResponse {
  rows?: ReportRow[];
}

/** GA4 date strings are YYYY-MM-DD, same as our DateRange — pass through. */
function dateRange(range: DateRange): { startDate: string; endDate: string } {
  return { startDate: range.start, endDate: range.end };
}

function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function createGa4Adapter(config: AdapterConfig): AnalyticsAdapter {
  const { apiKey, siteId, goals } = config;
  const key = parseServiceAccount(apiKey);
  const property = `properties/${String(siteId).replace(/^properties\//, '')}`;

  // One access token per adapter instance (a single weekly run), reused across
  // every runReport call in getWeeklyMetrics.
  let tokenPromise: Promise<string> | null = null;
  function accessToken(nowSec: number): Promise<string> {
    if (!tokenPromise) tokenPromise = fetchAccessToken(key, nowSec);
    return tokenPromise;
  }

  async function runReport(body: unknown, nowSec: number): Promise<RunReportResponse> {
    const token = await accessToken(nowSec);
    const res = await fetch(`${DATA_API}/${property}:runReport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`GA4 runReport failed: ${res.status} ${res.statusText} ${errBody}`.trim());
    }
    return (await res.json()) as RunReportResponse;
  }

  async function getAggregate(
    range: DateRange,
    nowSec: number,
  ): Promise<{ pageviews: number; visitors: number; bounceRate: number; avgDuration: number }> {
    const data = await runReport(
      {
        dateRanges: [dateRange(range)],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      },
      nowSec,
    );
    const row = data.rows?.[0]?.metricValues ?? [];
    return {
      pageviews: num(row[0]?.value),
      visitors: num(row[1]?.value),
      // GA4 bounceRate is already a 0..1 fraction.
      bounceRate: num(row[2]?.value),
      // averageSessionDuration is in seconds.
      avgDuration: num(row[3]?.value),
    };
  }

  async function getTopPages(range: DateRange, nowSec: number): Promise<TopPage[]> {
    const data = await runReport(
      {
        dateRanges: [dateRange(range)],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      },
      nowSec,
    );
    return (data.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      pageviews: num(r.metricValues?.[0]?.value),
      visitors: num(r.metricValues?.[1]?.value),
    }));
  }

  async function getGoalVisits(range: DateRange, goal: GoalDef, nowSec: number): Promise<number> {
    // Distinct users who viewed any of the goal's tracked paths. GA4 tracks by
    // path only, so strip #anchors and dedupe before querying.
    const paths = Array.from(
      new Set(goal.paths.map((p) => (p.includes('#') ? p.slice(0, p.indexOf('#')) : p))),
    );
    if (paths.length === 0) return 0;
    // No pagePath dimension: a single ungrouped totalUsers is deduplicated
    // ACROSS all matched paths. Grouping by pagePath and summing rows would
    // double-count a user who viewed two of the goal's paths (totalUsers is
    // deduped within each row, not across them).
    const data = await runReport(
      {
        dateRanges: [dateRange(range)],
        metrics: [{ name: 'totalUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            inListFilter: { values: paths },
          },
        },
      },
      nowSec,
    );
    return num(data.rows?.[0]?.metricValues?.[0]?.value);
  }

  async function getGoalEvents(range: DateRange, goal: GoalDef, nowSec: number): Promise<number> {
    const data = await runReport(
      {
        dateRanges: [dateRange(range)],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: goal.eventName },
          },
        },
      },
      nowSec,
    );
    return num(data.rows?.[0]?.metricValues?.[0]?.value);
  }

  async function getConversions(range: DateRange, nowSec: number): Promise<ConversionResult[]> {
    const out: ConversionResult[] = [];
    for (const goal of goals) {
      const [visits, events] = await Promise.all([
        getGoalVisits(range, goal, nowSec),
        getGoalEvents(range, goal, nowSec),
      ]);
      out.push({
        id: goal.id,
        label: goal.label,
        visits,
        events,
        rate: computeRate(events, visits),
      });
    }
    return out;
  }

  return {
    provider: 'ga4',
    async getWeeklyMetrics(range: DateRange): Promise<WeeklyMetrics> {
      // The JWT needs a Unix second for iat/exp; taken once per run.
      const nowSec = Math.floor(Date.now() / 1000);
      const [aggregate, topPages, conversions] = await Promise.all([
        getAggregate(range, nowSec),
        getTopPages(range, nowSec),
        getConversions(range, nowSec),
      ]);
      return { ...aggregate, topPages, conversions };
    },
  };
}
