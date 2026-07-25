import { withLambda } from '@netlify/aws-lambda-compat';
import { createHash } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { normalizeSubscriberEmail } from '../../scripts/lib/kit-newsletter-audience.mjs';
import { getHeader, isSameOriginRequest } from './_utils/requestSecurity.mjs';

const KIT_API_KEY = (process.env.KIT_API_KEY || '').trim();
const TURNSTILE_SECRET_KEY = (process.env.TURNSTILE_SECRET_KEY || '').trim();
const FALLBACK_READING_GUIDE_FORM_ID = 9278286;
const FALLBACK_DIGEST_FORM_ID = 9278182;
const KIT_FORM_ID = Number.parseInt((process.env.KIT_FORM_ID || '').trim(), 10) || null;
const KIT_READING_GUIDE_FORM_ID = Number.parseInt(
  (process.env.KIT_READING_GUIDE_FORM_ID || '').trim(),
  10,
) || FALLBACK_READING_GUIDE_FORM_ID;
const KIT_DIGEST_FORM_ID = Number.parseInt(
  (process.env.KIT_DIGEST_FORM_ID || '').trim(),
  10,
) || KIT_FORM_ID || FALLBACK_DIGEST_FORM_ID;
const KIT_DEFAULT_TAG_ID = Number.parseInt((process.env.KIT_DEFAULT_TAG_ID || '').trim(), 10) || null;
const KIT_READING_GUIDE_TAG_ID = Number.parseInt(
  (process.env.KIT_READING_GUIDE_TAG_ID || '').trim(),
  10,
) || null;
const KIT_DIGEST_TAG_ID = Number.parseInt(
  (process.env.KIT_DIGEST_TAG_ID || '').trim(),
  10,
) || null;
const KIT_API_BASE = 'https://api.kit.com/v4';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RATE_LIMIT_WINDOW_MS = parsePositiveInteger(process.env.NEWSLETTER_RATE_WINDOW_MS, 60 * 60 * 1000);
const MAX_SIGNUPS_PER_IP_PER_WINDOW = parsePositiveInteger(
  process.env.NEWSLETTER_MAX_SIGNUPS_PER_IP_PER_WINDOW,
  15,
);
const MAX_SIGNUPS_PER_EMAIL_PER_WINDOW = parsePositiveInteger(
  process.env.NEWSLETTER_MAX_SIGNUPS_PER_EMAIL_PER_WINDOW,
  5,
);
const MAX_SIGNUPS_PER_DOMAIN_PER_WINDOW = parsePositiveInteger(
  process.env.NEWSLETTER_MAX_SIGNUPS_PER_DOMAIN_PER_WINDOW,
  30,
);
const MIN_FORM_FILL_MS = parsePositiveInteger(process.env.NEWSLETTER_MIN_FORM_FILL_MS, 1500);
const MAX_FORM_AGE_MS = parsePositiveInteger(process.env.NEWSLETTER_MAX_FORM_AGE_MS, 6 * 60 * 60 * 1000);
const EMAIL_DOMAIN_CACHE_TTL_MS = parsePositiveInteger(
  process.env.NEWSLETTER_EMAIL_DOMAIN_CACHE_TTL_MS,
  6 * 60 * 60 * 1000,
);
const REQUIRE_TURNSTILE = parseBoolean(process.env.NEWSLETTER_REQUIRE_TURNSTILE, false);
const BLOCK_DISPOSABLE_EMAILS = parseBoolean(process.env.NEWSLETTER_BLOCK_DISPOSABLE_EMAILS, true);
const VALIDATE_EMAIL_DOMAIN_DNS = parseBoolean(process.env.NEWSLETTER_VALIDATE_EMAIL_DOMAIN_DNS, true);

const ipRateMap = new Map();
const emailRateMap = new Map();
const domainRateMap = new Map();
const emailDomainCache = new Map();

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

function parsePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function parseBoolean(value, fallbackValue) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallbackValue;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallbackValue;
}

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function getRequestOrigin(event) {
  const host = String(getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || '')
    .split(',')[0]
    .trim();
  if (!host) {
    return String(process.env.URL || '').trim().replace(/\/$/, '');
  }

  const proto = String(getHeader(event, 'x-forwarded-proto') || 'https')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

function parseBody(event) {
  if (!event?.body) {
    return {};
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(String(event.body || ''), 'base64').toString('utf8')
    : String(event.body || '');

  try {
    return JSON.parse(rawBody);
  } catch {
    try {
      const params = new URLSearchParams(rawBody);
      return Object.fromEntries(params.entries());
    } catch {
      return {};
    }
  }
}

function safeString(value) {
  return String(value || '').trim();
}

function parseOptionalInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalTimestamp(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const asString = String(value).trim();
  if (!asString) {
    return null;
  }

  const numeric = Number.parseInt(asString, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(asString);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return null;
}

function isLocalRuntime(event) {
  const context = safeString(process.env.CONTEXT).toLowerCase();
  if (context === 'dev') return true;

  const host = safeString(getHeader(event, 'x-forwarded-host') || getHeader(event, 'host'))
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!host) return false;
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
}

function isLikelyValidEmail(value) {
  const email = safeString(value).toLowerCase();
  if (!email || email.length > 320) {
    return false;
  }
  if (!EMAIL_PATTERN.test(email)) {
    return false;
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return false;
  }
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  return true;
}

function getEmailDomain(email) {
  const normalized = safeString(email).toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex <= 0) return '';
  return normalized.slice(atIndex + 1).trim();
}

function isDisposableEmailDomain(domain) {
  const normalized = safeString(domain).toLowerCase();
  if (!normalized) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(normalized)) return true;
  for (const blockedDomain of DISPOSABLE_EMAIL_DOMAINS) {
    if (normalized.endsWith(`.${blockedDomain}`)) {
      return true;
    }
  }
  return false;
}

async function hasAnyDnsRecord(domain) {
  try {
    const v4 = await dns.resolve4(domain);
    if (Array.isArray(v4) && v4.length > 0) {
      return true;
    }
  } catch {
  }

  try {
    const v6 = await dns.resolve6(domain);
    if (Array.isArray(v6) && v6.length > 0) {
      return true;
    }
  } catch {
  }

  return false;
}

async function validateEmailDomain(domain) {
  if (!VALIDATE_EMAIL_DOMAIN_DNS) {
    return { valid: true, reason: 'dns-check-disabled' };
  }

  const normalized = safeString(domain).toLowerCase();
  if (!normalized) {
    return { valid: false, reason: 'missing-domain' };
  }

  const cached = emailDomainCache.get(normalized);
  const now = Date.now();
  if (cached && now < cached.expiresAt) {
    return { valid: cached.valid, reason: cached.reason, cached: true };
  }

  let result = { valid: false, reason: 'missing-mx' };

  try {
    const mxRecords = await dns.resolveMx(normalized);
    const usableMx = Array.isArray(mxRecords)
      ? mxRecords.filter((record) => safeString(record?.exchange) && safeString(record?.exchange) !== '.')
      : [];
    if (usableMx.length > 0) {
      result = { valid: true, reason: 'mx' };
    } else {
      const hasDnsA = await hasAnyDnsRecord(normalized);
      result = hasDnsA
        ? { valid: true, reason: 'a-record-fallback' }
        : { valid: false, reason: 'missing-mx-and-a' };
    }
  } catch (error) {
    const code = safeString(error?.code).toUpperCase();
    if (['ENOTFOUND', 'ENODATA', 'NXDOMAIN', 'SERVFAIL', 'REFUSED', 'NOTFOUND'].includes(code)) {
      const hasDnsA = await hasAnyDnsRecord(normalized);
      result = hasDnsA
        ? { valid: true, reason: 'a-record-fallback' }
        : { valid: false, reason: 'domain-not-resolvable' };
    } else {
      // Resolver/network issues should not block legitimate signups.
      result = { valid: true, reason: 'dns-soft-fail' };
    }
  }

  emailDomainCache.set(normalized, {
    valid: result.valid,
    reason: result.reason,
    expiresAt: now + EMAIL_DOMAIN_CACHE_TTL_MS,
  });
  pruneCacheMap(emailDomainCache, 3000);

  return result;
}

function normalizeOptionalFirstName(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleaned) {
    return '';
  }

  return cleaned.slice(0, 80);
}

