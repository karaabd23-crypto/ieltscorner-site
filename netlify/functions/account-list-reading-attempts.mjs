import { getUser } from '@netlify/identity';
import {
  ensureAccountForUser,
  jsonResponse,
  listReadingAttempts,
  summarizeAttemptRecord,
} from './_utils/celpipAccounts.mjs';

export default async function accountListReadingAttempts(request) {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to view your reading history.' });
  }

  try {
    const account = await ensureAccountForUser(user);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 12);
    const attempts = await listReadingAttempts(account.accountId, limit);
    return jsonResponse(200, {
      ok: true,
      attempts: attempts.map((attempt) => summarizeAttemptRecord(attempt)),
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to load reading history.',
    });
  }
}
