import { createHash } from 'node:crypto';
import { normalizeSubscriberEmail } from '../../scripts/lib/newsletter-audience.mjs';
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
const MIN_FORM_FILL_MS = parsePositiveInteger(process.env.NEWSLETTER_MIN_FORM_FILL_MS, 1500);
const MAX_FORM_AGE_MS = parsePositiveInteger(process.env.NEWSLETTER_MAX_FORM_AGE_MS, 6 * 60 * 60 * 1000);

const ipRateMap = new Map();
const emailRateMap = new Map();

function parsePositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
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
      valid: true,
      skipped: true,
      errors: [],
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

export async function handler(event) {
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

  try {
    const body = parseBody(event);
    const email = normalizeSubscriberEmail(body?.email);
    const firstName = normalizeOptionalFirstName(
      body?.firstName ?? body?.first_name ?? body?.name
    );
    const source = String(body?.source || '').trim();
    const audience = String(body?.audience || '').trim();
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

    const turnstileToken = getTurnstileToken(body);
    const turnstileCheck = await verifyTurnstileToken({ token: turnstileToken, ip: clientIp });
    if (!turnstileCheck.valid) {
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
