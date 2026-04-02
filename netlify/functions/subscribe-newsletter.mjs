import {
  findSubscriberRecordByEmail,
  getNetlifyFormMatch,
  normalizeSubscriberEmail,
} from '../../scripts/lib/newsletter-audience.mjs';

const ACCESS_TOKEN = (process.env.NETLIFY_ACCESS_TOKEN || '').trim();
const SITE_ID = (process.env.NETLIFY_SITE_ID || '').trim();
const FORM_NAME = (process.env.NEWSLETTER_FORM_NAME || 'newsletter').trim();
const KIT_API_KEY = (process.env.KIT_API_KEY || '').trim();
const KIT_FORM_ID = Number.parseInt((process.env.KIT_FORM_ID || '').trim(), 10) || null;
const KIT_DEFAULT_TAG_ID = Number.parseInt((process.env.KIT_DEFAULT_TAG_ID || '').trim(), 10) || null;
const KIT_API_BASE = 'https://api.kit.com/v4';

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

function normalizeOptionalFirstName(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleaned) {
    return '';
  }

  return cleaned.slice(0, 80);
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

async function syncKitSubscriber({ email, firstName, source, referrer }) {
  if (!KIT_API_KEY) {
    return { enabled: false };
  }

  const fields = {};
  if (source) {
    fields.Source = source;
  }

  await kitRequest('/subscribers', {
    email_address: email,
    first_name: firstName || null,
    state: 'active',
    fields,
  });

  let formAdded = null;
  if (KIT_FORM_ID) {
    const formResult = await kitRequest(`/forms/${KIT_FORM_ID}/subscribers`, {
      email_address: email,
      referrer: referrer || null,
    });
    formAdded = formResult.status === 201;
  }

  let defaultTagApplied = false;
  if (KIT_DEFAULT_TAG_ID) {
    await kitRequest(`/tags/${KIT_DEFAULT_TAG_ID}/subscribers`, {
      email_address: email,
    });
    defaultTagApplied = true;
  }

  return {
    enabled: true,
    formConfigured: Boolean(KIT_FORM_ID),
    formAdded,
    defaultTagApplied,
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const hasNetlifyConfig = Boolean(ACCESS_TOKEN && SITE_ID);
  const hasKitConfig = Boolean(KIT_API_KEY);

  if (!hasNetlifyConfig && !hasKitConfig) {
    return json(500, { error: 'Missing newsletter provider credentials (Netlify and Kit)' });
  }

  try {
    const body = parseBody(event);
    const email = normalizeSubscriberEmail(body?.email);
    const firstName = normalizeOptionalFirstName(
      body?.firstName ?? body?.first_name ?? body?.name
    );
    const source = String(body?.source || '').trim();

    if (!email || !email.includes('@')) {
      return json(400, { error: 'Valid email required' });
    }

    const origin = getRequestOrigin(event.headers || {});
    if (!origin) {
      return json(500, { error: 'Unable to determine site origin for form submission' });
    }

    let netlifyDuplicate = false;
    let netlifySubmittedAt = null;
    let netlifyStored = false;

    if (hasNetlifyConfig) {
      const formMatch = await getNetlifyFormMatch({
        siteId: SITE_ID,
        accessToken: ACCESS_TOKEN,
        formName: FORM_NAME,
      });

      if (formMatch.formId) {
        const existing = await findSubscriberRecordByEmail({
          formId: formMatch.formId,
          accessToken: ACCESS_TOKEN,
          email,
        });

        if (existing) {
          netlifyDuplicate = true;
          netlifySubmittedAt = existing.submittedAt || null;
        } else {
          const payload = new URLSearchParams();
          payload.append('form-name', FORM_NAME);
          payload.append('email', email);
          if (firstName) {
            payload.append('first_name', firstName);
            payload.append('name', firstName);
          }
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

          netlifyStored = true;
        }
      }
    }

    const referrer = `${origin}${event.path || '/'}`;
    const kitResult = await syncKitSubscriber({
      email,
      firstName,
      source,
      referrer,
    });

    const duplicate = Boolean(netlifyDuplicate || kitResult.formAdded === false);

    return json(200, {
      ok: true,
      duplicate,
      email,
      firstName: firstName || null,
      submittedAt: netlifySubmittedAt,
      providers: {
        netlify: {
          enabled: hasNetlifyConfig,
          stored: netlifyStored,
          duplicate: netlifyDuplicate,
          formName: FORM_NAME,
        },
        kit: kitResult,
      },
    });
  } catch (error) {
    return json(500, { error: error?.message || 'Unable to save newsletter signup' });
  }
}
