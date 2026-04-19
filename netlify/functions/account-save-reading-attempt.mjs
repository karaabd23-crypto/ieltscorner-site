import { getUser } from '@netlify/identity';
import {
  ensureAccountForUser,
  jsonResponse,
  parseJsonRequest,
  saveReadingProgress,
  summarizeAttemptRecord,
} from './_utils/celpipAccounts.mjs';

export default async function accountSaveReadingAttempt(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to save reading progress.' });
  }

  try {
    const payload = await parseJsonRequest(request);
    const account = await ensureAccountForUser(user);
    const result = await saveReadingProgress({ account, payload });
    return jsonResponse(200, {
      ok: true,
      attempt: summarizeAttemptRecord(result.attempt),
      attemptState: result.attempt,
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to save reading progress.',
    });
  }
}
