import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import {
  ensureAccountForUser,
  jsonResponse,
  parseJsonRequest,
} from './_utils/celpipAccounts.mjs';

const STORE_NAME = 'celpip-reading-accounts-v1';
const MAX_ANSWER_CHARS = 6000;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, maxLength = MAX_ANSWER_CHARS) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanAnswer(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 12);
  return cleanText(value);
}

function cleanMap(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, answer]) => [cleanText(key, 120), cleanAnswer(answer)])
      .filter(([key]) => key),
  );
}

function buildAttemptId() {
  return `pte_attempt_${crypto.randomUUID()}`;
}

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

function latestPath(accountId) {
  return `accounts/pte-core-latest/${accountId}`;
}

function attemptPath(accountId, attemptId) {
  return `accounts/pte-core-attempts/${accountId}/${attemptId}`;
}

export default async function accountSavePteAttempt(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const user = await getUser();
  if (!user) {
    return jsonResponse(401, { error: 'Sign in to save PTE Core attempt history.' });
  }

  try {
    const payload = await parseJsonRequest(request);
    const account = await ensureAccountForUser(user);
    const answers = cleanMap(payload.answers);
    const flagged = payload.flagged && typeof payload.flagged === 'object' ? payload.flagged : {};
    const grades = payload.grades && typeof payload.grades === 'object' ? payload.grades : {};
    const speakingGrades = payload.speakingGrades && typeof payload.speakingGrades === 'object' ? payload.speakingGrades : {};
    const total = Math.max(0, Number(payload.total || 0));
    const answered = Object.values(answers).filter((answer) => Array.isArray(answer) ? answer.length : String(answer).trim()).length;
    const updatedAt = nowIso();
    const attemptId = cleanText(payload.attemptId, 120) || buildAttemptId();
    const submittedAt = cleanText(payload.submittedAt, 80) || updatedAt;

    const attempt = {
      attemptId,
      mode: cleanText(payload.mode, 40) || 'full',
      status: 'submitted',
      startedAt: cleanText(payload.startedAt, 80) || updatedAt,
      updatedAt,
      submittedAt,
      answers,
      flagged,
      grades,
      speakingGrades,
      report: {
        answered,
        total,
        flagged: Object.values(flagged).filter(Boolean).length,
        writingGrades: Object.keys(grades).length,
        speakingGrades: Object.keys(speakingGrades).length,
      },
    };

    const store = getStore(STORE_NAME);
    await store.setJSON(latestPath(account.accountId), attempt);
    await store.setJSON(attemptPath(account.accountId, attemptId), attempt);

    return jsonResponse(200, {
      ok: true,
      attempt: summarizePteAttempt(attempt),
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error?.message || 'Unable to save PTE Core attempt history.',
    });
  }
}

export { summarizePteAttempt };
