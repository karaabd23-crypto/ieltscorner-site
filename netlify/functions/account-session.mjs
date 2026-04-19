import { getUser } from '@netlify/identity';
import {
  ensureAccountForUser,
  getLatestReadingProgress,
  jsonResponse,
  summarizeAttemptRecord,
  summarizeStripeState,
  syncReadingEntitlement,
} from './_utils/celpipAccounts.mjs';

export default async function accountSession(request) {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(200, {
      authenticated: false,
      user: null,
      account: null,
      entitlement: summarizeStripeState(),
      latestAttempt: null,
    });
  }

  try {
    let account = await ensureAccountForUser(user);
    const entitlementState = await syncReadingEntitlement(account);
    account = entitlementState.account;
    const latestAttempt = await getLatestReadingProgress(account.accountId);

    return jsonResponse(200, {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email || null,
        name: user.name || null,
        provider: user.provider || null,
      },
      account: {
        accountId: account.accountId,
        primaryLoginEmail: account.primaryLoginEmail,
        primaryContactEmail: account.primaryContactEmail,
        displayName: account.displayName,
        timezone: account.timezone,
        country: account.country,
        phone: account.phone,
        whatsapp: account.whatsapp,
        contactEmails: account.contactEmails,
        progress: account.progress,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      entitlement: entitlementState.entitlement,
      latestAttempt: latestAttempt ? summarizeAttemptRecord(latestAttempt) : null,
      latestAttemptState: latestAttempt || null,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error?.message || 'Unable to load account session.',
    });
  }
}
