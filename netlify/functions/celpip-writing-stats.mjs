import Stripe from 'stripe';
import { connectLambda, getStore } from '@netlify/blobs';
import { isSameOriginRequest } from './_utils/requestSecurity.mjs';

const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const STATS_STORE_NAME = 'celpip-writing-stats';
const FREE_USER_PREFIX = 'free-users/';
const DAILY_SUBMISSION_PREFIX = 'daily-submissions/';

async function getFreeEvaluationUserCount() {
  try {
    const store = getStore(STATS_STORE_NAME);
    let total = 0;

    for await (const page of store.list({ prefix: FREE_USER_PREFIX, paginate: true })) {
      total += Array.isArray(page?.blobs) ? page.blobs.length : 0;
    }

    return total;
  } catch (error) {
    console.warn('[celpip-stats] Unable to load free evaluation count:', error?.message || error);
    return null;
  }
}

function getDailySubmissionKey(date = new Date()) {
  return `${DAILY_SUBMISSION_PREFIX}${date.toISOString().slice(0, 10)}`;
}

async function getEssaysSubmittedToday() {
  try {
    const store = getStore(STATS_STORE_NAME);
    const key = getDailySubmissionKey();
    const entry = await store.get(key, { type: 'json' });
    return Number(entry?.count) || 0;
  } catch (error) {
    console.warn('[celpip-stats] Unable to load daily submission count:', error?.message || error);
    return 0;
  }
}

async function getActiveSubscriberCount() {
  if (!STRIPE_API_KEY) return null;

  try {
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
    let count = 0;
    let hasMore = true;
    let startingAfter;

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        ...(PRICE_ID ? { price: PRICE_ID } : {}),
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      count += page.data.length;
      hasMore = page.has_more;
      startingAfter = hasMore ? page.data[page.data.length - 1]?.id : undefined;
    }

    return count;
  } catch (error) {
    console.warn('[celpip-stats] Unable to load subscriber count:', error?.message || error);
    return null;
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isSameOriginRequest(event)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Cross-origin requests are not allowed.' }),
    };
  }

  const canUseBlobs = Boolean(event?.blobs);
  if (canUseBlobs) {
    connectLambda(event);
  }

  const [freeEvaluationUsers, essaysSubmittedToday, subscriberCount] = await Promise.all([
    canUseBlobs ? getFreeEvaluationUserCount() : Promise.resolve(0),
    canUseBlobs ? getEssaysSubmittedToday() : Promise.resolve(0),
    getActiveSubscriberCount(),
  ]);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({
      freeEvaluationUsers: Number.isFinite(freeEvaluationUsers) ? freeEvaluationUsers : 0,
      essaysSubmittedToday: Number.isFinite(essaysSubmittedToday) ? essaysSubmittedToday : 0,
      subscriberCount: Number.isFinite(subscriberCount) ? subscriberCount : null,
    }),
  };
}
