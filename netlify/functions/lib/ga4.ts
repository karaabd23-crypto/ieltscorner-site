/**
 * GA4 implementation of the analytics adapter — STUB.
 *
 * Left intentionally unimplemented so the spine ships provider-agnostic. When
 * GA4 becomes the source of truth, wire the Google Analytics Data API v1
 * (runReport) here and select it with ANALYTICS_PROVIDER=ga4.
 */

import {
  type AdapterConfig,
  type AnalyticsAdapter,
  type DateRange,
  type WeeklyMetrics,
} from './analytics-adapter.js';

export function createGa4Adapter(config: AdapterConfig): AnalyticsAdapter {
  return {
    provider: 'ga4',
    async getWeeklyMetrics(_range: DateRange): Promise<WeeklyMetrics> {
      // TODO(cro-phase-1): implement via the GA4 Data API (analyticsdata.googleapis.com).
      //   - POST properties/{ANALYTICS_SITE_ID}:runReport with a custom date range.
      //   - Map metrics: screenPageViews -> pageviews, totalUsers -> visitors,
      //     bounceRate -> bounceRate, averageSessionDuration -> avgDuration.
      //   - dimension pagePath -> topPages; per-goal events via an eventName
      //     filter using each goal's eventName from cro/conversions.json.
      //   - Auth uses a service account (ANALYTICS_API_KEY as the JSON key or an
      //     OAuth access token), not a Bearer API key like Plausible.
      void config;
      throw new Error(
        'GA4 adapter is not implemented yet. Set ANALYTICS_PROVIDER=plausible or implement ga4.ts.',
      );
    },
  };
}
