import Stripe from 'stripe';
import crypto from 'crypto';
import { getStore } from '@netlify/blobs';
import { isSameOriginRequest } from './_utils/requestSecurity.mjs';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const EBOOK_DOWNLOAD_SECRET = (process.env.EBOOK_DOWNLOAD_SECRET || '').trim();
const EBOOK_PAYMENT_LINK_ID = (process.env.EBOOK_PAYMENT_LINK_ID || '').trim();
const EBOOK_AMOUNT_CENTS = Number.parseInt(process.env.EBOOK_AMOUNT_CENTS || '4950', 10);
const MAX_DOWNLOADS = 2;
const TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes
const STORE_NAME = 'ebook-downloads-v1';

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

  // Fallback: match by amount
  return Number(session.amount_total ?? 0) === EBOOK_AMOUNT_CENTS;
}

function signToken(sessionId, expiresAt) {
  if (!EBOOK_DOWNLOAD_SECRET) throw new Error('EBOOK_DOWNLOAD_SECRET not configured.');
  const payload = `${sessionId}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', EBOOK_DOWNLOAD_SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isSameOriginRequest(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (!STRIPE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration.' }) };
  }

  if (!EBOOK_DOWNLOAD_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration.' }) };
  }

  let sessionId;
  try {
    const body = JSON.parse(event.body || '{}');
    sessionId = String(body?.sessionId || '').trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid session ID.' }) };
  }

  try {
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_link'],
    });

    if (!isEbookPurchase(session)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'This session does not correspond to a valid eBook purchase.' }),
      };
    }

    const store = getStore(STORE_NAME);
    const storeKey = `session/${sessionId}`;
    let record = await store.get(storeKey, { type: 'json' }).catch(() => null);

    if (!record) {
      record = {
        sessionId,
        customerEmail: session.customer_details?.email || null,
        customerName: session.customer_details?.name || null,
        downloadCount: 0,
        firstDownloadAt: null,
        lastDownloadAt: null,
      };
    }

    if (record.downloadCount >= MAX_DOWNLOADS) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          allowed: false,
          downloadsUsed: record.downloadCount,
          maxDownloads: MAX_DOWNLOADS,
          reason: 'Download limit reached.',
        }),
      };
    }

    // Increment before issuing the token
    record.downloadCount += 1;
    record.lastDownloadAt = new Date().toISOString();
    if (!record.firstDownloadAt) record.firstDownloadAt = record.lastDownloadAt;

    await store.setJSON(storeKey, record);

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const token = signToken(sessionId, expiresAt);

    return {
      statusCode: 200,
      body: JSON.stringify({
        allowed: true,
        downloadsUsed: record.downloadCount,
        maxDownloads: MAX_DOWNLOADS,
        downloadsRemaining: MAX_DOWNLOADS - record.downloadCount,
        token,
        expiresAt,
      }),
    };
  } catch (error) {
    console.error('[get-ebook-download]', error);
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || 'Server error.' }) };
  }
}
