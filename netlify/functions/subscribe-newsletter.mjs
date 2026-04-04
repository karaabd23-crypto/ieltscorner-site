import { normalizeSubscriberEmail } from '../../scripts/lib/newsletter-audience.mjs';

const KIT_API_KEY = (process.env.KIT_API_KEY || '').trim();
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

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function getRequestOrigin(headers = {}) {
  const host = headers['x-forwarded-host'] || headers.host || '';
  if (!host) {
    return String(process.env.URL || '').trim().replace(/\/$/, '');
  }

  const proto = headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function parseBody(event) {
  if (!event?.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
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

  await kitRequest('/subscribers', {
    email_address: email,
    first_name: firstName || null,
    state: 'active',
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

  let defaultTagApplied = false;
  if (KIT_DEFAULT_TAG_ID) {
    await kitRequest(`/tags/${KIT_DEFAULT_TAG_ID}/subscribers`, {
      email_address: email,
    });
    defaultTagApplied = true;
  }

  let digestTagApplied = false;
  if (KIT_DIGEST_TAG_ID) {
    await kitRequest(`/tags/${KIT_DIGEST_TAG_ID}/subscribers`, {
      email_address: email,
    });
    digestTagApplied = true;
  }

  let audienceTagApplied = false;
  if (resolved.tagId && resolved.tagId !== KIT_DIGEST_TAG_ID) {
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

  try {
    const body = parseBody(event);
    const email = normalizeSubscriberEmail(body?.email);
    const firstName = normalizeOptionalFirstName(
      body?.firstName ?? body?.first_name ?? body?.name
    );
    const source = String(body?.source || '').trim();
    const audience = String(body?.audience || '').trim();
    const requestedFormId = body?.formId ?? body?.form_id;
    const botField = safeString(body?.['bot-field'] ?? body?.botField ?? body?.honeypot);

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

    const origin = getRequestOrigin(event.headers || {});
    if (!origin) {
      return json(500, { error: 'Unable to determine site origin for form submission' });
    }

    const referrer = `${origin}${event.path || '/'}`;
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
