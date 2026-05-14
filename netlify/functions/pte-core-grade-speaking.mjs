import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { connectLambda, getStore } from '@netlify/blobs';
import { PTE_CORE_PREMIUM_PRODUCT_NAME } from '../../src/lib/pteCoreBilling.mjs';
import { subscriptionHasPteCorePrice } from './_utils/pteCoreStripe.mjs';
import { getHeader, isSameOriginRequest } from './_utils/requestSecurity.mjs';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const OPENAI_MODEL = (process.env.PTE_SPEAKING_OPENAI_MODEL || process.env.PTE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
const TRANSCRIPTION_MODEL = (process.env.PTE_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe').trim();
const REAL_AI_ENABLED = (process.env.PTE_AI_SPEAKING_ENABLED || process.env.PTE_AI_GRADING_ENABLED || '').toLowerCase() === 'true';
const FREE_DAILY_LIMIT = Math.max(0, Number(process.env.PTE_AI_SPEAKING_FREE_DAILY_LIMIT || process.env.PTE_AI_FREE_DAILY_LIMIT || 1) || 1);
const GLOBAL_DAILY_LIMIT = Math.max(0, Number(process.env.PTE_AI_SPEAKING_GLOBAL_DAILY_LIMIT || process.env.PTE_AI_GLOBAL_DAILY_LIMIT || 50) || 50);
const STORE_NAME = 'pte-core-ai-speaking';
const DAILY_PREFIX = 'daily/';
const GLOBAL_DAILY_PREFIX = 'global-daily/';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AUDIO_BASE64_CHARS = 5_500_000;
const MAX_TEXT_CHARS = 4000;
const VALID_TASKS = new Set(['read-aloud', 'repeat-sentence', 'describe-image', 'respond-to-a-situation', 'answer-short-question']);

const memoryDailyCounts = new Map();
const memoryGlobalDailyCounts = new Map();

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function normalizeText(value, maxLength = MAX_TEXT_CHARS) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getClientIp(event) {
  return (
    getHeader(event, 'x-nf-client-connection-ip')
    || getHeader(event, 'x-forwarded-for').split(',')[0]?.trim()
    || getHeader(event, 'client-ip')
    || 'unknown'
  );
}

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

function buildPlan({ tier = 'free', sessionId = '' } = {}) {
  const premium = tier === 'premium';
  return {
    tier: premium ? 'premium' : 'free',
    freeDailyLimit: FREE_DAILY_LIMIT,
    globalDailyLimit: GLOBAL_DAILY_LIMIT,
    upgradePath: '/pte-core/simulator',
    upgradeAvailable: !premium,
    product: PTE_CORE_PREMIUM_PRODUCT_NAME,
    sessionId: premium ? sessionId : undefined,
  };
}

function getMemoryEntry(map, key) {
  const entry = map.get(key) || { count: 0, startedAt: Date.now() };
  if (Date.now() - entry.startedAt > DAY_MS) {
    map.delete(key);
    return { count: 0, startedAt: Date.now() };
  }
  return entry;
}

async function getDailyCount({ clientIp, canUseBlobs }) {
  const key = `${DAILY_PREFIX}${getTodayKey()}/${hashValue(clientIp || 'unknown')}`;
  if (canUseBlobs) {
    try {
      const existing = await getStore(STORE_NAME).get(key, { type: 'json' });
      return Number(existing?.count) || 0;
    } catch {}
  }
  return getMemoryEntry(memoryDailyCounts, key).count;
}

async function incrementDailyCount({ clientIp, canUseBlobs }) {
  const key = `${DAILY_PREFIX}${getTodayKey()}/${hashValue(clientIp || 'unknown')}`;
  if (canUseBlobs) {
    try {
      const store = getStore(STORE_NAME);
      const existing = await store.get(key, { type: 'json' });
      await store.setJSON(key, { count: (Number(existing?.count) || 0) + 1, updatedAt: new Date().toISOString() });
      return;
    } catch {}
  }
  const entry = getMemoryEntry(memoryDailyCounts, key);
  memoryDailyCounts.set(key, { ...entry, count: entry.count + 1 });
}

async function getGlobalDailyCount({ canUseBlobs }) {
  const key = `${GLOBAL_DAILY_PREFIX}${getTodayKey()}`;
  if (canUseBlobs) {
    try {
      const existing = await getStore(STORE_NAME).get(key, { type: 'json' });
      return Number(existing?.count) || 0;
    } catch {}
  }
  return getMemoryEntry(memoryGlobalDailyCounts, key).count;
}

async function incrementGlobalDailyCount({ canUseBlobs }) {
  const key = `${GLOBAL_DAILY_PREFIX}${getTodayKey()}`;
  if (canUseBlobs) {
    try {
      const store = getStore(STORE_NAME);
      const existing = await store.get(key, { type: 'json' });
      await store.setJSON(key, { count: (Number(existing?.count) || 0) + 1, updatedAt: new Date().toISOString() });
      return;
    } catch {}
  }
  const entry = getMemoryEntry(memoryGlobalDailyCounts, key);
  memoryGlobalDailyCounts.set(key, { ...entry, count: entry.count + 1 });
}

async function validatePremiumSession(sessionId) {
  const cleanSessionId = normalizeText(sessionId, 160);
  if (!cleanSessionId) return { valid: false, reason: 'No PTE Core premium session provided.' };
  if (!STRIPE_API_KEY) return { valid: false, reason: 'Premium access cannot be checked because STRIPE_API_KEY is missing.' };

  const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
  const session = await stripe.checkout.sessions.retrieve(cleanSessionId, { expand: ['subscription'] });
  if (session.mode !== 'subscription' || session.status !== 'complete') {
    return { valid: false, reason: 'PTE Core premium checkout is not complete.' };
  }

  const subscriptionId = extractId(session.subscription);
  const subscription = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
  if (!subscription || !['active', 'trialing'].includes(String(subscription.status || '').toLowerCase())) {
    return { valid: false, reason: 'PTE Core premium subscription is not active.' };
  }

  if (!(await subscriptionHasPteCorePrice(stripe, subscription))) {
    return { valid: false, reason: `Subscription does not include the required ${PTE_CORE_PREMIUM_PRODUCT_NAME} price.` };
  }

  return { valid: true, sessionId: cleanSessionId, subscriptionId };
}

function buildRuleBasedGrade({ taskSlug, prompt, transcript, notes }) {
  const text = normalizeText(transcript || notes, MAX_TEXT_CHARS);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const promptTerms = normalizeText(prompt).toLowerCase().split(/\W+/).filter((term) => term.length > 4);
  const matchedTerms = promptTerms.filter((term) => text.toLowerCase().includes(term));
  const coverage = promptTerms.length ? matchedTerms.length / Math.max(promptTerms.length, 1) : 0.5;
  const lengthScore = taskSlug === 'answer-short-question'
    ? Math.max(35, Math.min(85, 55 + wordCount * 8))
    : Math.max(35, Math.min(82, 42 + wordCount * 2));
  const overallScore = Math.round(Math.max(30, Math.min(84, lengthScore * 0.72 + coverage * 28)));

  return {
    evaluationSource: 'rule-based',
    taskSlug,
    transcript: text,
    wordCount,
    overallScore,
    readiness: overallScore >= 70 ? 'Controlled practice response' : 'Needs clearer spoken control',
    summary: 'This speaking review uses transcript and response-structure signals. Enable real AI speaking grading for deeper pronunciation and fluency diagnostics.',
    scores: {
      content: Math.max(0, Math.min(90, Math.round(overallScore + coverage * 6))),
      fluency: Math.max(0, Math.min(90, overallScore - 2)),
      pronunciation: Math.max(0, Math.min(90, overallScore - 4)),
      vocabulary: Math.max(0, Math.min(90, overallScore)),
      form: Math.max(0, Math.min(90, taskSlug === 'answer-short-question' ? 80 : overallScore - 1)),
    },
    strengths: [
      text ? 'A spoken response was captured for review.' : 'The task was opened and prepared for a spoken response.',
      matchedTerms.length ? 'The response includes language connected to the prompt.' : 'The response can be improved by echoing more key prompt meaning.',
    ],
    priorities: [
      'Record in one steady attempt and avoid long pauses.',
      'Use simple, complete phrasing before adding detail.',
      'Review the transcript and re-record any unclear sections.',
    ],
  };
}

async function transcribeAudio({ audioBase64, mimeType }) {
  if (!audioBase64) return '';
  if (audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
    throw new Error('Audio recording is too large. Record a shorter response and try again.');
  }

  const bytes = Buffer.from(audioBase64, 'base64');
  const extension = String(mimeType || '').includes('mp4') ? 'mp4' : 'webm';
  const formData = new FormData();
  formData.append('model', TRANSCRIPTION_MODEL);
  formData.append('file', new Blob([bytes], { type: mimeType || 'audio/webm' }), `pte-speaking.${extension}`);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`OpenAI transcription error ${response.status}: ${text}`);
  try {
    const json = JSON.parse(text);
    return normalizeText(json.text, MAX_TEXT_CHARS);
  } catch {
    return normalizeText(text, MAX_TEXT_CHARS);
  }
}

async function requestAiGrade({ taskSlug, taskLabel, prompt, instructions, transcript, fallback }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_output_tokens: 900,
      input: [
        {
          role: 'system',
          content: [
            'You are a strict but supportive PTE Core speaking coach.',
            'Return only JSON. Do not claim this is an official Pearson score.',
            'Use a 0-90 scale for content, fluency, pronunciation, vocabulary, and form.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({ taskSlug, taskLabel, prompt, instructions, transcript }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'pte_core_speaking_grade',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              overallScore: { type: 'number' },
              readiness: { type: 'string' },
              summary: { type: 'string' },
              scores: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  content: { type: 'number' },
                  fluency: { type: 'number' },
                  pronunciation: { type: 'number' },
                  vocabulary: { type: 'number' },
                  form: { type: 'number' },
                },
                required: ['content', 'fluency', 'pronunciation', 'vocabulary', 'form'],
              },
              strengths: { type: 'array', items: { type: 'string' } },
              priorities: { type: 'array', items: { type: 'string' } },
            },
            required: ['overallScore', 'readiness', 'summary', 'scores', 'strengths', 'priorities'],
          },
        },
      },
    }),
  });

  const responseText = await response.text();
  if (!response.ok) throw new Error(`OpenAI speaking grade error ${response.status}: ${responseText}`);
  const parsed = JSON.parse(responseText);
  const outputText = parsed.output_text || parsed.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('\n');
  const raw = JSON.parse(outputText);

  return {
    ...fallback,
    ...raw,
    evaluationSource: 'openai',
    transcript,
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });
  if (!isSameOriginRequest(event)) return jsonResponse(403, { error: 'Cross-origin requests are not allowed.' });

  const canUseBlobs = Boolean(event?.blobs);
  if (canUseBlobs) connectLambda(event);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON request body.' });
  }

  const taskSlug = normalizeText(body.taskSlug, 80);
  const taskLabel = normalizeText(body.taskLabel, 120);
  const prompt = normalizeText(body.prompt, 2500);
  const instructions = normalizeText(body.instructions, 1000);
  const notes = normalizeText(body.notes, MAX_TEXT_CHARS);
  const audioBase64 = String(body.audioBase64 || '').trim();
  const mimeType = normalizeText(body.mimeType, 120) || 'audio/webm';
  const sessionId = normalizeText(body.sessionId, 160);

  if (!VALID_TASKS.has(taskSlug) || !prompt) {
    return jsonResponse(400, { error: 'Only PTE Core speaking tasks can be graded here.' });
  }

  let premiumAccess = { valid: false };
  if (sessionId) {
    try {
      premiumAccess = await validatePremiumSession(sessionId);
    } catch (error) {
      return jsonResponse(402, { error: error?.message || 'Unable to validate PTE Core premium access.', plan: buildPlan() });
    }
    if (!premiumAccess.valid) return jsonResponse(402, { error: premiumAccess.reason || 'PTE Core premium access is not active.', plan: buildPlan() });
  }

  const plan = premiumAccess.valid ? buildPlan({ tier: 'premium', sessionId: premiumAccess.sessionId }) : buildPlan();
  const clientIp = getClientIp(event);
  if (!premiumAccess.valid && FREE_DAILY_LIMIT > 0 && await getDailyCount({ clientIp, canUseBlobs }) >= FREE_DAILY_LIMIT) {
    return jsonResponse(429, { error: 'Daily free PTE speaking grading limit reached. Unlock PTE Core Premium to continue.', plan });
  }
  if (!premiumAccess.valid && GLOBAL_DAILY_LIMIT > 0 && await getGlobalDailyCount({ canUseBlobs }) >= GLOBAL_DAILY_LIMIT) {
    return jsonResponse(429, { error: 'Today\'s site-wide free PTE speaking grading pool has been used. Unlock PTE Core Premium to continue.', plan });
  }

  let transcript = notes;
  let payload;
  try {
    if (REAL_AI_ENABLED && OPENAI_API_KEY && audioBase64) {
      transcript = await transcribeAudio({ audioBase64, mimeType });
    }

    const fallback = buildRuleBasedGrade({ taskSlug, prompt, transcript, notes });
    payload = {
      ...fallback,
      aiEnabled: REAL_AI_ENABLED,
      model: REAL_AI_ENABLED ? OPENAI_MODEL : 'rule-based',
      plan,
    };

    if (REAL_AI_ENABLED && OPENAI_API_KEY) {
      if (!premiumAccess.valid) {
        await incrementDailyCount({ clientIp, canUseBlobs });
        await incrementGlobalDailyCount({ canUseBlobs });
      }
      payload = {
        ...(await requestAiGrade({ taskSlug, taskLabel, prompt, instructions, transcript, fallback })),
        aiEnabled: true,
        model: OPENAI_MODEL,
        transcriptionModel: audioBase64 ? TRANSCRIPTION_MODEL : null,
        plan,
      };
    }
  } catch (error) {
    const fallback = buildRuleBasedGrade({ taskSlug, prompt, transcript, notes });
    payload = {
      ...fallback,
      evaluationSource: 'rule-based-fallback',
      summary: `${fallback.summary} Real AI speaking grading could not complete: ${normalizeText(error?.message, 160)}`,
      aiEnabled: REAL_AI_ENABLED,
      model: 'rule-based-fallback',
      plan,
    };
  }

  return jsonResponse(200, payload);
}
