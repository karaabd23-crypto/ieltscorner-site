import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import {
  ensureAccountForUser,
  jsonResponse,
} from './_utils/celpipAccounts.mjs';

const STORE_NAME = 'celpip-reading-accounts-v1';

function summarizePteAttempt(attempt = {}) {
  return {
    attemptId: String(attempt.attemptId || ''),
    mode: String(attempt.mode || 'full'),
    status: String(attempt.status || 'submitted'),
    startedAt: attempt.startedAt || null,
    updatedAt: attempt.updatedAt || null,
    submittedAt: attempt.submittedAt || null,
    answered: Number(attempt.report?.answered || 0),
    total: Number(attempt.report?.total || 0),
    writingGrades: Number(attempt.report?.writingGrades || 0),
    speakingGrades: Number(attempt.report?.speakingGrades || 0),
    flagged: Number(attempt.report?.flagged || 0),
  };
}

export default async function accountListPteAttempts(request) {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to view PTE Core attempt history.' });
  }

  try {
    const account = await ensureAccountForUser(user);
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 12)));
    const store = getStore(STORE_NAME);
    const prefix = `accounts/pte-core-attempts/${account.accountId}/`;
    const attempts = [];

    for await (const page of store.list({ prefix, paginate: true })) {
      for (const blob of page.blobs || []) {
        const attempt = await store.get(blob.key, { type: 'json' });
        if (attempt) attempts.push(attempt);
      }
    }

    attempts.sort((a, b) => Date.parse(String(b.submittedAt || b.updatedAt || '')) - Date.parse(String(a.submittedAt || a.updatedAt || '')));

    return jsonResponse(200, {
      ok: true,
      attempts: attempts.slice(0, limit).map(summarizePteAttempt),
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to load PTE Core attempt history.',
    });
  }
}
