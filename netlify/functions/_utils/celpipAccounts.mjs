import crypto from 'crypto';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { getStore } from '@netlify/blobs';
import { normalizeSubscriberEmail } from '../../../scripts/lib/newsletter-audience.mjs';
import {
  CELPIP_READING_BILLING_INTERVAL,
  CELPIP_READING_FREE_TEST,
  CELPIP_READING_LEVEL_GUIDE,
  CELPIP_READING_PRICE_CAD,
  CELPIP_READING_PRODUCT_NAME,
  gradeReadingAttempt,
} from '../../../src/lib/celpipReadingData.mjs';
import { getConfiguredReadingPriceId, subscriptionHasReadingPrice } from './celpipReadingStripe.mjs';

const ACCOUNT_STORE_NAME = 'celpip-reading-accounts-v1';
const KIT_API_BASE = 'https://api.kit.com/v4';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALIAS_TOKEN_TTL_MS = 1000 * 60 * 60 * 48;
const DEFAULT_COUNTRY = 'Canada';
const PORTAL_CONFIGURATION_NAME = 'CELPIP Reading Self-Serve Billing';
const PORTAL_CONFIGURATION_KEY = 'celpip-reading-simulator';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const PRICE_ID = getConfiguredReadingPriceId();
const KIT_API_KEY = (process.env.KIT_API_KEY || '').trim();
const KIT_FORM_ID = Number.parseInt((process.env.KIT_FORM_ID || '').trim(), 10) || null;
const KIT_DIGEST_FORM_ID = Number.parseInt((process.env.KIT_DIGEST_FORM_ID || '').trim(), 10) || KIT_FORM_ID || 9278182;
const KIT_DEFAULT_TAG_ID = Number.parseInt((process.env.KIT_DEFAULT_TAG_ID || '').trim(), 10) || null;
const KIT_DIGEST_TAG_ID = Number.parseInt((process.env.KIT_DIGEST_TAG_ID || '').trim(), 10) || null;
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_PASSWORD = (process.env.GMAIL_PASSWORD || '').trim();
const ACCOUNT_EMAIL_FROM = (process.env.ACCOUNT_EMAIL_FROM || GMAIL_USER || '').trim();

function nowIso() {
  return new Date().toISOString();
}

export function jsonResponse(statusCode, payload) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function parseJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function normalizeEmail(value) {
  return normalizeSubscriberEmail(value);
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return Boolean(email && email.length <= 320 && EMAIL_PATTERN.test(email));
}

export function normalizeDisplayName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

export function normalizeContactValue(value, maxLength = 120) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function getStoreInstance() {
  return getStore(ACCOUNT_STORE_NAME);
}

function accountPath(userId) {
  return `accounts/by-user/${userId}`;
}

function emailPath(email) {
  return `accounts/by-email/${normalizeEmail(email)}`;
}

function verificationTokenPath(token) {
  return `accounts/verification/${token}`;
}

function auditPath(accountId) {
  return `accounts/audit/${accountId}/${Date.now()}-${crypto.randomUUID()}`;
}

function latestReadingStatePath(accountId) {
  return `accounts/reading-latest/${accountId}`;
}

function readingAttemptPath(accountId, attemptId) {
  return `accounts/reading-attempts/${accountId}/${attemptId}`;
}

function buildAccountId() {
  return `acct_${crypto.randomUUID()}`;
}

