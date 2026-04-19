import { getUser } from '@netlify/identity';
import {
  attachReadingSubscriptionFromSession,
  claimReadingSubscriptionByVerifiedEmail,
  ensureAccountForUser,
  jsonResponse,
  parseJsonRequest,
  summarizeStripeState,
} from './_utils/celpipAccounts.mjs';

export default async function accountClaimReadingSubscription(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to claim your subscription.' });
  }

  try {
    const payload = await parseJsonRequest(request);
    let account = await ensureAccountForUser(user);
    const sessionId = String(payload?.sessionId || '').trim();

    account = sessionId
      ? await attachReadingSubscriptionFromSession({ account, sessionId })
      : await claimReadingSubscriptionByVerifiedEmail(account);

    return jsonResponse(200, {
      ok: true,
      account,
      entitlement: summarizeStripeState(account.stripe),
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to claim your subscription.',
    });
  }
}
