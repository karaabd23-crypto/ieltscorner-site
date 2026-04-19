import {
  jsonResponse,
  parseJsonRequest,
  verifyAliasEmailToken,
} from './_utils/celpipAccounts.mjs';

export default async function accountVerifyEmail(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const payload = await parseJsonRequest(request);
    const token = String(payload?.token || '').trim();
    const account = await verifyAliasEmailToken(token);
    return jsonResponse(200, {
      ok: true,
      account,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to verify that email.',
    });
  }
}