function baseAccountFromUser(user) {
  const primaryEmail = normalizeEmail(user?.email);
  const displayName = normalizeDisplayName(
    user?.name
      || user?.userMetadata?.full_name
      || user?.userMetadata?.name
      || ''
  );
  const createdAt = nowIso();

  return {
    accountId: buildAccountId(),
    userId: String(user?.id || '').trim(),
    primaryLoginEmail: primaryEmail,
    primaryContactEmail: primaryEmail,
    displayName,
    timezone: String(user?.userMetadata?.timezone || '').trim(),
    country: String(user?.userMetadata?.country || DEFAULT_COUNTRY).trim(),
    phone: String(user?.userMetadata?.phone || '').trim(),
    whatsapp: String(user?.userMetadata?.whatsapp || '').trim(),
    contactEmails: primaryEmail
      ? [
        {
          email: primaryEmail,
          verified: true,
          primary: true,
          source: 'identity-primary',
          addedAt: createdAt,
          verifiedAt: createdAt,
          kitSyncedAt: null,
        },
      ]
      : [],
    stripe: {
      customerId: '',
      subscriptionId: '',
      sessionId: '',
      status: 'inactive',
      priceId: '',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      lastSyncedAt: null,
      claimedAt: null,
      matchedEmail: '',
    },
    progress: {
      latestAttemptId: '',
      latestSubmittedAttemptId: '',
      attemptCount: 0,
      lastActivityAt: null,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function sanitizeContactEmails(contactEmails, primaryLoginEmail) {
  const normalized = [];
  const seen = new Set();

  for (const entry of Array.isArray(contactEmails) ? contactEmails : []) {
    const email = normalizeEmail(entry?.email);
    if (!isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    normalized.push({
      email,
      verified: Boolean(entry?.verified),
      primary: Boolean(entry?.primary),
      source: String(entry?.source || 'account').trim() || 'account',
      addedAt: String(entry?.addedAt || nowIso()),
      verifiedAt: entry?.verifiedAt ? String(entry.verifiedAt) : null,
      kitSyncedAt: entry?.kitSyncedAt ? String(entry.kitSyncedAt) : null,
    });
  }

  if (primaryLoginEmail && !seen.has(primaryLoginEmail)) {
    normalized.unshift({
      email: primaryLoginEmail,
      verified: true,
      primary: true,
      source: 'identity-primary',
      addedAt: nowIso(),
      verifiedAt: nowIso(),
      kitSyncedAt: null,
    });
  }

  if (!normalized.length) {
    return [];
  }

  const forcedPrimary = normalizeEmail(
    normalized.find((item) => item.primary)?.email
      || primaryLoginEmail
      || normalized[0].email
  );

  return normalized.map((item) => ({
    ...item,
    primary: item.email === forcedPrimary,
    verified: item.email === primaryLoginEmail ? true : Boolean(item.verified),
    verifiedAt: item.email === primaryLoginEmail
      ? item.verifiedAt || nowIso()
      : item.verifiedAt,
  }));
}

export function summarizeStripeState(stripeState = {}) {
  return {
    active: stripeState?.status === 'active' || stripeState?.status === 'trialing',
    status: String(stripeState?.status || 'inactive'),
    cancelAtPeriodEnd: Boolean(stripeState?.cancelAtPeriodEnd),
    currentPeriodEnd: stripeState?.currentPeriodEnd || null,
    productName: CELPIP_READING_PRODUCT_NAME,
    priceId: String(stripeState?.priceId || ''),
    displayPriceCad: CELPIP_READING_PRICE_CAD,
    interval: CELPIP_READING_BILLING_INTERVAL,
  };
}

export function summarizeAttemptRecord(attempt = {}) {
  const report = attempt?.report || {};
  const level = report?.level || CELPIP_READING_LEVEL_GUIDE.at(-1);
  return {
    attemptId: String(attempt?.attemptId || ''),
    status: String(attempt?.status || ''),
    startedAt: attempt?.startedAt || null,
    updatedAt: attempt?.updatedAt || null,
    submittedAt: attempt?.submittedAt || null,
    answered: Number(report?.answered || 0),
    total: Number(report?.total || 0),
    correct: Number(report?.correct || 0),
    level: level
      ? {
        level: Number(level.level),
        label: String(level.label || ''),
        descriptor: String(level.descriptor || ''),
      }
      : null,
    timeRemaining: Number.isFinite(Number(attempt?.timeRemaining))
      ? Number(attempt.timeRemaining)
      : null,
  };
}

export async function getAccountByUserId(userId) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return null;
  const store = getStoreInstance();
  return store.get(accountPath(normalizedUserId), { type: 'json' });
}

export async function getAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) return null;

  const store = getStoreInstance();
  const lookup = await store.get(emailPath(normalizedEmail), { type: 'json' });
  if (!lookup?.userId) return null;
  const account = await getAccountByUserId(lookup.userId);
  return account || null;
}

export async function saveAccount(account) {
  const normalizedUserId = String(account?.userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('Missing account user id.');
  }

  const store = getStoreInstance();
  const primaryLoginEmail = normalizeEmail(account?.primaryLoginEmail);
  const contactEmails = sanitizeContactEmails(account?.contactEmails, primaryLoginEmail);
  const primaryContactEmail = normalizeEmail(
    account?.primaryContactEmail
      || contactEmails.find((item) => item.primary)?.email
      || primaryLoginEmail
  );

  const next = {
    ...account,
    primaryLoginEmail,
    primaryContactEmail,
    displayName: normalizeDisplayName(account?.displayName),
    timezone: normalizeContactValue(account?.timezone, 80),
    country: normalizeContactValue(account?.country || DEFAULT_COUNTRY, 80),
    phone: normalizeContactValue(account?.phone, 40),
    whatsapp: normalizeContactValue(account?.whatsapp, 40),
    contactEmails,
    updatedAt: nowIso(),
  };

  await store.setJSON(accountPath(normalizedUserId), next);

  const knownEmails = new Set();
  for (const entry of contactEmails) {
    knownEmails.add(entry.email);
    await store.setJSON(emailPath(entry.email), {
      accountId: next.accountId,
      userId: next.userId,
      email: entry.email,
      verified: Boolean(entry.verified),
      primary: Boolean(entry.primary),
      updatedAt: next.updatedAt,
    });
  }

  return next;
}

export async function recordAuditEvent(accountId, type, details = {}) {
  const normalizedAccountId = String(accountId || '').trim();
  if (!normalizedAccountId) return;
  const store = getStoreInstance();
  await store.setJSON(auditPath(normalizedAccountId), {
    accountId: normalizedAccountId,
    type: String(type || '').trim() || 'unknown',
    details,
    createdAt: nowIso(),
  });
}

export async function ensureAccountForUser(user) {
  const userId = String(user?.id || '').trim();
  if (!userId) {
    throw new Error('Authenticated user id is required.');
  }

  const primaryEmail = normalizeEmail(user?.email);
  let account = await getAccountByUserId(userId);
  const created = !account;

  if (!account) {
    account = baseAccountFromUser(user);
  } else {
    account = {
      ...account,
      primaryLoginEmail: primaryEmail || account.primaryLoginEmail || '',
      displayName: account.displayName || normalizeDisplayName(user?.name || user?.userMetadata?.full_name || ''),
      timezone: account.timezone || String(user?.userMetadata?.timezone || '').trim(),
      country: account.country || String(user?.userMetadata?.country || DEFAULT_COUNTRY).trim(),
      phone: account.phone || String(user?.userMetadata?.phone || '').trim(),
      whatsapp: account.whatsapp || String(user?.userMetadata?.whatsapp || '').trim(),
    };
  }

  account.contactEmails = sanitizeContactEmails(account.contactEmails, primaryEmail);
  account.primaryContactEmail = normalizeEmail(
    account.primaryContactEmail
      || account.contactEmails.find((entry) => entry.primary)?.email
      || primaryEmail
  );

  account = await saveAccount(account);

  if (created) {
    await recordAuditEvent(account.accountId, 'account.created', {
      primaryLoginEmail: account.primaryLoginEmail,
    });
  }

  const primaryContact = account.contactEmails.find((entry) => entry.email === account.primaryLoginEmail);
  if (primaryContact?.verified && !primaryContact.kitSyncedAt) {
    try {
      await syncEmailToKit({
        email: primaryContact.email,
        firstName: account.displayName,
        source: 'account-primary',
      });
      primaryContact.kitSyncedAt = nowIso();
      account = await saveAccount(account);
    } catch (error) {
      await recordAuditEvent(account.accountId, 'kit.sync_failed', {
        email: primaryContact.email,
        reason: error?.message || 'Unknown Kit sync failure',
      });
    }
  }

  return account;
}

function kitHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Kit-Api-Key': KIT_API_KEY,
  };
}

