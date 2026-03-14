import Stripe from 'stripe';
import {
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_MONTHLY_EVAL_LIMIT,
  CELPIP_WRITING_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const ADMIN_BYPASS_TOKEN = (process.env.CELPIP_WRITING_ADMIN_BYPASS_TOKEN || '').trim();

function adminBypassPayload() {
  return {
    valid: true,
    customerId: 'admin-bypass',
    subscriptionId: 'admin-bypass',
    subscriptionStatus: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    customerEmail: null,
    customerName: 'Admin Preview',
    sessionId: 'admin-bypass',
    adminBypass: true,
    evalsUsed: 0,
    evalLimit: CELPIP_WRITING_MONTHLY_EVAL_LIMIT,
    topupCredits: 0,
  };
}

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

async function getSubscriptionDetails(stripe, subscriptionRef) {
  const subscriptionId = extractId(subscriptionRef);
  if (!subscriptionId) {
    return { valid: false, reason: 'Missing subscription on checkout session' };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  if (!active) {
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
    subscription,
    subscriptionId,
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!STRIPE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_API_KEY' }) };
  }

  try {
    const { sessionId, adminToken } = JSON.parse(event.body || '{}');
    const host = String(event.headers?.host || '');
    const origin = String(event.headers?.origin || '');
    const isLocalhostRequest = /localhost|127\.0\.0\.1/i.test(`${host} ${origin}`);

    if (ADMIN_BYPASS_TOKEN && isLocalhostRequest) {
      return { statusCode: 200, body: JSON.stringify(adminBypassPayload()) };
    }

    if (ADMIN_BYPASS_TOKEN && adminToken && adminToken === ADMIN_BYPASS_TOKEN) {
      return { statusCode: 200, body: JSON.stringify(adminBypassPayload()) };
    }

    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Session ID is required (or provide a valid admin token)' }),
      };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.mode !== 'subscription') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: false,
          reason: `This checkout session is not a ${CELPIP_WRITING_BILLING_INTERVAL}ly subscription for ${CELPIP_WRITING_PRODUCT_NAME}.`,
        }),
      };
    }

    if (session.status !== 'complete') {
      return {
        statusCode: 200,
        body: JSON.stringify({ valid: false, reason: `Checkout status is ${session.status}` }),
      };
    }

    const subResult = await getSubscriptionDetails(stripe, session.subscription);
    if (!subResult.valid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ valid: false, reason: subResult.reason }),
      };
    }

    const customerId = extractId(session.customer);
    const subscription = subResult.subscription;

    // Fetch usage metrics from customer metadata
    let evalsUsed = 0;
    let topupCredits = 0;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          const periodStart = new Date(subscription.current_period_start * 1000).toISOString().slice(0, 10);
          const storedPeriod = String(customer.metadata?.celpip_eval_period || '');
          evalsUsed =
            storedPeriod === periodStart
              ? Math.max(0, Number(customer.metadata?.celpip_eval_count || '0'))
              : 0;
          topupCredits = Math.max(0, Number(customer.metadata?.celpip_topup_credits || '0'));
        }
      } catch {
        // Non-fatal: usage data unavailable but access is still valid
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        customerId,
        subscriptionId: subResult.subscriptionId,
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodEnd: subscription.current_period_end || null,
        customerEmail: session.customer_details?.email || null,
        customerName: session.customer_details?.name || null,
        sessionId,
        evalsUsed,
        evalLimit: CELPIP_WRITING_MONTHLY_EVAL_LIMIT,
        topupCredits,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Validation failed' }),
    };
  }
}
