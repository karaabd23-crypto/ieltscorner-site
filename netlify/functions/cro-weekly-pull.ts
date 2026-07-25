/**
 * CRO data spine — weekly metrics pull (Phase 1).
 *
 * Netlify Scheduled Function. Every Monday 06:00 UTC it pulls the previous
 * ISO week's revenue-focused metrics through the analytics adapter and commits
 * a JSON snapshot to cro/snapshots/YYYY-WW.json on the dedicated `cro-data`
 * branch via the GitHub Contents API. Data commits only — it never touches code.
 *
 * A downstream analysis agent (Phase 2) reads these snapshots; see cro/README.md.
 *
 * Required env vars:
 *   GITHUB_TOKEN        - repo-scoped token that can commit to `cro-data`.
 *   ANALYTICS_PROVIDER  - "plausible" (full) or "ga4" (stub).
 *   ANALYTICS_API_KEY   - provider API key / token.
 *   ANALYTICS_SITE_ID   - provider site/property id.
 * Optional:
 *   CRO_GITHUB_REPO     - "owner/name" (default "karaabd23-crypto/ieltscorner-site").
 *   CRO_DATA_BRANCH     - target data branch (default "cro-data").
 */

import { getAdapter, type GoalDef } from './lib/analytics-adapter.js';
import conversions from '../../cro/conversions.json' with { type: 'json' };

const DATA_BRANCH = process.env.CRO_DATA_BRANCH || 'cro-data';
const REPO = process.env.CRO_GITHUB_REPO || 'karaabd23-crypto/ieltscorner-site';
const GH_API = 'https://api.github.com';

/** Config export read by Netlify at deploy time to register the cron. */
export const config = {
  schedule: '0 6 * * 1', // Monday 06:00 UTC
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

/** Previous complete Mon–Sun week relative to `now`. */
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
      'User-Agent': 'ieltscorner-cro-spine',
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
  // Look up existing file sha (needed for update) — 404 means new file.
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
    const provider = process.env.ANALYTICS_PROVIDER || '';
    const goals = (conversions.goals as GoalDef[]) ?? [];

    const adapter = await getAdapter(provider, {
      apiKey: process.env.ANALYTICS_API_KEY || '',
      siteId: process.env.ANALYTICS_SITE_ID || '',
      goals,
    });

    const range = previousWeekRange(new Date());
    const metrics = await adapter.getWeeklyMetrics({ start: range.start, end: range.end });

    const snapshot = {
      schemaVersion: 1,
      week: range.label,
      range: { start: range.start, end: range.end },
      provider: adapter.provider,
      generatedAt: startedAt,
      metrics,
    };

    await ensureDataBranch();
    const filePath = `cro/snapshots/${range.label}.json`;
    await commitFile(
      filePath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      `chore(cro): weekly snapshot ${range.label}`,
    );

    console.log(`[cro-weekly-pull] wrote ${filePath} to ${DATA_BRANCH}`);
    return new Response(JSON.stringify({ ok: true, file: filePath, week: range.label }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cro-weekly-pull] failed:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