async function kitRequest(path, body) {
  const response = await fetch(`${KIT_API_BASE}${path}`, {
    method: 'POST',
    headers: kitHeaders(),
    body: JSON.stringify(body || {}),
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(json?.errors) ? json.errors[0] : null;
    throw new Error(String(firstError || text || `Kit HTTP ${response.status}`).slice(0, 240));
  }

  return {
    status: response.status,
    body: json,
  };
}

export async function syncEmailToKit({ email, firstName = '', source = 'account' }) {
  const normalizedEmail = normalizeEmail(email);
  if (!KIT_API_KEY || !isValidEmail(normalizedEmail)) {
    return { enabled: Boolean(KIT_API_KEY), synced: false };
  }

  await kitRequest('/subscribers', {
    email_address: normalizedEmail,
    first_name: normalizeDisplayName(firstName) || null,
    state: 'active',
    fields: {
      source,
    },
  });

  const digestResult = await kitRequest(`/forms/${KIT_DIGEST_FORM_ID}/subscribers`, {
    email_address: normalizedEmail,
    referrer: String(process.env.URL || 'https://ieltscorner.ca').trim(),
  });

  if (KIT_DEFAULT_TAG_ID) {
    await kitRequest(`/tags/${KIT_DEFAULT_TAG_ID}/subscribers`, {
      email_address: normalizedEmail,
    });
  }

  if (KIT_DIGEST_TAG_ID) {
    await kitRequest(`/tags/${KIT_DIGEST_TAG_ID}/subscribers`, {
      email_address: normalizedEmail,
    });
  }

  return {
    enabled: true,
    synced: true,
    duplicate: digestResult.status !== 201,
  };
}

function verificationEmailHtml({ displayName, email, verificationUrl }) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f6f4f1;font-family:Arial,sans-serif;color:#1f2933;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d9;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 28px;background:#f7e8e3;border-bottom:1px solid #ead6cf;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8f3434;">IELTS Corner Account</p>
        <h1 style="margin:0;font-size:28px;line-height:1.15;color:#233240;">Verify your contact email</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${displayName ? `Hi ${displayName},` : 'Hi,'}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">You added <strong>${email}</strong> to your IELTS Corner account. Confirm it to use it for account notices, subscription recovery, and Kit digest emails.</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">This link stays active for 48 hours.</p>
        <p style="margin:0 0 24px;">
          <a href="${verificationUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#d94848;color:#ffffff;text-decoration:none;font-weight:700;">Verify email</a>
        </p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#52606d;">If the button does not open, copy and paste this URL into your browser:</p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#52606d;word-break:break-all;">${verificationUrl}</p>
      </div>
    </div>
  </body>
</html>`;
}

function verificationEmailText({ displayName, email, verificationUrl }) {
  return [
    displayName ? `Hi ${displayName},` : 'Hi,',
    '',
    `You added ${email} to your IELTS Corner account.`,
    'Confirm it to use it for account notices, subscription recovery, and Kit digest emails.',
    '',
    `Verify here: ${verificationUrl}`,
    '',
    'This link stays active for 48 hours.',
  ].join('\n');
}

async function sendAliasVerificationEmail({ account, email, verificationUrl }) {
  if (!GMAIL_USER || !GMAIL_PASSWORD || !ACCOUNT_EMAIL_FROM) {
    throw new Error('Missing Gmail account email credentials for alias verification.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `IELTS Corner <${ACCOUNT_EMAIL_FROM}>`,
    to: email,
    subject: 'Verify your IELTS Corner account email',
    text: verificationEmailText({
      displayName: account.displayName,
      email,
      verificationUrl,
    }),
    html: verificationEmailHtml({
      displayName: account.displayName,
      email,
      verificationUrl,
    }),
  });
}

export function getBaseUrlFromRequest(request) {
  const envCandidates = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.SITE_URL];
  for (const candidate of envCandidates) {
    const value = String(candidate || '').trim().replace(/\/$/, '');
    if (value.startsWith('https://') || value.startsWith('http://')) {
      return value;
    }
  }

  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'https://ieltscorner.ca';
  }
}

export async function addAliasEmail({ account, email, baseUrl }) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const existingAccount = await getAccountByEmail(normalizedEmail);
  if (existingAccount && existingAccount.accountId !== account.accountId) {
    throw new Error('That email is already attached to another account.');
  }

  if (account.contactEmails.some((entry) => entry.email === normalizedEmail)) {
    throw new Error('That email is already on this account.');
  }

  const createdAt = nowIso();
  account.contactEmails.push({
    email: normalizedEmail,
    verified: false,
    primary: false,
    source: 'account-alias',
    addedAt: createdAt,
    verifiedAt: null,
    kitSyncedAt: null,
  });
  account = await saveAccount(account);

  const token = `verify_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + ALIAS_TOKEN_TTL_MS).toISOString();
  const store = getStoreInstance();
  await store.setJSON(verificationTokenPath(token), {
    token,
    accountId: account.accountId,
    userId: account.userId,
    email: normalizedEmail,
    createdAt,
    expiresAt,
  });

  const verificationUrl = `${baseUrl}/account/emails?verify_email_token=${encodeURIComponent(token)}`;
  await sendAliasVerificationEmail({ account, email: normalizedEmail, verificationUrl });
  await recordAuditEvent(account.accountId, 'account.alias_added', {
    email: normalizedEmail,
  });
  return account;
}

