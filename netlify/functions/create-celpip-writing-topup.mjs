import Stripe from 'stripe';
import {
  CELPIP_WRITING_TOPUP_AMOUNT_CENTS,
  CELPIP_WRITING_TOPUP_CREDITS,
  CELPIP_WRITING_TOPUP_PRICE_CAD,
  CELPIP_WRITING_TOPUP_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const TOPUP_PRICE_ID = (process.env.CELPIP_WRITING_TOPUP_PRICE_ID || '').trim();

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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing STRIPE_API_KEY in environment variables' }),
    };
  }

  if (!TOPUP_PRICE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Top-up is not configured yet. Add CELPIP_WRITING_TOPUP_PRICE_ID in Netlify environment variables.',
      }),
    };
  }

  try {
    const { customerId, sessionId } = JSON.parse(event.body || '{}');

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const baseUrl = getBaseUrl(event);

    const successUrl = `${baseUrl}/celpip/writing/ai-feedback/topup-success?topup_session={CHECKOUT_SESSION_ID}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ''}`;
    const cancelUrl = `${baseUrl}/celpip/writing/ai-feedback/success${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`;

    const sessionParams = {
      mode: 'payment',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        service: 'celpip-writing-topup',
        credits: String(CELPIP_WRITING_TOPUP_CREDITS),
        product: CELPIP_WRITING_TOPUP_PRODUCT_NAME,
      },
      line_items: [
        {
          quantity: 1,
          price: TOPUP_PRICE_ID,
        },
      ],
    };

    // Link to the existing Stripe customer so credits can be tracked by customer ID
    if (customerId && customerId !== 'admin-bypass') {
      sessionParams.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkoutUrl: session.url,
        credits: CELPIP_WRITING_TOPUP_CREDITS,
        amountCAD: CELPIP_WRITING_TOPUP_PRICE_CAD.toFixed(2),
        amountCents: CELPIP_WRITING_TOPUP_AMOUNT_CENTS,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to create top-up checkout session' }),
    };
  }
}
