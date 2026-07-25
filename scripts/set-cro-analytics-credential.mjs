#!/usr/bin/env node
/**
 * Store (or rotate) the CRO analytics provider credential in Netlify Blobs.
 *
 * The credential — a Plausible API token, or the full GA4 service-account JSON
 * key — cannot live in a function-scoped Netlify env var: AWS Lambda caps a
 * function's entire environment at 4KB and a GA4 key alone is ~2.4KB, which
 * makes Netlify reject every function in a deploy. The weekly pull therefore
 * reads it from the `cro-config` blob store at runtime.
 *
 * Usage (any one source):
 *   ANALYTICS_API_KEY='<credential>' npm run cro:credential:set
 *   npm run cro:credential:set -- --file ./sa-key.json
 *   cat sa-key.json | npm run cro:credential:set -- --stdin
 *
 * Verify what is stored without revealing it:
 *   npm run cro:credential:set -- --verify
 *
 * Requires NETLIFY_AUTH_TOKEN and a site id (NETLIFY_SITE_ID / SITE_ID, or
 * --site <id>). Nothing about the credential's contents is ever printed — only
 * its byte length and a truncated SHA-256 fingerprint, so two machines can
 * confirm they hold the same key.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { getStore } from '@netlify/blobs';

const CRO_CONFIG_STORE = 'cro-config';
const ANALYTICS_CREDENTIAL_KEY = 'analytics-api-key';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const hasFlag = (name) => process.argv.includes(`--${name}`);

/** Truncated digest — safe to log, enough to compare two credentials. */
function fingerprint(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function loadCredential() {
  const file = arg('file');
  if (file) return readFileSync(file, 'utf8');
  if (hasFlag('stdin')) return readStdin();
  return process.env.ANALYTICS_API_KEY || '';
}

/** Fail before writing if a GA4 key is malformed — a bad key is silent until Monday. */
function validate(credential) {
  const provider = (process.env.ANALYTICS_PROVIDER || '').trim().toLowerCase();
  const looksLikeJson = credential.startsWith('{');
  if (provider !== 'ga4' && !looksLikeJson) return 'opaque token';

  let parsed;
  try {
    parsed = JSON.parse(credential);
  } catch {
    throw new Error('Credential is not valid JSON. A GA4 credential must be the whole service-account key file.');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Service-account JSON is missing client_email or private_key.');
  }
  return `GA4 service account (${parsed.client_email})`;
}

function openStore() {
  const siteID = arg('site') || process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN;
  if (!siteID) throw new Error('Missing site id. Set NETLIFY_SITE_ID or pass --site <id>.');
  if (!token) throw new Error('Missing NETLIFY_AUTH_TOKEN (a Netlify personal access token).');
  return getStore({ name: CRO_CONFIG_STORE, siteID, token });
}

async function main() {
  const store = openStore();

  if (hasFlag('verify')) {
    const stored = await store.get(ANALYTICS_CREDENTIAL_KEY, { type: 'text' });
    if (!stored) {
      console.error(`No credential stored at ${CRO_CONFIG_STORE}/${ANALYTICS_CREDENTIAL_KEY}.`);
      process.exit(1);
    }
    console.log(`Stored credential: ${stored.length} bytes, sha256:${fingerprint(stored)}`);
    return;
  }

  const credential = loadCredential().trim();
  if (!credential) {
    throw new Error(
      'No credential provided. Set ANALYTICS_API_KEY, or pass --file <path> / --stdin.',
    );
  }

  const kind = validate(credential);
  await store.set(ANALYTICS_CREDENTIAL_KEY, credential);
  console.log(
    `Stored ${kind} at ${CRO_CONFIG_STORE}/${ANALYTICS_CREDENTIAL_KEY}: ` +
      `${credential.length} bytes, sha256:${fingerprint(credential)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