export async function verifyAliasEmailToken(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('Missing verification token.');
  }

  const store = getStoreInstance();
  const record = await store.get(verificationTokenPath(normalizedToken), { type: 'json' });
  if (!record?.userId || !record?.email) {
    throw new Error('That verification link is invalid or has already been used.');
  }

  if (Date.parse(String(record.expiresAt || '')) < Date.now()) {
    await store.delete(verificationTokenPath(normalizedToken));
    throw new Error('That verification link has expired. Please request a new one.');
  }

  let account = await getAccountByUserId(record.userId);
  if (!account) {
    throw new Error('We could not find the account for this verification link.');
  }

  let verifiedEntry = null;
  account.contactEmails = account.contactEmails.map((entry) => {
    if (entry.email !== normalizeEmail(record.email)) {
      return entry;
    }

    verifiedEntry = {
      ...entry,
      verified: true,
      verifiedAt: nowIso(),
    };
    return verifiedEntry;
  });

  if (!verifiedEntry) {
    throw new Error('That email is no longer attached to this account.');
  }

  try {
    await syncEmailToKit({
      email: verifiedEntry.email,
      firstName: account.displayName,
      source: 'account-alias-verified',
    });
    verifiedEntry.kitSyncedAt = nowIso();
    account.contactEmails = account.contactEmails.map((entry) => (
      entry.email === verifiedEntry.email ? verifiedEntry : entry
    ));
  } catch (error) {
    await recordAuditEvent(account.accountId, 'kit.sync_failed', {
      email: verifiedEntry.email,
      reason: error?.message || 'Unknown Kit sync failure',
    });
  }

  account = await saveAccount(account);
  await store.delete(verificationTokenPath(normalizedToken));
  await recordAuditEvent(account.accountId, 'account.alias_verified', {
    email: verifiedEntry.email,
  });
  return account;
}

