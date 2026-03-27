import {
  findSubscriberRecordByEmail,
  getNetlifyFormMatch,
  normalizeSubscriberEmail,
} from '../../scripts/lib/newsletter-audience.mjs';

const ACCESS_TOKEN = (process.env.NETLIFY_ACCESS_TOKEN || '').trim();
const SITE_ID = (process.env.NETLIFY_SITE_ID || '').trim();
const FORM_NAME = (process.env.NEWSLETTER_FORM_NAME || 'newsletter').trim();

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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!ACCESS_TOKEN || !SITE_ID) {
    return json(500, { error: 'Missing Netlify API credentials' });
  }

  try {
    const body = parseBody(event);
    const email = normalizeSubscriberEmail(body?.email);
    const source = String(body?.source || '').trim();

    if (!email || !email.includes('@')) {
      return json(400, { error: 'Valid email required' });
    }

    const formMatch = await getNetlifyFormMatch({
      siteId: SITE_ID,
      accessToken: ACCESS_TOKEN,
      formName: FORM_NAME,
    });

    if (!formMatch.formId) {
      return json(500, { error: `Newsletter form not found: ${FORM_NAME}` });
    }

    const existing = await findSubscriberRecordByEmail({
      formId: formMatch.formId,
      accessToken: ACCESS_TOKEN,
      email,
    });

    if (existing) {
      return json(200, {
        ok: true,
        duplicate: true,
        email,
        submittedAt: existing.submittedAt || null,
      });
    }

    const origin = getRequestOrigin(event.headers || {});
    if (!origin) {
      return json(500, { error: 'Unable to determine site origin for form submission' });
    }

    const payload = new URLSearchParams();
    payload.append('form-name', FORM_NAME);
    payload.append('email', email);
    payload.append('bot-field', '');
    if (source) {
      payload.append('source', source);
    }

    const response = await fetch(`${origin}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      return json(502, {
        error: `Netlify form submission failed (${response.status})`,
        detail: text.trim().slice(0, 300),
      });
    }

    return json(200, {
      ok: true,
      duplicate: false,
      email,
    });
  } catch (error) {
    return json(500, { error: error?.message || 'Unable to save newsletter signup' });
  }
}
