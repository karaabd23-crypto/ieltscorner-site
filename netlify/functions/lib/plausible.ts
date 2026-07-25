/**
 * Plausible implementation of the analytics adapter.
 *
 * Uses the Plausible Stats API v1 (https://plausible.io/docs/stats-api) over
 * native fetch. Aggregate metrics come from /aggregate, top pages and per-goal
 * visits from /breakdown, and goal conversion events from a goal-filtered
 * /aggregate call per goal defined in cro/conversions.json.
 */

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

const API_BASE = 'https://plausible.io/api/v1/stats';

interface PlausibleAggregate {
  results: Record<string, { value: number } | undefined>;
}

interface PlausibleBreakdown {
  results: Array<Record<string, string | number>>;
}

function normalizePath(pathWithHash: string): string {
  // Plausible tracks pageviews by path only; strip any #anchor from goal paths.
  const hash = pathWithHash.indexOf('#');
  return hash === -1 ? pathWithHash : pathWithHash.slice(0, hash);
}

export function createPlausibleAdapter(config: AdapterConfig): AnalyticsAdapter {
  const { apiKey, siteId, goals } = config;

  async function call<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE}/${endpoint}`);
    url.searchParams.set('site_id', siteId);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Plausible ${endpoint} failed: ${res.status} ${res.statusText} ${body}`.trim());
    }
    return (await res.json()) as T;
  }

  function periodParams(range: DateRange): Record<string, string> {
    return { period: 'custom', date: `${range.start},${range.end}` };
  }

  async function getAggregate(range: DateRange): Promise<{
    pageviews: number;
    visitors: number;
    bounceRate: number;
    avgDuration: number;
  }> {
    const data = await call<PlausibleAggregate>('aggregate', {
      ...periodParams(range),
      metrics: 'pageviews,visitors,bounce_rate,visit_duration',
    });
    const r = data.results;
    return {
      pageviews: r.pageviews?.value ?? 0,
      visitors: r.visitors?.value ?? 0,
      // Plausible returns bounce_rate as a 0..100 percentage.
      bounceRate: (r.bounce_rate?.value ?? 0) / 100,
      avgDuration: r.visit_duration?.value ?? 0,
    };
  }

  async function getTopPages(range: DateRange): Promise<TopPage[]> {
    const data = await call<PlausibleBreakdown>('breakdown', {
      ...periodParams(range),
      property: 'event:page',
      metrics: 'pageviews,visitors',
      limit: '10',
    });
    return data.results.map((row) => ({
      path: String(row.page ?? ''),
      pageviews: Number(row.pageviews ?? 0),
      visitors: Number(row.visitors ?? 0),
    }));
  }

  async function getGoalVisits(range: DateRange, goal: GoalDef): Promise<number> {
    // Sum visitors landing on any of the goal's tracked paths.
    let visits = 0;
    for (const rawPath of goal.paths) {
      const page = normalizePath(rawPath);
      const data = await call<PlausibleAggregate>('aggregate', {
        ...periodParams(range),
        metrics: 'visitors',
        filters: `event:page==${page}`,
      });
      visits += data.results.visitors?.value ?? 0;
    }
    return visits;
  }

  async function getGoalEvents(range: DateRange, goal: GoalDef): Promise<number> {
    const data = await call<PlausibleAggregate>('aggregate', {
      ...periodParams(range),
      metrics: 'events',
      filters: `event:goal==${goal.eventName}`,
    });
    return data.results.events?.value ?? 0;
  }

  async function getConversions(range: DateRange): Promise<ConversionResult[]> {
    const out: ConversionResult[] = [];
    for (const goal of goals) {
      const [visits, events] = await Promise.all([
        getGoalVisits(range, goal),
        getGoalEvents(range, goal),
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
    provider: 'plausible',
    async getWeeklyMetrics(range: DateRange): Promise<WeeklyMetrics> {
      const [aggregate, topPages, conversions] = await Promise.all([
        getAggregate(range),
        getTopPages(range),
        getConversions(range),
      ]);
      return { ...aggregate, topPages, conversions };
    },
  };
}