export async function removeAliasEmail({ account, email }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Missing email address.');
  }

  if (normalizedEmail === account.primaryLoginEmail) {
    throw new Error('The primary login email cannot be removed from the account.');
  }

  const existing = account.contactEmails.find((entry) => entry.email === normalizedEmail);
  if (!existing) {
    throw new Error('That email is not on this account.');
  }

  const primaryFallback = normalizeEmail(
    existing.primary
      ? account.contactEmails.find((entry) => entry.email !== normalizedEmail)?.email || account.primaryLoginEmail
      : account.primaryContactEmail
  );

  account.contactEmails = account.contactEmails.filter((entry) => entry.email !== normalizedEmail);
  account.primaryContactEmail = primaryFallback;
  account = await saveAccount(account);
  await getStoreInstance().delete(emailPath(normalizedEmail));
  await recordAuditEvent(account.accountId, 'account.alias_removed', {
    email: normalizedEmail,
  });
  return account;
}

export async function setPrimaryContactEmail({ account, email }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = account.contactEmails.find((entry) => entry.email === normalizedEmail);
  if (!existing?.verified) {
    throw new Error('Only verified emails can be used as the primary contact email.');
  }

  account.primaryContactEmail = normalizedEmail;
  account.contactEmails = account.contactEmails.map((entry) => ({
    ...entry,
    primary: entry.email === normalizedEmail,
  }));
  account = await saveAccount(account);
  await recordAuditEvent(account.accountId, 'account.primary_contact_changed', {
    email: normalizedEmail,
  });
  return account;
}

export function sanitizeProfileInput(input = {}, fallback = {}) {
  return {
    displayName: normalizeDisplayName(input.displayName ?? fallback.displayName ?? ''),
    timezone: normalizeContactValue(input.timezone ?? fallback.timezone ?? '', 80),
    country: normalizeContactValue(input.country ?? fallback.country ?? DEFAULT_COUNTRY, 80),
    phone: normalizeContactValue(input.phone ?? fallback.phone ?? '', 40),
    whatsapp: normalizeContactValue(input.whatsapp ?? fallback.whatsapp ?? '', 40),
  };
}

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

function getStripeClient() {
  if (!STRIPE_API_KEY) {
    throw new Error('Missing STRIPE_API_KEY.');
  }
  return new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
}

