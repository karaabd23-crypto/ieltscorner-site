import Stripe from 'stripe';
import {
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';
import { normalizeCelpipReport } from '../../src/lib/celpipWritingFeedback.mjs';
import { evaluateCelpipWriting } from '../../src/lib/celpipWritingEvaluator.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const ADMIN_BYPASS_TOKEN = (process.env.CELPIP_WRITING_ADMIN_BYPASS_TOKEN || '').trim();

function isLocalhostRequest(event) {
  const host = String(event?.headers?.host || '');
  const origin = String(event?.headers?.origin || '');
  return /localhost|127\.0\.0\.1/i.test(`${host} ${origin}`);
}

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

async function validateSession(sessionId) {
  if (!STRIPE_API_KEY) {
    throw new Error('Missing STRIPE_API_KEY');
  }

  const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription' || session.status !== 'complete') {
    throw new Error(`This checkout session is not an active ${CELPIP_WRITING_BILLING_INTERVAL}ly subscription.`);
  }

  const subscriptionId = extractId(session.subscription);
  if (!subscriptionId) {
    throw new Error('No subscription found for this checkout session.');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  if (!active) {
    throw new Error(`Subscription is ${subscription.status}. Access requires an active subscription.`);
  }

  if (PRICE_ID) {
    const hasPrice = subscription.items.data.some((item) => item.price?.id === PRICE_ID);
    if (!hasPrice) {
      throw new Error(`Subscription does not include the required ${CELPIP_WRITING_PRODUCT_NAME} plan.`);
    }
  }

  return session;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      sessionId,
      adminToken,
      taskType,
      promptTitle,
      promptText,
      promptInstructions,
      responseText,
    } = body;

    if (!sessionId || !taskType || !responseText || !promptTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const wordCount = String(responseText || '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 40) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Response is too short to grade meaningfully.' }) };
    }

    const bypassByToken = ADMIN_BYPASS_TOKEN && adminToken && adminToken === ADMIN_BYPASS_TOKEN;
    const bypassByLocalhost = ADMIN_BYPASS_TOKEN && isLocalhostRequest(event) && sessionId === 'admin-bypass';
    const isAdminBypass = Boolean(bypassByToken || bypassByLocalhost);

    if (!isAdminBypass) {
      await validateSession(sessionId);
    }

    const rawReport = evaluateCelpipWriting({
      taskType,
      promptTitle,
      promptText,
      promptInstructions,
      responseText,
    });

    const report = normalizeCelpipReport(rawReport, { taskType });

    return {
      statusCode: 200,
      body: JSON.stringify({ report }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Evaluation failed' }),
    };
  }
}
