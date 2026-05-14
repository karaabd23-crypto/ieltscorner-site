#!/usr/bin/env node
import { promises as dns } from 'node:dns';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const KIT_API_BASE = 'https://api.kit.com/v4';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '0-mail.com',
  '0815.ru',
  '10minutemail.com',
  '20minutemail.com',
  '2prong.com',
  '33mail.com',
  'anonbox.net',
  'bccto.me',
  'chacuo.net',
  'dispostable.com',
  'dispostable.net',
  'emailondeck.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxbear.com',
  'mail-temporaire.fr',
  'mail7.io',
  'maildrop.cc',
  'mailforspam.com',
  'mailinator.com',
  'mailnesia.com',
  'mailnull.com',
  'mintemail.com',
  'my10minutemail.com',
  'mytemp.email',
  'nada.email',
  'sharklasers.com',
  'spambog.com',
  'temp-mail.org',
  'tempail.com',
  'tempmail.dev',
  'tempmailo.com',
  'tempr.email',
  'throwawaymail.com',
  'tmpmail.org',
  'trashmail.com',
  'yopmail.com',
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDomain(value) {
  return String(value || '').trim().toLowerCase();
}

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

function parseArgs(argv) {
  const options = {
    apply: false,
    json: false,
    maxPages: 60,
    perPage: 500,
    status: 'active',
    skipDns: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = String(argv[index] || '').trim();
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--skip-dns') {
      options.skipDns = true;
    } else if (arg === '--status') {
      options.status = String(argv[index + 1] || '').trim() || 'active';
      index += 1;
    } else if (arg === '--max-pages') {
      options.maxPages = Number.parseInt(String(argv[index + 1] || ''), 10) || options.maxPages;
      index += 1;
    } else if (arg === '--per-page') {
      options.perPage = Number.parseInt(String(argv[index + 1] || ''), 10) || options.perPage;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.maxPages = Math.min(Math.max(options.maxPages, 1), 200);
  options.perPage = Math.min(Math.max(options.perPage, 1), 1000);
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/purge-kit-suspicious-subscribers.mjs
  node scripts/purge-kit-suspicious-subscribers.mjs --apply
  node scripts/purge-kit-suspicious-subscribers.mjs --json
  node scripts/purge-kit-suspicious-subscribers.mjs --apply --status all

Default is dry-run. Suspicious = disposable domain or non-resolvable email domain.
This script unsubscribes suspicious subscribers via Kit v4 endpoint:
POST /v4/subscribers/{id}/unsubscribe`);
}

async function kitRequest({ apiKey, pathName, method = 'GET', body = null }) {
  const response = await fetch(`${KIT_API_BASE}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(json?.errors) ? json.errors[0] : null;
    const detail = String(firstError || text || '').trim().slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return { status: response.status, json };
}

function getEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at <= 0) return '';
  return normalized.slice(at + 1).trim();
}

function getEmailLocalPart(email) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at <= 0) return '';
  return normalized.slice(0, at).trim();
}

function isLikelyValidEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 320) return false;
  if (!EMAIL_PATTERN.test(normalized)) return false;

  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const localPart = parts[0];
  const domain = parts[1];
  if (!localPart || !domain) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  return true;
}

function isDisposableDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(normalized)) return true;
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (normalized.endsWith(`.${blocked}`)) {
      return true;
    }
  }
  return false;
}

function countMatches(value, pattern) {
  return (String(value || '').match(pattern) || []).length;
}

function maxConsonantRun(value) {
  let maxRun = 0;
  let current = 0;
  for (const ch of String(value || '').toLowerCase()) {
    if (/[bcdfghjklmnpqrstvwxyz]/.test(ch)) {
      current += 1;
      if (current > maxRun) maxRun = current;
    } else {
      current = 0;
    }
  }
  return maxRun;
}

function looksLikeRandomName(value) {
  const name = String(value || '').trim();
  if (!name) return { suspicious: false, reasons: [] };
  if (!/^[A-Za-z]+$/.test(name)) return { suspicious: false, reasons: [] };

  const length = name.length;
  const upper = countMatches(name, /[A-Z]/g);
  const lower = countMatches(name, /[a-z]/g);
  const vowels = countMatches(name, /[aeiouAEIOU]/g);
  const vowelRatio = length > 0 ? vowels / length : 0;
  const uniqueRatio = length > 0 ? new Set(name.toLowerCase()).size / length : 0;
  const consonantRun = maxConsonantRun(name);

  const reasons = [];
  if (length >= 14 && upper >= 4 && lower >= 6 && vowelRatio >= 0.15 && vowelRatio <= 0.55) {
    reasons.push('randomized-name-pattern');
  }
  if (length >= 18 && upper >= 5 && lower >= 8 && uniqueRatio >= 0.55) {
    reasons.push('high-entropy-name');
  }
  if (length >= 12 && upper >= 3 && lower >= 6 && consonantRun >= 5) {
    reasons.push('name-consonant-run');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

function looksLikeFragmentedLocalPart(value) {
  const localPart = String(value || '').trim().toLowerCase();
  if (!localPart) return false;

  const segments = localPart.split('.').filter(Boolean);
  const dotCount = Math.max(0, segments.length - 1);
  const hasDigit = /\d/.test(localPart);
  const shortSegments = segments.filter((segment) => segment.length <= 2).length;

  return dotCount >= 4 && hasDigit && shortSegments >= 2;
}

async function hasAnyDnsRecord(domain) {
  try {
    const ipv4 = await dns.resolve4(domain);
    if (Array.isArray(ipv4) && ipv4.length > 0) return true;
  } catch {
  }
  try {
    const ipv6 = await dns.resolve6(domain);
    if (Array.isArray(ipv6) && ipv6.length > 0) return true;
  } catch {
  }
  return false;
}

async function isResolvableEmailDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  try {
    const mxRecords = await dns.resolveMx(normalized);
    const usableMx = Array.isArray(mxRecords)
      ? mxRecords.filter((row) => normalizeDomain(row?.exchange) && normalizeDomain(row?.exchange) !== '.')
      : [];
    if (usableMx.length > 0) return true;
  } catch (error) {
    const code = String(error?.code || '').trim().toUpperCase();
    if (!['ENOTFOUND', 'ENODATA', 'NXDOMAIN', 'SERVFAIL', 'REFUSED', 'NOTFOUND'].includes(code)) {
      // DNS transient failures are treated as resolvable to avoid risky false positives.
      return true;
    }
  }

  return hasAnyDnsRecord(normalized);
}

async function listSubscribers({ apiKey, status = 'active', maxPages = 60, perPage = 500 }) {
  const rows = [];
  let cursor = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams();
    params.set('status', status);
    params.set('per_page', String(perPage));
    if (cursor) params.set('after', cursor);

    const { json } = await kitRequest({
      apiKey,
      pathName: `/subscribers?${params.toString()}`,
      method: 'GET',
    });

    const subscribers = Array.isArray(json?.subscribers) ? json.subscribers : [];
    rows.push(...subscribers);

    const hasNext = Boolean(json?.pagination?.has_next_page);
    const endCursor = String(json?.pagination?.end_cursor || '').trim() || null;
    if (!hasNext || !endCursor) {
      break;
    }
    cursor = endCursor;
  }

  return rows;
}

