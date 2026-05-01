import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { getStore } from '@netlify/blobs';
import { isSameOriginRequest } from './_utils/requestSecurity.mjs';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const EBOOK_PAYMENT_LINK_ID = (process.env.EBOOK_PAYMENT_LINK_ID || '').trim();
const EBOOK_PAYMENT_LINK_IDS = (process.env.EBOOK_PAYMENT_LINK_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const EBOOK_AMOUNT_CENTS = Number.parseInt(process.env.EBOOK_AMOUNT_CENTS || '4950', 10);
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_PASSWORD = (process.env.GMAIL_PASSWORD || '').trim();
const EBOOK_FILE_URL = (process.env.EBOOK_FILE_URL || '').trim();
const STORE_NAME = 'ebook-downloads-v1';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getPaymentLinkId(paymentLink) {
  if (!paymentLink) return '';
  if (typeof paymentLink === 'string') return paymentLink;
  if (typeof paymentLink === 'object' && typeof paymentLink.id === 'string') return paymentLink.id;
  return '';
}

function isEbookPurchase(session) {
  if (session.payment_status !== 'paid') return false;
  if (session.mode !== 'payment') return false;

  const sessionPaymentLinkId = getPaymentLinkId(session.payment_link);
  const allowedPaymentLinkIds = new Set([
    ...EBOOK_PAYMENT_LINK_IDS,
    EBOOK_PAYMENT_LINK_ID,
  ].filter(Boolean));

  if (allowedPaymentLinkIds.size > 0 && sessionPaymentLinkId) {
    if (allowedPaymentLinkIds.has(sessionPaymentLinkId)) return true;
    // Controlled fallback for legacy/rotated links: require exact ebook amount.
    return Number(session.amount_total ?? 0) === EBOOK_AMOUNT_CENTS;
  }

  return Number(session.amount_total ?? 0) === EBOOK_AMOUNT_CENTS;
}

function buildEmailHtml(customerName, downloadUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f6f4f3;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:16px;">
        <table role="presentation" style="width:100%;max-width:640px;background:#fff;border:1px solid #e9e1dc;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#d94848;padding:18px 24px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;">YOUR EBOOK IS READY</h1>
              <p style="margin:6px 0 0;color:#ffeaea;font-size:14px;">CELPIP Speaking: The Complete Preparation Guide</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 22px;">
              <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#1d1d1d;">Hi ${customerName},</p>
              <p style="margin:0 0 14px;color:#2b2b2b;line-height:1.5;">Thank you for your purchase. Your 109-page CELPIP speaking guide is attached to this email as a PDF.</p>
              <p style="margin:0 0 14px;color:#2b2b2b;line-height:1.5;">The guide covers all 8 CELPIP speaking tasks with scored sample responses at every CLB level, response frames, grammar drills, and a 4-week study plan.</p>
              ${downloadUrl ? `<p style="margin:0 0 8px;color:#555;font-size:14px;">You can also download the file directly: <a href="${downloadUrl}" style="color:#d94848;">${downloadUrl}</a></p>` : ''}
              <p style="margin:14px 0 0;color:#555;font-size:13px;border-top:1px solid #eee;padding-top:12px;">If you have questions or need support, reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f1ef;padding:12px 22px;border-top:1px solid #e6ddd7;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1f1f1f;">IELTS Corner</p>
              <p style="margin:0;font-size:12px;color:#666;">${GMAIL_USER} | ieltscorner.ca</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmailWithAttachment({ toEmail, customerName, pdfBuffer, pdfFilename }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASSWORD },
  });

  await transporter.sendMail({
    from: `IELTS Corner <${GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your CELPIP Speaking eBook - IELTS Corner',
    text: `Hi ${customerName},\n\nYour 109-page CELPIP speaking guide is attached.\n\nIELTS Corner\nieltscorner.ca`,
    html: buildEmailHtml(customerName, EBOOK_FILE_URL),
    attachments: [
      {
        filename: pdfFilename || 'CELPIP-Speaking-Guide.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isSameOriginRequest(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (!STRIPE_API_KEY || !GMAIL_USER || !GMAIL_PASSWORD) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration.' }) };
  }

  if (!EBOOK_FILE_URL) {
    return { statusCode: 500, body: JSON.stringify({ error: 'eBook file not configured.' }) };
  }

  let sessionId, toEmail;
  try {
    const body = JSON.parse(event.body || '{}');
    sessionId = String(body?.sessionId || '').trim();
    toEmail = String(body?.email || '').trim().toLowerCase();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid session ID.' }) };
  }

  if (!EMAIL_PATTERN.test(toEmail)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address.' }) };
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

    let store = null;
    let storeKey = '';
    let record = null;
    let storeAvailable = true;

    try {
      store = getStore(STORE_NAME);
      storeKey = `session/${sessionId}`;
      record = await store.get(storeKey, { type: 'json' }).catch(() => null);
    } catch (storeError) {
      storeAvailable = false;
      console.warn('[send-ebook-email] Blobs unavailable, skipping store persistence.', storeError);
    }

    if (!record) {
      // First interaction - create the record
      record = {
        sessionId,
        customerEmail: session.customer_details?.email || null,
        customerName: session.customer_details?.name || null,
        downloadCount: 0,
        firstDownloadAt: null,
        lastDownloadAt: null,
        emailSentAt: null,
      };
    }

    const customerName = session.customer_details?.name || toEmail.split('@')[0];

    // Fetch the PDF from its hosted URL and attach it
    const pdfResponse = await fetch(EBOOK_FILE_URL);
    if (!pdfResponse.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to retrieve eBook file.' }) };
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    await sendEmailWithAttachment({
      toEmail,
      customerName,
      pdfBuffer,
      pdfFilename: 'CELPIP-Speaking-Guide-IELTS-Corner.pdf',
    });

    record.emailSentAt = new Date().toISOString();
    record.emailSentTo = toEmail;
    if (storeAvailable) {
      await store.setJSON(storeKey, record);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, to: toEmail }),
    };
  } catch (error) {
    console.error('[send-ebook-email]', error);
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || 'Failed to send email.' }) };
  }
}