function normalizeSubscriptionSummary({ subscription, customerId = '', sessionId = '', matchedEmail = '' }) {
  return {
    customerId,
    subscriptionId: extractId(subscription),
    sessionId,
    status: String(subscription?.status || 'inactive'),
    priceId: String(subscription?.items?.data?.[0]?.price?.id || PRICE_ID || ''),
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    currentPeriodEnd: subscription?.current_period_end || null,
    claimedAt: nowIso(),
    lastSyncedAt: nowIso(),
    matchedEmail,
  };
}

async function hydrateSubscription(stripe, subscriptionRef) {
  const subscriptionId = extractId(subscriptionRef);
  if (!subscriptionId) return null;
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function attachReadingSubscriptionFromSession({ account, sessionId }) {
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) {
    throw new Error('Missing checkout session id.');
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(normalizedSessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription' || session.status !== 'complete') {
    throw new Error('This checkout session is not a completed reading subscription.');
  }

  const subscription = await hydrateSubscription(stripe, session.subscription);
  if (!subscription || !(await subscriptionHasReadingPrice(stripe, subscription))) {
    throw new Error(`This checkout session does not include the ${CELPIP_READING_PRODUCT_NAME} plan.`);
  }

  const customerId = extractId(session.customer);
  const matchedEmail = normalizeEmail(session.customer_details?.email || account.primaryLoginEmail);
  account.stripe = {
    ...account.stripe,
    ...normalizeSubscriptionSummary({
      subscription,
      customerId,
      sessionId: normalizedSessionId,
      matchedEmail,
    }),
  };
  account = await saveAccount(account);
  await recordAuditEvent(account.accountId, 'subscription.claimed_from_session', {
    customerId,
    subscriptionId: account.stripe.subscriptionId,
    sessionId: normalizedSessionId,
    matchedEmail,
  });
  return account;
}

async function findMatchingReadingSubscriptionByEmails(verifiedEmails) {
  const stripe = getStripeClient();

  for (const email of verifiedEmails) {
    const customers = await stripe.customers.list({
      email,
      limit: 10,
    });

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 20,
      });

      let match = null;
      for (const subscription of subscriptions.data) {
        const isActiveSubscription = ['active', 'trialing'].includes(String(subscription.status || '').toLowerCase());
        if (!isActiveSubscription) continue;
        if (await subscriptionHasReadingPrice(stripe, subscription)) {
          match = subscription;
          break;
        }
      }

      if (match) {
        return {
          customerId: customer.id,
          matchedEmail: email,
          subscription: match,
        };
      }
    }
  }

  return null;
}

export async function claimReadingSubscriptionByVerifiedEmail(account) {
  const verifiedEmails = account.contactEmails
    .filter((entry) => entry.verified)
    .map((entry) => entry.email);

  if (!verifiedEmails.length) {
    throw new Error('Add and verify at least one account email before claiming a subscription.');
  }

  const match = await findMatchingReadingSubscriptionByEmails(verifiedEmails);
  if (!match) {
    throw new Error('No active CELPIP Reading subscription was found for your verified emails.');
  }

  account.stripe = {
    ...account.stripe,
    ...normalizeSubscriptionSummary({
      subscription: match.subscription,
      customerId: match.customerId,
      matchedEmail: match.matchedEmail,
    }),
    sessionId: account.stripe.sessionId || '',
  };
  account = await saveAccount(account);
  await recordAuditEvent(account.accountId, 'subscription.claimed_by_email', {
    customerId: match.customerId,
    subscriptionId: account.stripe.subscriptionId,
    matchedEmail: match.matchedEmail,
  });
  return account;
}

export async function syncReadingEntitlement(account) {
  if (!account?.stripe?.subscriptionId) {
    return {
      account,
      entitlement: summarizeStripeState(account?.stripe),
    };
  }

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(account.stripe.subscriptionId);
    account.stripe = {
      ...account.stripe,
      ...normalizeSubscriptionSummary({
        subscription,
        customerId: account.stripe.customerId,
        sessionId: account.stripe.sessionId,
        matchedEmail: account.stripe.matchedEmail,
      }),
    };
    account = await saveAccount(account);
  } catch (error) {
    await recordAuditEvent(account.accountId, 'subscription.sync_failed', {
      reason: error?.message || 'Unknown Stripe sync failure',
    });
  }

  return {
    account,
    entitlement: summarizeStripeState(account.stripe),
  };
}

