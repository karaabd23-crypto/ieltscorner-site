import Stripe from 'stripe';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!STRIPE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_API_KEY' }) };
  }

  try {
    const { sessionId } = JSON.parse(event.body || '{}');
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'sessionId is required' }) };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    const subscriptionId = extractId(session.subscription);
    if (!subscriptionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No subscription found for this session' }) };
    }

    const canceled = await stripe.subscriptions.cancel(subscriptionId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        canceled: true,
        subscriptionId,
        status: canceled.status,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to cancel subscription' }),
    };
  }
}
