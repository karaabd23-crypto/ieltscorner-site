import Stripe from 'stripe';
import {
  CELPIP_PROMPT_BANK,
  CELPIP_PROMPT_TOTAL,
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_PRODUCT_NAME,
  getPromptSampleResponses,
} from '../../src/lib/celpipWritingData.mjs';
import {
  getHeader,
  getRequestHost,
  isSameOriginRequest,
} from './_utils/requestSecurity.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const ADMIN_BYPASS_TOKEN = (process.env.CELPIP_WRITING_ADMIN_BYPASS_TOKEN || '').trim();

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

function sanitizePrompt(prompt) {
  const sampleResponses = getPromptSampleResponses(prompt);
  const sampleResponse = sampleResponses.clb9 || sampleResponses.clb7 || sampleResponses.clb11 || sampleResponses.clb5 || '';

  return {
    id: prompt.id,
    title: prompt.title,
    scenario: prompt.scenario || '',
    question: prompt.question || '',
    instructions: Array.isArray(prompt.instructions) ? prompt.instructions : [],
    options: Array.isArray(prompt.options) ? prompt.options : [],
    sampleResponse,
    sampleResponses,
    sampleLevel: prompt.sampleLevel || '',
    sampleLevelWhy: Array.isArray(prompt.sampleLevelWhy) ? prompt.sampleLevelWhy : [],
  };
}

function buildPayload({ customerId, subscriptionId, sessionId, adminBypass = false }) {
  return {
    valid: true,
    customerId,
    subscriptionId,
    sessionId,
    adminBypass,
    promptTotal: CELPIP_PROMPT_TOTAL,
    task1: CELPIP_PROMPT_BANK.task1.map(sanitizePrompt),
    task2: CELPIP_PROMPT_BANK.task2.map(sanitizePrompt),
  };
}

async function validateSubscription(stripe, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription') {
    return {
      valid: false,
      reason: `This checkout session is not a ${CELPIP_WRITING_BILLING_INTERVAL}ly subscription for ${CELPIP_WRITING_PRODUCT_NAME}.`,
    };
  }

  if (session.status !== 'complete') {
    return {
      valid: false,
      reason: `Checkout status is ${session.status}`,
    };
  }

  const subscriptionId = extractId(session.subscription);
  if (!subscriptionId) {
    return {
      valid: false,
      reason: 'Missing subscription on checkout session.',
    };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  if (!isActive) {
    return {
      valid: false,
      reason: `Subscription status is ${subscription.status}. Access requires an active subscription.`,
    };
  }

  if (PRICE_ID) {
    const hasPrice = subscription.items.data.some((item) => item.price?.id === PRICE_ID);
    if (!hasPrice) {
      return {
        valid: false,
        reason: `Subscription does not include the required ${CELPIP_WRITING_PRODUCT_NAME} price.`,
      };
    }
  }

  return {
    valid: true,
    customerId: extractId(session.customer),
    subscriptionId,
    sessionId,
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isSameOriginRequest(event)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Cross-origin requests are not allowed.' }),
    };
  }

  if (!STRIPE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_API_KEY' }) };
  }

  try {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON request body.' }) };
    }
    const { sessionId, adminToken } = payload;
    const host = String(getRequestHost(event) || '');
    const origin = String(getHeader(event, 'origin') || '');
    const isLocalhostRequest = /localhost|127\.0\.0\.1/i.test(`${host} ${origin}`);

    if (
      ADMIN_BYPASS_TOKEN &&
      ((isLocalhostRequest && String(sessionId || '') === 'admin-bypass') || adminToken === ADMIN_BYPASS_TOKEN)
    ) {
      return {
        statusCode: 200,
        body: JSON.stringify(
          buildPayload({
            customerId: 'admin-bypass',
            subscriptionId: 'admin-bypass',
            sessionId: String(sessionId || 'admin-bypass'),
            adminBypass: true,
          })
        ),
      };
    }

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Session ID is required (or provide a valid admin token).' }),
      };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const access = await validateSubscription(stripe, String(sessionId).trim());

    if (!access.valid) {
      return {
        statusCode: 403,
        body: JSON.stringify({ valid: false, reason: access.reason || 'Access denied.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(buildPayload(access)),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to load sample library.' }),
    };
  }
}
