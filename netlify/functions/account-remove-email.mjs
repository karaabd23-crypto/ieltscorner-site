import { getUser } from '@netlify/identity';
import {
  ensureAccountForUser,
  jsonResponse,
  parseJsonRequest,
  removeAliasEmail,
} from './_utils/celpipAccounts.mjs';

export default async function accountRemoveEmail(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to remove an email.' });
  }

  try {
    const payload = await parseJsonRequest(request);
    const email = String(payload?.email || '').trim();
    const account = await ensureAccountForUser(user);
    const nextAccount = await removeAliasEmail({ account, email });
    return jsonResponse(200, {
      ok: true,
      account: nextAccount,
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to remove that email.',
    });
  }
}
