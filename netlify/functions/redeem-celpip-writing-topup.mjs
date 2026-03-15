import Stripe from 'stripe';
import {
  CELPIP_WRITING_TOPUP_CREDITS,
  CELPIP_WRITING_TOPUP_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';

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
    const { topupSessionId } = JSON.parse(event.body || '{}');
    if (!topupSessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'topupSessionId is required' }) };
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });

    // Retrieve and validate the top-up checkout session
    const session = await stripe.checkout.sessions.retrieve(topupSessionId);

    if (session.mode !== 'payment') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'This session is not a valid one-time top-up payment.' }),
      };
    }

    if (session.payment_status !== 'paid') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Payment is not complete. Status: ${session.payment_status}` }),
      };
    }

    if (session.metadata?.service !== 'celpip-writing-topup') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `This checkout session is not for ${CELPIP_WRITING_TOPUP_PRODUCT_NAME}.` }),
      };
    }

    const creditsGranted = Math.max(1, Number(session.metadata?.credits || CELPIP_WRITING_TOPUP_CREDITS));
    const customerId = extractId(session.customer);

    if (!customerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No customer found on this checkout session. Cannot add credits.' }),
      };
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Customer account no longer exists.' }),
      };
    }

    // Idempotency: check if this topup session was already redeemed
    const redeemedSessions = String(customer.metadata?.celpip_redeemed_topups || '');
    if (redeemedSessions.split(',').filter(Boolean).includes(topupSessionId)) {
      const currentTopupCredits = Math.max(0, Number(customer.metadata?.celpip_topup_credits || '0'));
      return {
        statusCode: 200,
        body: JSON.stringify({
          alreadyRedeemed: true,
          topupCredits: currentTopupCredits,
          message: 'These credits were already added to your account.',
        }),
      };
    }

    // Add credits and mark session as redeemed
    const currentTopupCredits = Math.max(0, Number(customer.metadata?.celpip_topup_credits || '0'));
    const newTopupCredits = currentTopupCredits + creditsGranted;

    // Keep the redeemed-sessions list compact (last 10 entries)
    const sessionList = redeemedSessions.split(',').filter(Boolean);
    sessionList.push(topupSessionId);
    const updatedRedeemedSessions = sessionList.slice(-10).join(',');

    await stripe.customers.update(customerId, {
      metadata: {
        celpip_topup_credits: String(newTopupCredits),
        celpip_redeemed_topups: updatedRedeemedSessions,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        creditsAdded: creditsGranted,
        topupCredits: newTopupCredits,
        customerId,
        message: `${creditsGranted} extra evaluation${creditsGranted !== 1 ? 's' : ''} added to your account.`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Failed to redeem top-up credits' }),
    };
  }
}
