import Stripe from 'stripe';
import {
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_PRICE_CAD,
  CELPIP_WRITING_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();

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

  try {
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    const baseUrl = getBaseUrl(event);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      success_url: `${baseUrl}/celpip/writing/ai-feedback/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/celpip/writing/ai-feedback?canceled=1`,
      metadata: {
        service: 'celpip-writing-ai',
        product: CELPIP_WRITING_PRODUCT_NAME,
      },
      line_items: [
        {
          quantity: 1,
          price: PRICE_ID,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkoutUrl: session.url,
        amountCAD: CELPIP_WRITING_PRICE_CAD.toFixed(2),
        interval: CELPIP_WRITING_BILLING_INTERVAL,
        displayPriceCAD: CELPIP_WRITING_PRICE_CAD,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to create checkout session' }),
    };
  }
}
