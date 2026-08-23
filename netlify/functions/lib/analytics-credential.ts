/**
 * Resolves the analytics provider credential for the CRO data spine.
 *
 * Why this indirection: a GA4 service-account JSON key is ~2.4KB, and AWS
 * Lambda caps a function's ENTIRE environment at 4KB. Holding the key in a
 * function-scoped ANALYTICS_API_KEY pushed the site past that ceiling, so
 * Netlify rejected every function in the deploy ("Your environment variables
 * exceed the 4KB limit imposed by AWS Lambda"). The credential therefore lives
 * in a Netlify Blobs store and is fetched at runtime instead.
 *
 * Lookup order:
 *   1. ANALYTICS_API_KEY env var — used by local runs, one-off scripts and any
 *      non-Lambda runner (e.g. GitHub Actions), where the 4KB cap does not
 *      apply. On Netlify this var must stay scoped to builds only.
 *   2. The `cro-config` blob store, key `analytics-api-key` — the source of
 *      truth for deployed functions. Seed/rotate it with
 *      `npm run cro:credential:set`.
 */

import { getStore } from '@netlify/blobs';

/** Site-level blob store holding CRO spine configuration. */
export const CRO_CONFIG_STORE = 'cro-config';

/** Blob key holding the analytics provider credential, verbatim. */
export const ANALYTICS_CREDENTIAL_KEY = 'analytics-api-key';

/**
 * The provider credential (Plausible API token, or the full GA4
 * service-account JSON). Throws with a recovery hint when nothing is stored.
 */
export async function resolveAnalyticsApiKey(): Promise<string> {
  const fromEnv = (process.env.ANALYTICS_API_KEY || '').trim();
  if (fromEnv) {
    // Self-seed the blob store from the env var. Without this, narrowing
    // ANALYTICS_API_KEY to the builds scope (which the 4KB Lambda env cap
    // requires — see the header comment) silently breaks the next run if the
    // blob was never seeded by hand, and the failure only shows up a week
    // later. Seeding here makes that migration safe in either order.
    // Best-effort: a write failure must never fail a pull that already has a
    // usable credential.
    try {
      const store = getStore(CRO_CONFIG_STORE);
      const existing = await store.get(ANALYTICS_CREDENTIAL_KEY, { type: 'text' });
      if ((existing || '').trim() !== fromEnv) {
        await store.set(ANALYTICS_CREDENTIAL_KEY, fromEnv);
        console.log(
          `[analytics-credential] seeded "${ANALYTICS_CREDENTIAL_KEY}" in "${CRO_CONFIG_STORE}" from ANALYTICS_API_KEY (${fromEnv.length} bytes)`,
        );
      }
    } catch (error) {
      console.warn(
        `[analytics-credential] could not seed the blob store: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return fromEnv;
  }

  let stored: string | null = null;
  try {
    stored = await getStore(CRO_CONFIG_STORE).get(ANALYTICS_CREDENTIAL_KEY, { type: 'text' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read "${ANALYTICS_CREDENTIAL_KEY}" from the "${CRO_CONFIG_STORE}" blob store: ${message}`,
    );
  }

  const credential = (stored || '').trim();
  if (!credential) {
    throw new Error(
      `No analytics credential available. Store one in the "${CRO_CONFIG_STORE}" blob store ` +
        `under "${ANALYTICS_CREDENTIAL_KEY}" by running "npm run cro:credential:set" ` +
        '(see cro/README.md). It is deliberately not a function-scoped env var: ' +
        'a GA4 key is too large for the 4KB AWS Lambda environment limit.',
    );
  }
  return credential;
}