function resolveAudience({ audience, source }) {
  const normalizedAudience = safeString(audience).toLowerCase();
  const normalizedSource = safeString(source).toLowerCase();

  if (
    normalizedAudience === 'reading-guide'
    || normalizedAudience === 'reading_guide'
    || normalizedSource === 'instagram-celpip-reading-guide'
  ) {
    return {
      key: 'reading-guide',
      formId: KIT_READING_GUIDE_FORM_ID || KIT_FORM_ID || null,
      tagId: KIT_READING_GUIDE_TAG_ID,
    };
  }

  return {
    key: 'digest',
    formId: KIT_DIGEST_FORM_ID || KIT_FORM_ID || null,
    tagId: KIT_DIGEST_TAG_ID,
  };
}

function getClientIp(event) {
  const xForwardedFor = getHeader(event, 'x-forwarded-for');
  return (
    getHeader(event, 'x-nf-client-connection-ip')
    || (xForwardedFor ? xForwardedFor.split(',')[0]?.trim() : '')
    || getHeader(event, 'client-ip')
    || getHeader(event, 'x-real-ip')
    || 'unknown'
  );
}

function hashValue(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function pruneRateMap(map, windowMs, maxSize = 2000) {
  if (map.size <= maxSize) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of map) {
    if (!entry || now - entry.windowStart >= windowMs) {
      map.delete(key);
    }
  }

  if (map.size <= maxSize) {
    return;
  }

  for (const [key] of map) {
    map.delete(key);
    if (map.size <= maxSize) {
      break;
    }
  }
}

function pruneCacheMap(map, maxSize = 3000) {
  if (map.size <= maxSize) {
    return;
  }

  for (const [key, entry] of map) {
    if (!entry || Date.now() >= Number(entry.expiresAt || 0)) {
      map.delete(key);
    }
  }

  if (map.size <= maxSize) {
    return;
  }

  for (const [key] of map) {
    map.delete(key);
    if (map.size <= maxSize) {
      break;
    }
  }
}

function registerRateAttempt({ map, key, maxPerWindow }) {
  const now = Date.now();
  const current = map.get(key);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    pruneRateMap(map, RATE_LIMIT_WINDOW_MS);
    return {
      allowed: true,
      count: 1,
      retryAfterSec: 0,
    };
  }

  current.count += 1;
  pruneRateMap(map, RATE_LIMIT_WINDOW_MS);

  if (current.count > maxPerWindow) {
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - current.windowStart));
    return {
      allowed: false,
      count: current.count,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    };
  }

  return {
    allowed: true,
    count: current.count,
    retryAfterSec: 0,
  };
}

function getTurnstileToken(body = {}) {
  return safeString(
    body?.['cf-turnstile-response']
    ?? body?.cfTurnstileResponse
    ?? body?.turnstileToken
    ?? body?.turnstile_token
    ?? ''
  );
}

async function verifyTurnstileToken({ token, ip }) {
  if (!TURNSTILE_SECRET_KEY) {
    return {
      enabled: false,
      valid: false,
      skipped: true,
      errors: ['missing-turnstile-secret'],
    };
  }

  if (!token) {
    return {
      enabled: true,
      valid: false,
      skipped: false,
      errors: ['missing-input-response'],
    };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip || '',
      }).toString(),
    });

    const payload = await response.json().catch(() => ({}));
    const valid = Boolean(payload?.success);

    return {
      enabled: true,
      valid,
      skipped: false,
      errors: Array.isArray(payload?.['error-codes']) ? payload['error-codes'] : [],
    };
  } catch {
    return {
      enabled: true,
      valid: false,
      skipped: false,
      errors: ['turnstile-internal-error'],
    };
  }
}

function evaluateTimingSignal(body = {}) {
  const formRenderedAt = parseOptionalTimestamp(
    body?.formRenderedAt
    ?? body?.form_rendered_at
    ?? body?.formStartedAt
    ?? body?.form_started_at
    ?? body?.clientTs
    ?? body?.client_ts
  );

  if (!formRenderedAt) {
    return {
      valid: false,
      reason: 'missing',
      ageMs: null,
    };
  }

  const ageMs = Date.now() - formRenderedAt;

  if (!Number.isFinite(ageMs)) {
    return {
      valid: false,
      reason: 'invalid',
      ageMs: null,
    };
  }

  if (ageMs < MIN_FORM_FILL_MS) {
    return {
      valid: false,
      reason: 'too-fast',
      ageMs,
    };
  }

  if (ageMs > MAX_FORM_AGE_MS) {
    return {
      valid: false,
      reason: 'stale',
      ageMs,
    };
  }

  return {
    valid: true,
    reason: 'ok',
    ageMs,
  };
}

function kitHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Kit-Api-Key': KIT_API_KEY,
  };
}

async function kitRequest(path, body) {
  const response = await fetch(`${KIT_API_BASE}${path}`, {
    method: 'POST',
    headers: kitHeaders(),
    body: JSON.stringify(body || {}),
  });

  const responseText = await response.text();
  let responseJson = null;
  if (responseText) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(responseJson?.errors) ? responseJson.errors[0] : null;
    const detail = safeString(firstError || responseText).slice(0, 240) || `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return {
    status: response.status,
    body: responseJson,
  };
}

async function syncKitSubscriber({
  email,
  firstName,
  source,
  referrer,
  audience,
  requestedFormId,
  dailyPrompt = false,
}) {
  if (!KIT_API_KEY) {
    return { enabled: false };
  }

  const resolved = resolveAudience({ audience, source });
  const explicitFormId = parseOptionalInteger(requestedFormId);
  const targetFormId = explicitFormId || resolved.formId;
  const digestFormId = KIT_DIGEST_FORM_ID || KIT_FORM_ID || null;
  if (!targetFormId) {
    throw new Error('Missing Kit form configuration for newsletter audience');
  }
  if (!digestFormId) {
    throw new Error('Missing Kit digest form configuration');
  }

  const fields = {};
  if (source) {
    fields.source = source;
  }
  // Task 6: store the daily-prompt preference as a Kit custom field so a Kit
  // automation (manual, platform-side) can segment daily-prompt subscribers.
  if (dailyPrompt) {
    fields.daily_prompt = 'yes';
  }

  // Keep subscriber creation neutral; confirmation flow should be governed by the form itself.
  await kitRequest('/subscribers', {
    email_address: email,
    first_name: firstName || null,
    fields,
  });

  const formResult = await kitRequest(`/forms/${targetFormId}/subscribers`, {
    email_address: email,
    referrer: referrer || null,
  });

  const digestFormResult = digestFormId === targetFormId
    ? formResult
    : await kitRequest(`/forms/${digestFormId}/subscribers`, {
      email_address: email,
      referrer: referrer || null,
    });
  const primaryDuplicate = formResult.status !== 201;
  const digestDuplicate = digestFormResult.status !== 201;
  const duplicate = digestDuplicate;

  const subscriberState = safeString(formResult?.body?.subscriber?.state).toLowerCase();
  const canApplyTags = !subscriberState || subscriberState === 'active';

  let defaultTagApplied = false;
  let digestTagApplied = false;
  let audienceTagApplied = false;

  if (canApplyTags && KIT_DEFAULT_TAG_ID) {
    await kitRequest(`/tags/${KIT_DEFAULT_TAG_ID}/subscribers`, {
      email_address: email,
    });
    defaultTagApplied = true;
  }

  if (canApplyTags && KIT_DIGEST_TAG_ID) {
    await kitRequest(`/tags/${KIT_DIGEST_TAG_ID}/subscribers`, {
      email_address: email,
    });
    digestTagApplied = true;
  }

  if (canApplyTags && resolved.tagId && resolved.tagId !== KIT_DIGEST_TAG_ID) {
    await kitRequest(`/tags/${resolved.tagId}/subscribers`, {
      email_address: email,
    });
    audienceTagApplied = true;
  }

  return {
    enabled: true,
    formConfigured: true,
    formAdded: true,
    duplicate,
    audience: resolved.key,
    formId: targetFormId,
    primaryDuplicate,
    digestDuplicate,
    digestFormId,
    subscriberState: subscriberState || null,
    canApplyTags,
    defaultTagApplied,
    digestTagApplied,
    audienceTagApplied,
  };
}

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const hasKitConfig = Boolean(KIT_API_KEY);

  if (!hasKitConfig) {
    return json(500, { error: 'Missing newsletter provider credentials (Kit)' });
  }

  if (!isSameOriginRequest(event)) {
    return json(403, { error: 'Invalid request origin' });
  }

  const turnstileRequiredForRequest = REQUIRE_TURNSTILE && !isLocalRuntime(event);
  if (turnstileRequiredForRequest && !TURNSTILE_SECRET_KEY) {
    return json(503, { error: 'Signup protection is not configured. Please try again later.' });
  }

  try {
    const body = parseBody(event);
    const email = normalizeSubscriberEmail(body?.email);
    const firstName = normalizeOptionalFirstName(
      body?.firstName ?? body?.first_name ?? body?.name
    );
    const source = String(body?.source || '').trim();
    const audience = String(body?.audience || '').trim();
    const dailyPrompt = body?.dailyPrompt === true || body?.dailyPrompt === 'true';
    const requestedFormId = body?.formId ?? body?.form_id;
    const botField = safeString(
      body?.['bot-field']
      ?? body?.botField
      ?? body?.honeypot
      ?? body?.company
      ?? body?.website
    );

    if (botField) {
      return json(200, {
        ok: true,
        duplicate: false,
        spam: true,
      });
    }

    if (!isLikelyValidEmail(email)) {
      return json(400, { error: 'Valid email required' });
    }

    const emailDomain = getEmailDomain(email);
    if (!emailDomain) {
      return json(400, { error: 'Valid email required' });
    }

    if (BLOCK_DISPOSABLE_EMAILS && isDisposableEmailDomain(emailDomain)) {
      return json(400, { error: 'Please use a real email provider.' });
    }

    const timingSignal = evaluateTimingSignal(body);
    if (!timingSignal.valid) {
      return json(400, { error: 'Unable to verify form submission timing' });
    }

    const clientIp = getClientIp(event);
    const ipRateCheck = registerRateAttempt({
      map: ipRateMap,
      key: clientIp,
      maxPerWindow: MAX_SIGNUPS_PER_IP_PER_WINDOW,
    });
    if (!ipRateCheck.allowed) {
      return json(
        429,
        { error: 'Too many signup attempts from this connection. Please try again later.' },
        { 'Retry-After': String(ipRateCheck.retryAfterSec || 60) },
      );
    }

    const emailRateKey = hashValue(email).slice(0, 24);
    const emailRateCheck = registerRateAttempt({
      map: emailRateMap,
      key: emailRateKey,
      maxPerWindow: MAX_SIGNUPS_PER_EMAIL_PER_WINDOW,
    });
    if (!emailRateCheck.allowed) {
      return json(
        429,
        { error: 'Too many signup attempts for this email. Please try again later.' },
        { 'Retry-After': String(emailRateCheck.retryAfterSec || 60) },
      );
    }

    const domainRateCheck = registerRateAttempt({
      map: domainRateMap,
      key: emailDomain,
      maxPerWindow: MAX_SIGNUPS_PER_DOMAIN_PER_WINDOW,
    });
    if (!domainRateCheck.allowed) {
      return json(
        429,
        { error: 'Too many signups from this email provider right now. Please try again later.' },
        { 'Retry-After': String(domainRateCheck.retryAfterSec || 60) },
      );
    }

    const domainValidation = await validateEmailDomain(emailDomain);
    if (!domainValidation.valid) {
      return json(400, { error: 'Please enter a valid email address from a reachable domain.' });
    }

    const turnstileToken = getTurnstileToken(body);
    const turnstileCheck = await verifyTurnstileToken({ token: turnstileToken, ip: clientIp });
    if (turnstileRequiredForRequest && !turnstileCheck.valid) {
      return json(400, { error: 'Captcha verification failed. Please try again.' });
    }

    const origin = getRequestOrigin(event);
    if (!origin) {
      return json(500, { error: 'Unable to determine site origin for form submission' });
    }

    const referrer = `${origin}${event.path || '/.netlify/functions/subscribe-newsletter'}`;
    const kitResult = await syncKitSubscriber({
      email,
      firstName,
      source,
      referrer,
      audience,
      requestedFormId,
      dailyPrompt,
    });

    const duplicate = Boolean(kitResult.duplicate);

    return json(200, {
      ok: true,
      duplicate,
      email,
      firstName: firstName || null,
      providers: {
        kit: kitResult,
      },
    });
  } catch (error) {
    return json(500, { error: error?.message || 'Unable to save newsletter signup' });
  }
}

export default withLambda(handler);
