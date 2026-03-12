import Stripe from 'stripe';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

function getBaseUrl(event) {
  return (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.SITE_URL ||
    event.headers.origin ||
    'http://localhost:4321'
  ).replace(/\/$/, '');
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!STRIPE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_API_KEY' }) };
  }

  try {
    const { customerId, sessionId } = JSON.parse(event.body || '{}');
    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'customerId is required' }) };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const baseUrl = getBaseUrl(event);
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
