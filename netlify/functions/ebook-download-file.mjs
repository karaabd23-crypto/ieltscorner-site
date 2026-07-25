import { withLambda } from '@netlify/aws-lambda-compat';
import crypto from 'crypto';

const EBOOK_DOWNLOAD_SECRET = (process.env.EBOOK_DOWNLOAD_SECRET || '').trim();
const EBOOK_FILE_URL = (process.env.EBOOK_FILE_URL || '').trim();

function verifyToken(token) {
  if (!EBOOK_DOWNLOAD_SECRET) return null;

  const parts = token.split(':');
  if (parts.length !== 3) return null;

  const [sessionId, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!sessionId || Number.isNaN(expiresAt)) return null;

  if (Date.now() > expiresAt) return null;

  const expectedPayload = `${sessionId}:${expiresAt}`;
  const expectedSig = crypto
    .createHmac('sha256', EBOOK_DOWNLOAD_SECRET)
    .update(expectedPayload)
    .digest('hex');

  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  return { sessionId, expiresAt };
}

async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!EBOOK_DOWNLOAD_SECRET) {
    return { statusCode: 500, body: 'Server misconfiguration.' };
  }

  if (!EBOOK_FILE_URL) {
    return { statusCode: 500, body: 'eBook file not configured.' };
  }

  const token = String(event.queryStringParameters?.token || '').trim();
  if (!token) {
    return { statusCode: 400, body: 'Missing download token.' };
  }

  const verified = verifyToken(token);
  if (!verified) {
    return {
      statusCode: 403,
      body: 'This download link has expired or is invalid. Return to the confirmation page to generate a new one (if downloads remain).',
    };
  }

  return {
    statusCode: 302,
    headers: {
      Location: EBOOK_FILE_URL,
      'Cache-Control': 'no-store',
    },
    body: '',
  };
}

export default withLambda(handler);
