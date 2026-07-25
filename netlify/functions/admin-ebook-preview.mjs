import { withLambda } from '@netlify/aws-lambda-compat';
import Stripe from 'stripe';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const EBOOK_ADMIN_PREVIEW_TOKEN = (process.env.EBOOK_ADMIN_PREVIEW_TOKEN || '').trim();
const EBOOK_PAYMENT_LINK_ID = (process.env.EBOOK_PAYMENT_LINK_ID || '').trim();
const EBOOK_AMOUNT_CENTS = Number.parseInt(process.env.EBOOK_AMOUNT_CENTS || '4950', 10);
const SITE_URL = (process.env.SITE_URL || process.env.URL || 'https://ieltscorner.ca').replace(/\/$/, '');

function getPaymentLinkId(paymentLink) {
  if (!paymentLink) return '';
  if (typeof paymentLink === 'string') return paymentLink;
  if (typeof paymentLink === 'object' && typeof paymentLink.id === 'string') return paymentLink.id;
  return '';
}

function isEbookPurchase(session) {
  if (session.payment_status !== 'paid') return false;
  if (session.mode !== 'payment') return false;
  if (EBOOK_PAYMENT_LINK_ID) {
    return getPaymentLinkId(session.payment_link) === EBOOK_PAYMENT_LINK_ID;
  }
  return Number(session.amount_total ?? 0) === EBOOK_AMOUNT_CENTS;
}

async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!EBOOK_ADMIN_PREVIEW_TOKEN) {
    return { statusCode: 500, body: 'EBOOK_ADMIN_PREVIEW_TOKEN is not configured.' };
  }

  const token = String(event.queryStringParameters?.token || '').trim();
  if (!token || token !== EBOOK_ADMIN_PREVIEW_TOKEN) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  if (!STRIPE_API_KEY) {
    return { statusCode: 500, body: 'STRIPE_API_KEY is not configured.' };
  }

  try {
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });

    const explicitSessionId = String(event.queryStringParameters?.session_id || '').trim();
    let sessionId = explicitSessionId;

    if (!sessionId) {
      const sessions = await stripe.checkout.sessions.list({ limit: 50, expand: ['data.payment_link'] });
      const matched = sessions.data.find((session) => isEbookPurchase(session));
      if (!matched) {
        return { statusCode: 404, body: 'No paid ebook session found in recent Stripe sessions.' };
      }
      sessionId = matched.id;
    }

    const location = `${SITE_URL}/ebook/thank-you?session_id=${encodeURIComponent(sessionId)}`;
    return {
      statusCode: 302,
      headers: {
        Location: location,
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  } catch (error) {
    console.error('[admin-ebook-preview]', error);
    return { statusCode: 500, body: error?.message || 'Server error.' };
  }
}

export default withLambda(handler);