async function ensurePortalConfiguration(stripe, baseUrl) {
  const existingConfigurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });

  const existing = existingConfigurations.data.find(
    (configuration) => configuration.metadata?.service === PORTAL_CONFIGURATION_KEY,
  );

  if (existing?.id) {
    return existing.id;
  }

  const created = await stripe.billingPortal.configurations.create({
    name: PORTAL_CONFIGURATION_NAME,
    default_return_url: `${baseUrl}/account/subscription`,
    business_profile: {
      headline: 'Manage your CELPIP Reading subscription',
      privacy_policy_url: `${baseUrl}/privacy`,
      terms_of_service_url: `${baseUrl}/terms`,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email'],
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'missing_features', 'unused', 'switched_service', 'other'],
        },
      },
    },
    metadata: {
      service: PORTAL_CONFIGURATION_KEY,
    },
  });

  return created.id;
}

export async function createReadingPortalUrl({ account, baseUrl }) {
  if (!account?.stripe?.customerId) {
    throw new Error('No active Stripe customer was found for this account.');
  }

  const stripe = getStripeClient();
  const configurationId = await ensurePortalConfiguration(stripe, baseUrl);
  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripe.customerId,
    configuration: configurationId,
    return_url: `${baseUrl}/account/subscription`,
  });

  return session.url;
}

function buildAttemptId() {
  return `attempt_${crypto.randomUUID()}`;
}

export async function saveReadingProgress({ account, payload = {} }) {
  const store = getStoreInstance();
  const currentAttemptId = String(payload.attemptId || '').trim() || buildAttemptId();
  const answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  const flagged = payload.flagged && typeof payload.flagged === 'object' ? payload.flagged : {};
  const hasSubmitted = payload.hasSubmitted === true;
  const startedAt = payload.startedAt ? String(payload.startedAt) : nowIso();
  const updatedAt = nowIso();
  const report = gradeReadingAttempt(CELPIP_READING_FREE_TEST, answers);

  const nextState = {
    attemptId: currentAttemptId,
    status: hasSubmitted ? 'submitted' : 'in_progress',
    startedAt,
    updatedAt,
    submittedAt: hasSubmitted ? String(payload.submittedAt || updatedAt) : null,
    answers,
    flagged,
    timeRemaining: Number.isFinite(Number(payload.timeRemaining))
      ? Number(payload.timeRemaining)
      : Number(CELPIP_READING_FREE_TEST.durationMinutes || 60) * 60,
    report,
  };

  await store.setJSON(latestReadingStatePath(account.accountId), nextState);

  let alreadyCounted = false;
  if (hasSubmitted) {
    alreadyCounted = Boolean(await store.get(readingAttemptPath(account.accountId, currentAttemptId), { type: 'json' }));
    await store.setJSON(readingAttemptPath(account.accountId, currentAttemptId), nextState);
  }

  account.progress = {
    ...account.progress,
    latestAttemptId: currentAttemptId,
    latestSubmittedAttemptId: hasSubmitted ? currentAttemptId : (account.progress?.latestSubmittedAttemptId || ''),
    attemptCount: hasSubmitted
      ? Math.max(Number(account.progress?.attemptCount || 0), 0) + (alreadyCounted ? 0 : 1)
      : Number(account.progress?.attemptCount || 0),
    lastActivityAt: updatedAt,
  };
  account = await saveAccount(account);

  return {
    account,
    attempt: nextState,
  };
}

export async function getLatestReadingProgress(accountId) {
  if (!accountId) return null;
  const store = getStoreInstance();
  return store.get(latestReadingStatePath(accountId), { type: 'json' });
}

export async function listReadingAttempts(accountId, limit = 12) {
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 12));
  const store = getStoreInstance();
  const prefix = `accounts/reading-attempts/${accountId}/`;
  const rows = [];

  for await (const page of store.list({ prefix, paginate: true })) {
    for (const blob of page.blobs || []) {
      const attempt = await store.get(blob.key, { type: 'json' });
      if (attempt) {
        rows.push(attempt);
      }
    }
  }

  return rows
    .sort((a, b) => Date.parse(String(b?.submittedAt || b?.updatedAt || '')) - Date.parse(String(a?.submittedAt || a?.updatedAt || '')))
    .slice(0, normalizedLimit);
}
