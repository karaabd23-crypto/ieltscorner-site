import Stripe from 'stripe';
import {
  CELPIP_READING_BILLING_INTERVAL,
  CELPIP_READING_PRICE_CAD,
  CELPIP_READING_PRODUCT_NAME,
} from '../../src/lib/celpipReadingData.mjs';
import {
  getSafeBaseUrl,
  isSameOriginRequest,
} from './_utils/requestSecurity.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_READING_PRICE_ID || '').trim();

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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing STRIPE_API_KEY in environment variables' }),
    };
  }

  if (!PRICE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing CELPIP_READING_PRICE_ID in environment variables' }),
    };
  }

  try {
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
    const baseUrl = getSafeBaseUrl(event);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      success_url: `${baseUrl}/celpip/reading/free-test?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/celpip/reading/free-test?checkout=canceled`,
      metadata: {
        service: 'celpip-reading-simulator',
        product: CELPIP_READING_PRODUCT_NAME,
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
        amountCAD: CELPIP_READING_PRICE_CAD.toFixed(2),
        interval: CELPIP_READING_BILLING_INTERVAL,
        displayPriceCAD: CELPIP_READING_PRICE_CAD,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to create checkout session' }),
    };
  }
}
