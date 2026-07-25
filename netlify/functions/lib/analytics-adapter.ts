/**
 * Analytics adapter interface for the CRO data spine.
 *
 * The weekly pull talks only to this interface — never to a provider SDK or
 * endpoint directly. Swap providers via the ANALYTICS_PROVIDER env var so the
 * snapshot format stays stable regardless of where the numbers come from.
 */

export interface DateRange {
  /** Inclusive start, ISO date (YYYY-MM-DD), UTC. */
  start: string;
  /** Inclusive end, ISO date (YYYY-MM-DD), UTC. */
  end: string;
}

export interface TopPage {
  path: string;
  pageviews: number;
  visitors: number;
}

/** A conversion goal, keyed by the id defined in cro/conversions.json. */
export interface ConversionResult {
  id: string;
  label: string;
  /** Visits to the goal's primary landing path(s) in the range. */
  visits: number;
  /** Conversion events recorded for the goal in the range. */
  events: number;
  /** events / visits, rounded to 4 dp; 0 when visits === 0. */
  rate: number;
}

export interface WeeklyMetrics {
  pageviews: number;
  visitors: number;
  /** 0..1 fraction. */
  bounceRate: number;
  /** Average visit duration in seconds. */
  avgDuration: number;
  topPages: TopPage[];
  conversions: ConversionResult[];
}

/** A conversion goal as declared in cro/conversions.json. */
export interface GoalDef {
  id: string;
  label: string;
  eventName: string;
  paths: string[];
  revenue?: boolean;
}

export interface AdapterConfig {
  apiKey: string;
  siteId: string;
  goals: GoalDef[];
}

export interface AnalyticsAdapter {
  readonly provider: string;
  getWeeklyMetrics(range: DateRange): Promise<WeeklyMetrics>;
}

/**
 * Resolve the configured adapter. Imports are dynamic so an unused provider's
 * module (and any provider-specific quirks) never loads at runtime.
 */
export async function getAdapter(
  provider: string,
  config: AdapterConfig,
): Promise<AnalyticsAdapter> {
  const key = (provider || '').trim().toLowerCase();
  switch (key) {
    case 'plausible': {
      const { createPlausibleAdapter } = await import('./plausible.js');
      return createPlausibleAdapter(config);
    }
    case 'ga4': {
      const { createGa4Adapter } = await import('./ga4.js');
      return createGa4Adapter(config);
    }
    default:
      throw new Error(
        `Unknown ANALYTICS_PROVIDER "${provider}". Expected "plausible" or "ga4".`,
      );
  }
}

/** Shared helper: events / visits as a 4dp fraction, safe on zero visits. */
export function computeRate(events: number, visits: number): number {
  if (!visits) return 0;
  return Math.round((events / visits) * 1e4) / 1e4;
}
