import { withLambda } from '@netlify/aws-lambda-compat';
import Stripe from 'stripe';
import {
  getSafeBaseUrl,
  isSameOriginRequest,
} from './_utils/requestSecurity.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

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
    const { customerId, sessionId } = payload;
    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'customerId is required' }) };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const baseUrl = getSafeBaseUrl(event);
    const returnUrl = `${baseUrl}/celpip/writing/ai-feedback/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ portalUrl: portalSession.url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to create portal session' }),
    };
  }
}

export default withLambda(handler);
