import { getUser } from '@netlify/identity';
import {
  ensureAccountForUser,
  jsonResponse,
  parseJsonRequest,
  recordAuditEvent,
  sanitizeProfileInput,
  saveAccount,
} from './_utils/celpipAccounts.mjs';

export default async function accountUpdateProfile(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to update your profile.' });
  }

  try {
    let account = await ensureAccountForUser(user);
    const payload = await parseJsonRequest(request);
    const profile = sanitizeProfileInput(payload, account);

    account = await saveAccount({
      ...account,
      ...profile,
    });
    await recordAuditEvent(account.accountId, 'account.profile_updated', profile);

    return jsonResponse(200, {
      ok: true,
      account,
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to update your profile.',
    });
  }
}