async function unsubscribeSubscriber({ apiKey, id }) {
  await kitRequest({
    apiKey,
    pathName: `/subscribers/${id}/unsubscribe`,
    method: 'POST',
    body: {},
  });
}

function toReasonCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const reasons = Array.isArray(row?.reasons) ? row.reasons : [];
    for (const reason of reasons) {
      const key = String(reason || '').trim() || 'unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    return;
  }

  await loadEnvFiles();
  const apiKey = String(process.env.KIT_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing KIT_API_KEY in environment.');
  }

  const subscribers = await listSubscribers({
    apiKey,
    status: options.status,
    maxPages: options.maxPages,
    perPage: options.perPage,
  });

  const suspicious = [];
  const domainChecks = new Map();

  for (const subscriber of subscribers) {
    const id = Number.parseInt(String(subscriber?.id || ''), 10);
    const email = normalizeEmail(subscriber?.email_address);
    if (!Number.isFinite(id) || !email) continue;

    const reasons = [];
    if (!isLikelyValidEmail(email)) {
      reasons.push('malformed-email');
    }

    const domain = getEmailDomain(email);
    const localPart = getEmailLocalPart(email);
    const nameCheck = looksLikeRandomName(subscriber?.first_name);
    if (nameCheck.suspicious) {
      reasons.push(...nameCheck.reasons);
    }
    if (looksLikeFragmentedLocalPart(localPart)) {
      reasons.push('fragmented-local-part');
    }

    if (!domain) {
      reasons.push('missing-domain');
    } else {
      if (isDisposableDomain(domain)) {
        reasons.push('disposable-domain');
      }

      if (!options.skipDns) {
        if (!domainChecks.has(domain)) {
          const resolvable = await isResolvableEmailDomain(domain);
          domainChecks.set(domain, resolvable);
        }
        if (!domainChecks.get(domain)) {
          reasons.push('unresolvable-domain');
        }
      }
    }

    const uniqueReasons = [...new Set(reasons)];
    if (uniqueReasons.length > 0) {
      suspicious.push({
        id,
        email,
        state: String(subscriber?.state || '').trim().toLowerCase() || null,
        createdAt: String(subscriber?.created_at || '').trim() || null,
        firstName: String(subscriber?.first_name || '').trim() || null,
        reasons: uniqueReasons,
      });
    }
  }

  suspicious.sort((a, b) => a.email.localeCompare(b.email));

  if (options.json) {
    console.log(JSON.stringify({
      apply: options.apply,
      status: options.status,
      scanned: subscribers.length,
      suspiciousCount: suspicious.length,
      reasonCounts: toReasonCounts(suspicious),
      suspicious,
    }, null, 2));
    return;
  }

  console.log(`Scanned subscribers: ${subscribers.length}`);
  console.log(`Suspicious subscribers: ${suspicious.length}`);
  for (const item of toReasonCounts(suspicious)) {
    console.log(`- ${item.reason}: ${item.count}`);
  }

  for (const row of suspicious.slice(0, 30)) {
    console.log(`- ${row.email} (id=${row.id}) reasons=${row.reasons.join(',')}`);
  }
  if (suspicious.length > 30) {
    console.log(`[info] ${suspicious.length - 30} additional suspicious subscriber(s) not shown.`);
  }

  if (!options.apply) {
    console.log('[dry-run] No Kit subscribers were modified. Re-run with --apply to unsubscribe suspicious records.');
    return;
  }

  let unsubscribed = 0;
  for (const row of suspicious) {
    await unsubscribeSubscriber({ apiKey, id: row.id });
    unsubscribed += 1;
  }
  console.log(`[ok] Unsubscribed ${unsubscribed} suspicious subscriber(s) in Kit.`);
}

main().catch((error) => {
  console.error(`[error] ${error.message || error}`);
  process.exitCode = 1;
});
