import { getUser } from '@netlify/identity';
import {
  addAliasEmail,
  ensureAccountForUser,
  getBaseUrlFromRequest,
  jsonResponse,
  parseJsonRequest,
} from './_utils/celpipAccounts.mjs';

export default async function accountAddEmail(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to add another email.' });
  }

  try {
    const payload = await parseJsonRequest(request);
    const email = String(payload?.email || '').trim();
    const account = await ensureAccountForUser(user);
    await addAliasEmail({
      account,
      email,
      baseUrl: getBaseUrlFromRequest(request),
    });

    return jsonResponse(200, {
      ok: true,
      message: 'Verification email sent.',
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to add that email.',
    });
  }
}
