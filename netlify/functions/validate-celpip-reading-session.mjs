import { withLambda } from '@netlify/aws-lambda-compat';
import Stripe from 'stripe';
import {
  CELPIP_READING_BILLING_INTERVAL,
  CELPIP_READING_PRODUCT_NAME,
} from '../../src/lib/celpipReadingData.mjs';
import { isSameOriginRequest } from './_utils/requestSecurity.mjs';
import { subscriptionHasReadingPrice } from './_utils/celpipReadingStripe.mjs';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

async function getSubscriptionDetails(stripe, subscriptionRef) {
  const subscriptionId = extractId(subscriptionRef);
  if (!subscriptionId) {
    return { valid: false, reason: 'Missing subscription on checkout session.' };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  if (!active) {
    return {
      valid: false,
      reason: `Subscription status is ${subscription.status}. Access requires an active subscription.`,
    };
  }

  const hasPrice = await subscriptionHasReadingPrice(stripe, subscription);
  if (!hasPrice) {
    return {
      valid: false,
      reason: `Subscription does not include the required ${CELPIP_READING_PRODUCT_NAME} price.`,
    };
  }

  return {
    valid: true,
    subscription,
    subscriptionId,
  };
}

async function handler(event) {
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

    const sessionId = String(payload?.sessionId || '').trim();
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Session ID is required.' }) };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.mode !== 'subscription') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: false,
          reason: `This checkout session is not a ${CELPIP_READING_BILLING_INTERVAL}ly subscription for ${CELPIP_READING_PRODUCT_NAME}.`,
        }),
      };
    }

    if (session.status !== 'complete') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: false,
          reason: `Checkout status is ${session.status}.`,
        }),
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
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Validation failed.' }),
    };
  }
}

export default withLambda(handler);
