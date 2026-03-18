import {
  getNetlifyFormMatch,
  getNetlifySiteInfo,
  getSubscriberRecords,
} from '../../scripts/lib/newsletter-audience.mjs';

const DASHBOARD_TOKEN = (process.env.NEWSLETTER_DASHBOARD_TOKEN || '').trim();
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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!DASHBOARD_TOKEN) {
    return json(503, { error: 'Missing NEWSLETTER_DASHBOARD_TOKEN' });
  }

  if (!ACCESS_TOKEN || !SITE_ID) {
    return json(500, { error: 'Missing Netlify API credentials' });
  }

  try {
    const { token } = JSON.parse(event.body || '{}');
    if (!token || String(token).trim() !== DASHBOARD_TOKEN) {
      return json(401, { error: 'Invalid dashboard token' });
    }

    const siteInfo = await getNetlifySiteInfo({ siteId: SITE_ID, accessToken: ACCESS_TOKEN });
    const formMatch = await getNetlifyFormMatch({
      siteId: SITE_ID,
      accessToken: ACCESS_TOKEN,
      formName: FORM_NAME,
    });

    if (!formMatch.formId) {
      return json(404, { error: `Newsletter form not found: ${FORM_NAME}` });
    }

    const subscribers = await getSubscriberRecords({
      formId: formMatch.formId,
      accessToken: ACCESS_TOKEN,
    });

    return json(200, {
      siteName: siteInfo.name || '',
      siteUrl: siteInfo.url || '',
      formName: formMatch.formName,
      subscriberCount: subscribers.length,
      latestSignup: subscribers[0]?.submittedAt || null,
      recentSubscriberEmails: subscribers.slice(0, 5).map((item) => item.email),
    });
  } catch (error) {
    return json(500, { error: error?.message || 'Unable to load newsletter stats' });
  }
}
