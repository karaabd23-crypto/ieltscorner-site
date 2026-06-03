#!/usr/bin/env node
/**
 * Sends a review-request email (Kit broadcast) to subscribers tagged
 * `review-request` (applied automatically when a customer buys 10+ tutoring
 * sessions; see netlify/functions/validate-tutoring-session.mjs).
 *
 * Kit's free plan has no visual automations/sequences, so we use a scheduled
 * broadcast instead — the same pattern as scripts/send-newsletter-digest.mjs.
 * Run on a schedule (see .github/workflows/kit-review-requests.yml).
 *
 *   node scripts/send-review-requests.mjs --dry-run   (no send; prints plan)
 *   node scripts/send-review-requests.mjs             (creates + schedules send)
 *
 * Env: KIT_API_KEY required. KIT_REVIEW_REQUEST_TAG_ID defaults to 20024389.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const KIT_API_BASE = process.env.KIT_API_BASE || 'https://api.kit.com/v4';
const REVIEW_TAG_ID = process.env.KIT_REVIEW_REQUEST_TAG_ID || '20024389';
// Subscribers already emailed are moved here so they are not re-asked weekly.
const REVIEW_REQUESTED_TAG_ID = process.env.KIT_REVIEW_REQUESTED_TAG_ID || '20024405';
const REVIEW_FORM_URL = process.env.REVIEW_FORM_URL || 'https://ieltscorner.ca/contact/';
const SEND_DELAY_MINUTES = Number.parseInt(process.env.KIT_BROADCAST_SEND_DELAY_MINUTES || '5', 10);
const DRY_RUN = process.argv.includes('--dry-run');

function stripQuotes(v) {
  const t = v.trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
    ? t.slice(1, -1)
    : t;
}

async function loadEnvFile(file) {
  try {
    const content = await readFile(file, 'utf8');
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i <= 0) continue;
      const key = line.slice(0, i).trim();
      if (process.env[key] === undefined) process.env[key] = stripQuotes(line.slice(i + 1));
    }
  } catch { /* ignore missing */ }
}

async function kitRequest(apiKey, pathName, method = 'POST', body = undefined) {
  const res = await fetch(`${KIT_API_BASE}${pathName}`, {
    method,
    headers: { 'X-Kit-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) {
    throw new Error(`Kit ${method} ${pathName} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return parsed;
}

const SUBJECT = 'Quick favour? Share your IELTS Corner experience';
const PREVIEW = 'A short review helps other learners decide. Two minutes, if you have them.';

function buildHtml() {
  return [
    '<p>Hi there,</p>',
    '<p>You have done a real stretch of work with IELTS Corner, and that means a lot. ',
    'If it has helped, would you share a short review of your experience?</p>',
    '<p>It can be two or three sentences: where you started, what helped, and where you ended up. ',
    'With your permission we may publish it (first name and last initial only) to help other learners decide.</p>',
    `<p><a href="${REVIEW_FORM_URL}">Leave your review here</a></p>`,
    '<p>Thank you, and congratulations on the progress.</p>',
    '<p>— Kara, IELTS Corner</p>',
  ].join('\n');
}

async function main() {
  await loadEnvFile(path.join(process.cwd(), '.env'));
  await loadEnvFile(path.join(process.cwd(), '.env.local'));

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.error('[error] KIT_API_KEY is not set.');
    process.exit(1);
  }

  // Audience: tagged review-request AND not yet review-requested, so nobody is
  // asked more than once.
  const subscriberFilter = [
    {
      all: [{ type: 'tag', ids: [Number(REVIEW_TAG_ID)] }],
      any: null,
      none: [{ type: 'tag', ids: [Number(REVIEW_REQUESTED_TAG_ID)] }],
    },
  ];
  const sendAt = new Date(Date.now() + SEND_DELAY_MINUTES * 60 * 1000).toISOString();

  // Pull the pending recipients so we can mark them requested after sending.
  const pending = await kitRequest(
    apiKey,
    `/tags/${REVIEW_TAG_ID}/subscribers?per_page=500`,
    'GET'
  );
  const recipients = (pending?.subscribers || [])
    .map((s) => s.email_address)
    .filter(Boolean);

  if (DRY_RUN) {
    console.log('[dry-run] Review-request broadcast');
    console.log('  Subject:', SUBJECT);
    console.log('  Audience: tag', REVIEW_TAG_ID, 'minus tag', REVIEW_REQUESTED_TAG_ID);
    console.log('  Subscribers on review-request tag:', recipients.length);
    console.log('  Scheduled send_at:', sendAt);
    console.log('  Review form URL:', REVIEW_FORM_URL);
    return;
  }

  if (recipients.length === 0) {
    console.log('[skip] No pending review-request subscribers. Nothing to send.');
    return;
  }

  const payload = {
    subject: SUBJECT,
    preview_text: PREVIEW,
    content: buildHtml(),
    description: `Automated review request | ${new Date().toISOString().slice(0, 10)}`,
    public: false,
    published_at: new Date().toISOString(),
    send_at: sendAt,
    subscriber_filter: subscriberFilter,
  };

  const created = await kitRequest(apiKey, '/broadcasts', 'POST', payload);
  console.log('[ok] Review-request broadcast scheduled.');
  console.log('  Broadcast id:', created?.broadcast?.id);
  console.log('  Send at:', created?.broadcast?.send_at || sendAt);

  // Mark these recipients so the next run does not email them again.
  let tagged = 0;
  for (const email of recipients) {
    try {
      await kitRequest(apiKey, `/tags/${REVIEW_REQUESTED_TAG_ID}/subscribers`, 'POST', {
        email_address: email,
      });
      tagged += 1;
    } catch (err) {
      console.error('  [warn] could not mark requested:', email, err?.message || err);
    }
  }
  console.log(`[ok] Marked ${tagged}/${recipients.length} subscribers as review-requested.`);
}

main().catch((err) => {
  console.error('[error]', err?.message || err);
  process.exit(1);
});
