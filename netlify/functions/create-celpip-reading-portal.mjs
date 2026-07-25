import { withLambda } from '@netlify/aws-lambda-compat';
import Stripe from 'stripe';
import { CELPIP_READING_PRODUCT_NAME } from '../../src/lib/celpipReadingData.mjs';
import {
  getSafeBaseUrl,
  isSameOriginRequest,
} from './_utils/requestSecurity.mjs';
import { subscriptionHasReadingPrice } from './_utils/celpipReadingStripe.mjs';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const PORTAL_CONFIGURATION_NAME = 'CELPIP Reading Self-Serve Billing';
const PORTAL_CONFIGURATION_KEY = 'celpip-reading-simulator';

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

async function ensurePortalConfiguration(stripe, baseUrl) {
  const existingConfigurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });

  const existing = existingConfigurations.data.find(
    (configuration) => configuration.metadata?.service === PORTAL_CONFIGURATION_KEY,
  );

  if (existing?.id) {
    return existing.id;
  }

  const created = await stripe.billingPortal.configurations.create({
    name: PORTAL_CONFIGURATION_NAME,
    default_return_url: `${baseUrl}/celpip/reading/free-test`,
    business_profile: {
      headline: 'Manage your CELPIP Reading subscription',
      privacy_policy_url: `${baseUrl}/privacy`,
      terms_of_service_url: `${baseUrl}/terms`,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email'],
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'missing_features', 'unused', 'switched_service', 'other'],
        },
      },
    },
    metadata: {
      service: PORTAL_CONFIGURATION_KEY,
    },
  });

  return created.id;
}

async function getValidatedCustomerAndSubscription(stripe, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription') {
    throw new Error(`This checkout session is not for a ${CELPIP_READING_PRODUCT_NAME} subscription.`);
  }

  if (session.status !== 'complete') {
    throw new Error(`Checkout status is ${session.status}.`);
  }

  const customerId = extractId(session.customer);
  if (!customerId) {
    throw new Error('No Stripe customer was found for this subscription.');
  }

  const subscriptionId = extractId(session.subscription);
  if (!subscriptionId) {
    throw new Error('No subscription was found for this checkout session.');
  }

  const subscription =
    session.subscription && typeof session.subscription === 'object' && session.subscription.id
      ? session.subscription
      : await stripe.subscriptions.retrieve(subscriptionId);

  const hasMatchingPrice = await subscriptionHasReadingPrice(stripe, subscription);
  if (!hasMatchingPrice) {
    throw new Error('This subscription does not match the CELPIP Reading plan.');
  }

  return {
    customerId,
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
      return { statusCode: 400, body: JSON.stringify({ error: 'sessionId is required' }) };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
    const baseUrl = getSafeBaseUrl(event);
    const configurationId = await ensurePortalConfiguration(stripe, baseUrl);
    const { customerId } = await getValidatedCustomerAndSubscription(stripe, sessionId);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration: configurationId,
      return_url: `${baseUrl}/celpip/reading/free-test`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ portalUrl: portalSession.url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to create billing portal session.' }),
    };
  }
}

export default withLambda(handler);
