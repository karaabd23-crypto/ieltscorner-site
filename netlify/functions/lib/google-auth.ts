/**
 * Shared Google service-account auth for the CRO / SEO data spine.
 *
 * Both the GA4 adapter and the Search Console adapter authenticate the same way:
 * a self-signed OAuth2 JWT (RS256) exchanged for a short-lived access token, with
 * NO extra npm dependency (no googleapis / jsonwebtoken). The only thing that
 * differs between them is the OAuth scope, so this module takes the scope as an
 * argument. The credential is the full service-account JSON key, verbatim — the
 * same key can be granted Viewer on both the GA4 property and the Search Console
 * property, so one credential powers both adapters.
 */

import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/** Parse the service-account JSON credential, with a clear error. */
export function parseServiceAccount(apiKey: string, label = 'Google'): ServiceAccountKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(apiKey);
  } catch {
    throw new Error(
      `${label}: the credential must be the full service-account JSON key (it did not parse as JSON).`,
    );
  }
  const key = parsed as Partial<ServiceAccountKey>;
  if (!key.client_email || !key.private_key) {
    throw new Error(`${label}: service-account JSON is missing client_email or private_key.`);
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
 * token for the given `scope`. `nowSec` is passed in (not read from the clock
 * here) so the caller controls time; iat/exp span 3600s, the max Google allows.
 */
export async function fetchAccessToken(
  key: ServiceAccountKey,
  scope: string,
  nowSec: number,
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: key.client_email,
    scope,
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
    throw new Error(`Google token exchange failed: ${res.status} ${res.statusText} ${body}`.trim());
  }
  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) {
    throw new Error('Google token exchange returned no access_token.');
  }
  return token.access_token;
}
