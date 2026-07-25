/**
 * SEO data spine — weekly Search Console pull (Phase 1).
 *
 * Netlify Scheduled Function. Every Monday 06:15 UTC it pulls the previous 7-day
 * window of Google Search Console data (search analytics + sitemap coverage)
 * and commits a JSON snapshot to cro/snapshots/gsc-YYYY-WW.json on the `cro-data`
 * branch via the GitHub Contents API. Data commits only — it never touches code.
 *
 * The `seo-analyst` agent (Phase 2) reads these snapshots and turns them into a
 * prioritized action report; see .claude/agents/seo-analyst.md.
 *
 * Why 06:15, fifteen minutes after cro-weekly-pull: to avoid both scheduled
 * functions racing on the same `cro-data` branch head at 06:00.
 *
 * Required env vars:
 *   GITHUB_TOKEN   - repo-scoped token that can commit to `cro-data`.
 *   GSC_SITE_URL   - the Search Console property EXACTLY as it appears in GSC.
 *                    URL-prefix property:  "https://ieltscorner.ca/"
 *                    Domain property:      "sc-domain:ieltscorner.ca"
 * Optional:
 *   CRO_GITHUB_REPO - "owner/name" (default "karaabd23-crypto/ieltscorner-site").
 *   CRO_DATA_BRANCH - target data branch (default "cro-data").
 *
 * The service-account credential is NOT read from the function environment (a
 * Google key is too large for the 4KB AWS Lambda limit). It is loaded from the
 * `cro-config` blob store — the SAME credential the GA4 pull uses. The service
 * account must be added as a user on the Search Console property.
 */

import { resolveAnalyticsApiKey } from './lib/analytics-credential.js';
import { createSearchConsoleAdapter } from './lib/search-console.js';

const DATA_BRANCH = process.env.CRO_DATA_BRANCH || 'cro-data';
const REPO = process.env.CRO_GITHUB_REPO || 'karaabd23-crypto/ieltscorner-site';
const GH_API = 'https://api.github.com';

/** Config export read by Netlify at deploy time to register the cron. */
export const config = {
  schedule: '15 6 * * 1', // Monday 06:15 UTC (15 min after cro-weekly-pull)
};

/** ISO-8601 week number + year for a date (weeks start Monday). */
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // shift to the week's Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Previous complete Mon–Sun week relative to `now`. Matches cro-weekly-pull so
 * the GA4 and GSC snapshots for a given week label cover the same range. Note
 * GSC finalizes data ~2-3 days late; `dataState: 'final'` in the adapter keeps
 * the numbers stable, at the cost of the freshest 2-3 days being excluded.
 */
function previousWeekRange(now: Date): { start: string; end: string; label: string } {
  const day = now.getUTCDay() || 7; // Mon=1..Sun=7
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - (day - 1));
  const start = new Date(thisMonday);
  start.setUTCDate(thisMonday.getUTCDate() - 7); // previous Monday
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6); // previous Sunday
  const { year, week } = isoWeek(start);
  const label = `${year}-${String(week).padStart(2, '0')}`;
  return { start: isoDate(start), end: isoDate(end), label };
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ieltscorner-seo-spine',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub ${path} failed: ${res.status} ${res.statusText} ${body}`.trim());
  }
  return (await res.json()) as T;
}

/** Ensure `cro-data` exists; branch it from the default branch head if missing. */
async function ensureDataBranch(): Promise<void> {
  try {
    await gh(`/repos/${REPO}/git/ref/heads/${DATA_BRANCH}`);
    return; // already exists
  } catch {
    // fall through to create it
  }
  const repo = await gh<{ default_branch: string }>(`/repos/${REPO}`);
  const base = await gh<{ object: { sha: string } }>(
    `/repos/${REPO}/git/ref/heads/${repo.default_branch}`,
  );
  await gh(`/repos/${REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${DATA_BRANCH}`, sha: base.object.sha }),
  });
}

/** Commit `content` to `filePath` on the data branch (create or update). */
async function commitFile(filePath: string, content: string, message: string): Promise<void> {
  let sha: string | undefined;
  try {
    const existing = await gh<{ sha: string }>(
      `/repos/${REPO}/contents/${filePath}?ref=${DATA_BRANCH}`,
    );
    sha = existing.sha;
  } catch {
    sha = undefined;
  }
  await gh(`/repos/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: DATA_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}

export default async (): Promise<Response> => {
  const startedAt = new Date().toISOString();
  try {
    const siteUrl = process.env.GSC_SITE_URL || '';
    if (!siteUrl) {
      throw new Error(
        'GSC_SITE_URL is not set. Use the exact Search Console property, e.g. ' +
          '"https://ieltscorner.ca/" (URL-prefix) or "sc-domain:ieltscorner.ca" (domain).',
      );
    }

    const adapter = createSearchConsoleAdapter({
      credential: await resolveAnalyticsApiKey(),
      siteUrl,
    });

    const range = previousWeekRange(new Date());
    const nowSec = Math.floor(Date.parse(startedAt) / 1000);
    const data = await adapter.getSnapshot({ start: range.start, end: range.end }, nowSec);

    const snapshot = {
      schemaVersion: 1,
      week: range.label,
      range: { start: range.start, end: range.end },
      provider: adapter.provider,
      siteUrl,
      generatedAt: startedAt,
      search: data,
    };

    await ensureDataBranch();
    const filePath = `cro/snapshots/gsc-${range.label}.json`;
    await commitFile(
      filePath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      `chore(seo): weekly search console snapshot ${range.label}`,
    );

    console.log(`[gsc-weekly-pull] wrote ${filePath} to ${DATA_BRANCH}`);
    return new Response(JSON.stringify({ ok: true, file: filePath, week: range.label }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[gsc-weekly-pull] failed:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
