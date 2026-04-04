#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const KIT_API_BASE = 'https://api.kit.com/v4';
const DEFAULT_DIGEST_FORM_ID = 9278182;
const DEFAULT_READING_FORM_ID = 9278286;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function stripWrappingQuotes(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(line.slice(separatorIndex + 1));
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env files
  }
}

async function loadEnvFiles() {
  const root = process.cwd();
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.env.local'));
}

function parseOptionalInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseCommaIntegers(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => parseOptionalInteger(item))
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    apply: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isLikelyValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 320) return false;
  if (!EMAIL_PATTERN.test(email)) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

async function fetchKitJson(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
    const detail = String(firstError || text || '').trim().slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return parsed || {};
}

async function kitRequest({ apiKey, pathName, method = 'POST', body = {} }) {
  const response = await fetch(`${KIT_API_BASE}${pathName}`, {
    method,
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
    const detail = String(firstError || text || '').trim().slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return {
    status: response.status,
    body: parsed,
  };
}

async function getKitFormSubscribers({ apiKey, formId, maxPages = 30, perPage = 500 }) {
  const collected = new Map();
  let cursor = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams();
    params.set('per_page', String(perPage));
    if (cursor) {
      params.set('after', cursor);
    }

    const payload = await fetchKitJson(
      `${KIT_API_BASE}/forms/${formId}/subscribers?${params.toString()}`,
      apiKey,
    );

    const rows = Array.isArray(payload?.subscribers) ? payload.subscribers : [];
    for (const row of rows) {
      const email = normalizeEmail(row?.email_address);
      if (!isLikelyValidEmail(email)) continue;

      const state = String(row?.state || '').trim().toLowerCase();
      if (state && state !== 'active') continue;

      const firstName = String(row?.first_name || '').trim();
      const source = String(row?.fields?.source || '').trim();
      const addedAt = String(row?.added_at || row?.created_at || '').trim();

      const existing = collected.get(email);
      if (!existing) {
        collected.set(email, { email, firstName, source, addedAt });
        continue;
      }

      const nextTime = Date.parse(addedAt || '');
      const currentTime = Date.parse(existing.addedAt || '');
      if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
        collected.set(email, {
          email,
          firstName: firstName || existing.firstName,
          source: source || existing.source,
          addedAt,
        });
      }
    }

    const hasNextPage = Boolean(payload?.pagination?.has_next_page);
    const nextCursor = String(payload?.pagination?.end_cursor || '').trim() || null;
    if (!hasNextPage || !nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  return [...collected.values()];
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const kitApiKey = (process.env.KIT_API_KEY || '').trim();
  const digestFormId = parseOptionalInteger(process.env.KIT_DIGEST_FORM_ID)
    || parseOptionalInteger(process.env.KIT_FORM_ID)
    || DEFAULT_DIGEST_FORM_ID;
  const readingFormId = parseOptionalInteger(process.env.KIT_READING_GUIDE_FORM_ID)
    || DEFAULT_READING_FORM_ID;
  const digestTagId = parseOptionalInteger(process.env.KIT_DIGEST_TAG_ID);
  const extraFormIds = parseCommaIntegers(process.env.KIT_EXTRA_AUDIENCE_FORM_IDS);

  if (!kitApiKey) {
    throw new Error('Missing KIT_API_KEY');
  }
  if (!digestFormId) {
    throw new Error('Missing KIT_DIGEST_FORM_ID (or KIT_FORM_ID)');
  }

  const sourceFormIds = [...new Set([digestFormId, readingFormId, ...extraFormIds].filter(Boolean))];
  const merged = new Map();

  for (const formId of sourceFormIds) {
    const rows = await getKitFormSubscribers({ apiKey: kitApiKey, formId });
    console.log(`[info] Source form ${formId}: ${rows.length} active, valid subscribers`);

    for (const row of rows) {
      const existing = merged.get(row.email);
      if (!existing) {
        merged.set(row.email, row);
        continue;
      }

      if (!existing.firstName && row.firstName) {
        existing.firstName = row.firstName;
      }
      if (!existing.source && row.source) {
        existing.source = row.source;
      }
    }
  }

  const candidates = [...merged.values()];
  console.log(`[info] Canonical digest audience candidates: ${candidates.length}`);

  if (!options.apply) {
    console.log('[dry-run] No changes written. Re-run with --apply to sync.');
    console.log('[dry-run] First 10 emails:', candidates.slice(0, 10).map((item) => item.email));
    return;
  }

  let synced = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      await kitRequest({
        apiKey: kitApiKey,
        pathName: '/subscribers',
        method: 'POST',
        body: {
          email_address: candidate.email,
          first_name: candidate.firstName || null,
          state: 'active',
          fields: candidate.source ? { source: candidate.source } : {},
        },
      });

      await kitRequest({
        apiKey: kitApiKey,
        pathName: `/forms/${digestFormId}/subscribers`,
        method: 'POST',
        body: {
          email_address: candidate.email,
          referrer: 'https://ieltscorner.ca/migration/kit-digest-sync',
        },
      });

      if (digestTagId) {
        await kitRequest({
          apiKey: kitApiKey,
          pathName: `/tags/${digestTagId}/subscribers`,
          method: 'POST',
          body: { email_address: candidate.email },
        });
      }

      synced += 1;
      if (synced % 50 === 0) {
        console.log(`[info] Synced ${synced}/${candidates.length}...`);
      }
    } catch (error) {
      failed += 1;
      console.log(`[warn] Failed ${candidate.email}: ${error.message}`);
    }
  }

  console.log(`[ok] Digest audience sync complete. Synced=${synced} failed=${failed}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
