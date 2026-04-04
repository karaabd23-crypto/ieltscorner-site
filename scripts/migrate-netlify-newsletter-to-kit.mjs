#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  fetchNetlifyJson,
  getFormSubmissions,
  normalizeFormName,
  normalizeSubscriberEmail,
} from './lib/newsletter-audience.mjs';

const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';
const KIT_API_BASE = 'https://api.kit.com/v4';
const DEFAULT_READING_FORM_ID = 9278286;
const DEFAULT_DIGEST_FORM_ID = 9278182;

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

function parseCommaList(value, fallback = []) {
  const raw = String(value || '').trim();
  if (!raw) return [...fallback];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    apply: false,
    deleteExtra: false,
    sourceForms: [],
    keepForms: [],
    limit: null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--delete-extra') {
      options.deleteExtra = true;
      continue;
    }
    if (arg.startsWith('--source-forms=')) {
      options.sourceForms = parseCommaList(arg.slice('--source-forms='.length));
      continue;
    }
    if (arg.startsWith('--keep-forms=')) {
      options.keepForms = parseCommaList(arg.slice('--keep-forms='.length));
      continue;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = parseOptionalInteger(arg.slice('--limit='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeOptionalFirstName(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned.slice(0, 80);
}

function resolveAudience(source, digestFormId, readingFormId) {
  const normalizedSource = String(source || '').trim().toLowerCase();
  if (normalizedSource === 'instagram-celpip-reading-guide') {
    return {
      key: 'reading-guide',
      formId: readingFormId,
    };
  }

  return {
    key: 'digest',
    formId: digestFormId,
  };
}

async function kitRequest({ apiKey, pathName, method = 'GET', body }) {
  const response = await fetch(`${KIT_API_BASE}${pathName}`, {
    method,
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
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
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return {
    status: response.status,
    body: parsed,
  };
}

async function deleteNetlifyForm({ accessToken, formId }) {
  const response = await fetch(`${NETLIFY_API_BASE}/forms/${formId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delete failed (${response.status}): ${text}`);
  }
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const netlifyAccessToken = (process.env.NETLIFY_ACCESS_TOKEN || '').trim();
  const netlifySiteId = (process.env.NETLIFY_SITE_ID || '').trim();
  const kitApiKey = (process.env.KIT_API_KEY || '').trim();
  const digestFormId = parseOptionalInteger(process.env.KIT_DIGEST_FORM_ID)
    || parseOptionalInteger(process.env.KIT_FORM_ID)
    || DEFAULT_DIGEST_FORM_ID;
  const readingFormId = parseOptionalInteger(process.env.KIT_READING_GUIDE_FORM_ID)
    || DEFAULT_READING_FORM_ID;
  const defaultTagId = parseOptionalInteger(process.env.KIT_DEFAULT_TAG_ID);
  const digestTagId = parseOptionalInteger(process.env.KIT_DIGEST_TAG_ID);
  const readingTagId = parseOptionalInteger(process.env.KIT_READING_GUIDE_TAG_ID);

  const sourceForms = options.sourceForms.length
    ? options.sourceForms
    : parseCommaList(process.env.NETLIFY_MIGRATION_SOURCE_FORMS, ['newsletter']);
  const keepForms = options.keepForms.length
    ? options.keepForms
    : parseCommaList(process.env.NETLIFY_KEEP_FORMS, ['contact', 'subscription-cancel-feedback']);

  if (!netlifyAccessToken || !netlifySiteId) {
    throw new Error('Missing NETLIFY_ACCESS_TOKEN and/or NETLIFY_SITE_ID');
  }
  if (!kitApiKey) {
    throw new Error('Missing KIT_API_KEY');
  }
  if (!digestFormId) {
    throw new Error('Missing KIT_DIGEST_FORM_ID (or KIT_FORM_ID)');
  }

  const forms = await fetchNetlifyJson(`${NETLIFY_API_BASE}/sites/${netlifySiteId}/forms`, netlifyAccessToken);
  const formByNormalizedName = new Map();
  for (const form of forms) {
    const normalized = normalizeFormName(form?.name || '');
    if (!normalized) continue;
    formByNormalizedName.set(normalized, form);
  }

  const migrationForms = sourceForms
    .map((name) => formByNormalizedName.get(normalizeFormName(name)))
    .filter(Boolean);

  if (migrationForms.length === 0) {
    throw new Error(`No Netlify forms matched source list: ${sourceForms.join(', ')}`);
  }

  const deduped = new Map();
  const perFormCounts = [];

  for (const form of migrationForms) {
    const submissions = await getFormSubmissions({
      formId: String(form.id),
      accessToken: netlifyAccessToken,
      maxPages: 40,
      perPage: 100,
    });

    perFormCounts.push({
      name: String(form.name || ''),
      id: String(form.id || ''),
      submissions: submissions.length,
    });

    for (const row of submissions) {
      const email = normalizeSubscriberEmail(row?.data?.email);
      if (!email || !email.includes('@')) continue;

      const firstName = normalizeOptionalFirstName(row?.data?.first_name || row?.data?.name || '');
      const source = String(row?.data?.source || '').trim();
      const createdAt = String(row?.createdAt || '').trim();

      const existing = deduped.get(email);
      if (!existing) {
        deduped.set(email, {
          email,
          firstName,
          source,
          createdAt,
        });
        continue;
      }

      const nextTime = Date.parse(createdAt || '');
      const currentTime = Date.parse(existing.createdAt || '');
      if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
        deduped.set(email, {
          email,
          firstName: firstName || existing.firstName,
          source: source || existing.source,
          createdAt,
        });
      }
    }
  }

  let candidates = [...deduped.values()];
  candidates.sort((a, b) => {
    const aTime = Date.parse(a.createdAt || '');
    const bTime = Date.parse(b.createdAt || '');
    if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
    if (!Number.isFinite(aTime)) return 1;
    if (!Number.isFinite(bTime)) return -1;
    return bTime - aTime;
  });

  if (options.limit) {
    candidates = candidates.slice(0, options.limit);
  }

  console.log(`[info] Source Netlify forms: ${sourceForms.join(', ')}`);
  perFormCounts.forEach((item) => {
    console.log(`[info] Form "${item.name}" (${item.id}) submissions=${item.submissions}`);
  });
  console.log(`[info] Unique email records ready for migration: ${candidates.length}`);

  if (!options.apply) {
    console.log('[dry-run] No changes were written. Re-run with --apply to migrate.');
    console.log('[dry-run] First 10 emails:', candidates.slice(0, 10).map((item) => item.email));
    return;
  }

  let migrated = 0;
  let duplicates = 0;
  let failures = 0;

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

      const audience = resolveAudience(candidate.source, digestFormId, readingFormId);
      const formResult = await kitRequest({
        apiKey: kitApiKey,
        pathName: `/forms/${audience.formId}/subscribers`,
        method: 'POST',
        body: {
          email_address: candidate.email,
          referrer: 'https://ieltscorner.ca/migration/netlify-to-kit',
        },
      });

      if (formResult.status !== 201) {
        duplicates += 1;
      }

      if (audience.formId !== digestFormId) {
        await kitRequest({
          apiKey: kitApiKey,
          pathName: `/forms/${digestFormId}/subscribers`,
          method: 'POST',
          body: {
            email_address: candidate.email,
            referrer: 'https://ieltscorner.ca/migration/netlify-to-kit',
          },
        });
      }

      if (defaultTagId) {
        await kitRequest({
          apiKey: kitApiKey,
          pathName: `/tags/${defaultTagId}/subscribers`,
          method: 'POST',
          body: { email_address: candidate.email },
        });
      }

      if (digestTagId) {
        await kitRequest({
          apiKey: kitApiKey,
          pathName: `/tags/${digestTagId}/subscribers`,
          method: 'POST',
          body: { email_address: candidate.email },
        });
      }

      if (audience.key === 'reading-guide' && readingTagId) {
        await kitRequest({
          apiKey: kitApiKey,
          pathName: `/tags/${readingTagId}/subscribers`,
          method: 'POST',
          body: { email_address: candidate.email },
        });
      }

      migrated += 1;
      if (migrated % 25 === 0) {
        console.log(`[info] Migrated ${migrated}/${candidates.length}...`);
      }
    } catch (error) {
      failures += 1;
      console.log(`[warn] Failed ${candidate.email}: ${error.message}`);
    }
  }

  console.log(`[ok] Migration complete. Success=${migrated} duplicates=${duplicates} failed=${failures}`);

  if (options.deleteExtra) {
    const keepNormalized = new Set(keepForms.map((item) => normalizeFormName(item)));
    const preserved = [];
    let deleted = 0;

    for (const form of forms) {
      const normalized = normalizeFormName(form?.name || '');
      if (keepNormalized.has(normalized)) {
        preserved.push(String(form?.name || ''));
        continue;
      }

      await deleteNetlifyForm({
        accessToken: netlifyAccessToken,
        formId: String(form.id),
      });
      deleted += 1;
      console.log(`[info] Deleted Netlify form: ${form.name} (${form.id})`);
    }

    console.log(`[ok] Netlify cleanup complete. Deleted=${deleted}`);
    console.log(`[info] Preserved forms: ${preserved.join(', ') || '(none)'}`);
  }
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
