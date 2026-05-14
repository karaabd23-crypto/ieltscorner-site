import Stripe from 'stripe';
import {
  PTE_CORE_PREMIUM_BILLING_INTERVAL,
  PTE_CORE_PREMIUM_PRICE_CAD,
  PTE_CORE_PREMIUM_PRODUCT_NAME,
} from '../../src/lib/pteCoreBilling.mjs';
import {
  getSafeBaseUrl,
  isSameOriginRequest,
} from './_utils/requestSecurity.mjs';
import { resolvePteCorePriceId } from './_utils/pteCoreStripe.mjs';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();

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

  try {
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
    const priceId = await resolvePteCorePriceId();
    const baseUrl = getSafeBaseUrl(event);
    let payload = {};
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      payload = {};
    }

    const customerEmail = String(payload?.customerEmail || '').trim().toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      customer_email: customerEmail || undefined,
      success_url: `${baseUrl}/pte-core/simulator?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pte-core/simulator?checkout=canceled`,
      metadata: {
        service: 'pte-core-premium',
        product: PTE_CORE_PREMIUM_PRODUCT_NAME,
      },
      line_items: [
        {
          quantity: 1,
          price: priceId,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkoutUrl: session.url,
        amountCAD: PTE_CORE_PREMIUM_PRICE_CAD.toFixed(2),
        interval: PTE_CORE_PREMIUM_BILLING_INTERVAL,
        displayPriceCAD: PTE_CORE_PREMIUM_PRICE_CAD,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to create checkout session' }),
    };
  }
}
