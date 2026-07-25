import { withLambda } from '@netlify/aws-lambda-compat';
import {
  getDigestAudienceSnapshot,
  getKitFormSubscribers,
  parseOptionalInteger,
} from '../../scripts/lib/kit-newsletter-audience.mjs';

const DASHBOARD_TOKEN = (process.env.NEWSLETTER_DASHBOARD_TOKEN || '').trim();
const KIT_API_KEY = (process.env.KIT_API_KEY || '').trim();
const KIT_DIGEST_TAG_ID = parseOptionalInteger(process.env.KIT_DIGEST_TAG_ID);
const KIT_DIGEST_FORM_ID = parseOptionalInteger(process.env.KIT_DIGEST_FORM_ID);
const KIT_FORM_ID = parseOptionalInteger(process.env.KIT_FORM_ID);
const DEFAULT_READING_FORM_ID = 9278286;
const KIT_READING_GUIDE_FORM_ID = parseOptionalInteger(process.env.KIT_READING_GUIDE_FORM_ID)
  || DEFAULT_READING_FORM_ID;
const SITE_NAME = (process.env.SITE_NAME || 'IELTS Corner').trim();
const SITE_URL = (process.env.SITE_URL || 'https://ieltscorner.ca').trim();

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!DASHBOARD_TOKEN) {
    return json(503, { error: 'Missing NEWSLETTER_DASHBOARD_TOKEN' });
  }

  if (!KIT_API_KEY) {
    return json(500, { error: 'Missing KIT_API_KEY' });
  }

  try {
    const { token } = JSON.parse(event.body || '{}');
    if (!token || String(token).trim() !== DASHBOARD_TOKEN) {
      return json(401, { error: 'Invalid dashboard token' });
    }

    const digest = await getDigestAudienceSnapshot({
      apiKey: KIT_API_KEY,
      digestTagId: KIT_DIGEST_TAG_ID,
      digestFormId: KIT_DIGEST_FORM_ID,
      kitFormId: KIT_FORM_ID,
    });

    let readingGuideSubscriberCount = null;
    if (
      KIT_READING_GUIDE_FORM_ID
      && !(digest.audienceType === 'form' && digest.audienceId === KIT_READING_GUIDE_FORM_ID)
    ) {
      const readingGuideSubscribers = await getKitFormSubscribers({
        apiKey: KIT_API_KEY,
        formId: KIT_READING_GUIDE_FORM_ID,
      });
      readingGuideSubscriberCount = readingGuideSubscribers.length;
    }

    return json(200, {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      formName: digest.audienceLabel,
      subscriberCount: digest.subscribers.length,
      latestSignup: digest.subscribers[0]?.submittedAt || null,
      recentSubscriberEmails: digest.subscribers.slice(0, 5).map((item) => item.email),
      audience: {
        digest: {
          type: digest.audienceType,
          id: digest.audienceId,
          label: digest.audienceLabel,
          count: digest.subscribers.length,
        },
        readingGuide: {
          formId: KIT_READING_GUIDE_FORM_ID,
          count: readingGuideSubscriberCount,
        },
      },
    });
  } catch (error) {
    return json(500, { error: error?.message || 'Unable to load newsletter stats' });
  }
}

export default withLambda(handler);
