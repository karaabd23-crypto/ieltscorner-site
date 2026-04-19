import { getUser } from '@netlify/identity';
import {
  createReadingPortalUrl,
  ensureAccountForUser,
  getBaseUrlFromRequest,
  jsonResponse,
  syncReadingEntitlement,
} from './_utils/celpipAccounts.mjs';

export default async function accountCreateReadingPortal(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to manage your subscription.' });
  }

  try {
    let account = await ensureAccountForUser(user);
    const entitlementState = await syncReadingEntitlement(account);
    account = entitlementState.account;

    if (!entitlementState.entitlement.active) {
      return jsonResponse(400, { error: 'No active CELPIP Reading subscription was found for this account.' });
    }

    const portalUrl = await createReadingPortalUrl({
      account,
      baseUrl: getBaseUrlFromRequest(request),
    });

    return jsonResponse(200, {
      ok: true,
      portalUrl,
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to open the billing portal.',
    });
  }
}
