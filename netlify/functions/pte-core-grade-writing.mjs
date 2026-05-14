import { createHash } from 'node:crypto';
import { connectLambda, getStore } from '@netlify/blobs';
import Stripe from 'stripe';
import { PTE_CORE_PREMIUM_PRODUCT_NAME } from '../../src/lib/pteCoreBilling.mjs';
import { subscriptionHasPteCorePrice } from './_utils/pteCoreStripe.mjs';
import {
  getHeader,
  isSameOriginRequest,
} from './_utils/requestSecurity.mjs';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const STRIPE_API_KEY = (process.env.STRIPE_API_KEY || '').trim();
const OPENAI_MODEL = (process.env.PTE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_TIMEOUT_MS = 25000;
const REAL_AI_ENABLED = (process.env.PTE_AI_GRADING_ENABLED || '').toLowerCase() === 'true';
const FREE_DAILY_LIMIT = Math.max(0, Number(process.env.PTE_AI_FREE_DAILY_LIMIT || process.env.PTE_AI_DAILY_LIMIT || 1) || 1);
const GLOBAL_DAILY_LIMIT = Math.max(0, Number(process.env.PTE_AI_GLOBAL_DAILY_LIMIT || 50) || 50);
const MAX_REQUEST_BODY_CHARS = 18000;
const MAX_RESPONSE_CHARS = 5000;
const MIN_WORDS_BY_TASK = {
  'summarize-written-text': 5,
  'write-email': 40,
};
const VALID_TASKS = new Set(Object.keys(MIN_WORDS_BY_TASK));
const STATS_STORE_NAME = 'pte-core-ai-grading';
const DAILY_PREFIX = 'daily/';
const GLOBAL_DAILY_PREFIX = 'global-daily/';
const CACHE_PREFIX = 'cache/';
const DAY_MS = 24 * 60 * 60 * 1000;
const UPGRADE_PATH = '/pte-core/simulator';

const memoryDailyCounts = new Map();
const memoryGlobalDailyCounts = new Map();
const memoryCache = new Map();

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

function normalizeText(value, maxLength = MAX_RESPONSE_CHARS) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeMultiline(value, maxLength = MAX_RESPONSE_CHARS) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function getClientIp(event) {
  return (
    getHeader(event, 'x-nf-client-connection-ip') ||
    getHeader(event, 'x-forwarded-for').split(',')[0]?.trim() ||
    getHeader(event, 'client-ip') ||
    'unknown'
  );
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
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
    upgradePath: UPGRADE_PATH,
    upgradeAvailable: !premium,
    product: PTE_CORE_PREMIUM_PRODUCT_NAME,
    sessionId: premium ? sessionId : undefined,
  };
}

function getWordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getMemoryDailyEntry(clientIp) {
  const key = `${getTodayKey()}::${hashValue(clientIp)}`;
  const entry = memoryDailyCounts.get(key) || { count: 0, startedAt: Date.now() };

  if (Date.now() - entry.startedAt > DAY_MS) {
    memoryDailyCounts.delete(key);
    return { key, entry: { count: 0, startedAt: Date.now() } };
  }

  return { key, entry };
}

async function getDailyCount({ clientIp, canUseBlobs }) {
  const ipHash = hashValue(clientIp || 'unknown');
  const key = `${DAILY_PREFIX}${getTodayKey()}/${ipHash}`;

  if (canUseBlobs) {
    try {
      const store = getStore(STATS_STORE_NAME);
      const existing = await store.get(key, { type: 'json' });
      return Number(existing?.count) || 0;
    } catch (error) {
      console.warn('[pte-core-grade] Unable to read daily count:', error?.message || error);
    }
  }

  return getMemoryDailyEntry(clientIp).entry.count;
}

async function incrementDailyCount({ clientIp, canUseBlobs }) {
  const ipHash = hashValue(clientIp || 'unknown');
  const key = `${DAILY_PREFIX}${getTodayKey()}/${ipHash}`;

  if (canUseBlobs) {
    try {
      const store = getStore(STATS_STORE_NAME);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = await store.getWithMetadata(key, { type: 'json' });
        if (!current) {
          const write = await store.setJSON(key, { count: 1, updatedAt: new Date().toISOString() }, { onlyIfNew: true });
          if (write?.modified) return;
          continue;
        }

        const count = Number(current.data?.count) || 0;
        const write = await store.setJSON(
          key,
          { count: count + 1, updatedAt: new Date().toISOString() },
          { onlyIfMatch: current.etag },
        );
        if (write?.modified) return;
      }
    } catch (error) {
      console.warn('[pte-core-grade] Unable to persist daily count:', error?.message || error);
    }
  }

  const { key: memoryKey, entry } = getMemoryDailyEntry(clientIp);
  memoryDailyCounts.set(memoryKey, { ...entry, count: entry.count + 1 });
}

function getMemoryGlobalDailyEntry() {
  const key = getTodayKey();
  const entry = memoryGlobalDailyCounts.get(key) || { count: 0, startedAt: Date.now() };

  if (Date.now() - entry.startedAt > DAY_MS) {
    memoryGlobalDailyCounts.delete(key);
    return { key, entry: { count: 0, startedAt: Date.now() } };
  }

  return { key, entry };
}

async function getGlobalDailyCount({ canUseBlobs }) {
  const key = `${GLOBAL_DAILY_PREFIX}${getTodayKey()}`;

  if (canUseBlobs) {
    try {
      const store = getStore(STATS_STORE_NAME);
      const existing = await store.get(key, { type: 'json' });
      return Number(existing?.count) || 0;
    } catch (error) {
      console.warn('[pte-core-grade] Unable to read global daily count:', error?.message || error);
    }
  }

  return getMemoryGlobalDailyEntry().entry.count;
}

async function incrementGlobalDailyCount({ canUseBlobs }) {
  const key = `${GLOBAL_DAILY_PREFIX}${getTodayKey()}`;

  if (canUseBlobs) {
    try {
      const store = getStore(STATS_STORE_NAME);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = await store.getWithMetadata(key, { type: 'json' });
        if (!current) {
          const write = await store.setJSON(key, { count: 1, updatedAt: new Date().toISOString() }, { onlyIfNew: true });
          if (write?.modified) return;
          continue;
        }

        const count = Number(current.data?.count) || 0;
        const write = await store.setJSON(
          key,
          { count: count + 1, updatedAt: new Date().toISOString() },
          { onlyIfMatch: current.etag },
        );
        if (write?.modified) return;
      }
    } catch (error) {
      console.warn('[pte-core-grade] Unable to persist global daily count:', error?.message || error);
    }
  }

  const { key: memoryKey, entry } = getMemoryGlobalDailyEntry();
  memoryGlobalDailyCounts.set(memoryKey, { ...entry, count: entry.count + 1 });
}

function buildCacheKey({ taskSlug, prompt, responseText }) {
  return hashValue(`${taskSlug}\n${prompt}\n${responseText}`);
}

async function getCachedGrade({ cacheKey, canUseBlobs }) {
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && Date.now() - memoryEntry.cachedAt < DAY_MS) {
    return { ...memoryEntry.payload, cached: true };
  }

  if (canUseBlobs) {
    try {
      const store = getStore(STATS_STORE_NAME);
      const cached = await store.get(`${CACHE_PREFIX}${cacheKey}`, { type: 'json' });
      if (cached?.payload && cached?.cachedAt && Date.now() - Date.parse(cached.cachedAt) < DAY_MS) {
        memoryCache.set(cacheKey, { payload: cached.payload, cachedAt: Date.parse(cached.cachedAt) });
        return { ...cached.payload, cached: true };
      }
    } catch (error) {
      console.warn('[pte-core-grade] Unable to read cached grade:', error?.message || error);
    }
  }

  return null;
}

async function setCachedGrade({ cacheKey, payload, canUseBlobs }) {
  const cachedAt = Date.now();
  memoryCache.set(cacheKey, { payload, cachedAt });

  if (memoryCache.size > 200) {
    for (const [key, entry] of memoryCache) {
      if (Date.now() - entry.cachedAt > DAY_MS) memoryCache.delete(key);
    }
  }

  if (canUseBlobs) {
    try {
      const store = getStore(STATS_STORE_NAME);
      await store.setJSON(`${CACHE_PREFIX}${cacheKey}`, {
        payload,
        cachedAt: new Date(cachedAt).toISOString(),
      });
    } catch (error) {
      console.warn('[pte-core-grade] Unable to cache grade:', error?.message || error);
    }
  }
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(90, Math.round(numeric)));
}

function normalizeGrade(raw, fallback) {
  const scores = raw?.scores && typeof raw.scores === 'object' ? raw.scores : {};
  const criteria = Array.isArray(raw?.criteria) ? raw.criteria : [];

  return {
    ...fallback,
    overallScore: clampScore(raw?.overallScore ?? fallback.overallScore),
    readiness: normalizeText(raw?.readiness || fallback.readiness, 80),
    summary: normalizeText(raw?.summary || fallback.summary, 600),
    scores: {
      content: clampScore(scores.content ?? fallback.scores.content),
      form: clampScore(scores.form ?? fallback.scores.form),
      grammar: clampScore(scores.grammar ?? fallback.scores.grammar),
      vocabulary: clampScore(scores.vocabulary ?? fallback.scores.vocabulary),
      coherence: clampScore(scores.coherence ?? fallback.scores.coherence),
    },
    strengths: Array.isArray(raw?.strengths) ? raw.strengths.map((item) => normalizeText(item, 180)).filter(Boolean).slice(0, 4) : fallback.strengths,
    priorities: Array.isArray(raw?.priorities) ? raw.priorities.map((item) => normalizeText(item, 180)).filter(Boolean).slice(0, 4) : fallback.priorities,
    criteria: criteria
      .map((item) => ({
        label: normalizeText(item?.label, 60),
        comment: normalizeText(item?.comment, 260),
      }))
      .filter((item) => item.label && item.comment)
      .slice(0, 5),
  };
}

function buildMockGrade({ taskSlug, responseText, wordCount }) {
  const isEmail = taskSlug === 'write-email';
  const hasGreeting = /\b(hello|dear|hi)\b/i.test(responseText);
  const hasClosing = /\b(thank you|regards|sincerely|best)\b/i.test(responseText);
  const sentenceCount = responseText.split(/[.!?]+/).filter((item) => item.trim().length > 5).length;
  const hasRequest = /\b(could you|please|would|let me know|i am writing|ask|request)\b/i.test(responseText);
  const lengthFit = isEmail ? wordCount >= 50 && wordCount <= 140 : wordCount >= 5 && wordCount <= 75;
  const structureScore = isEmail
    ? 45 + (hasGreeting ? 10 : 0) + (hasClosing ? 10 : 0) + (hasRequest ? 15 : 0) + (lengthFit ? 10 : 0)
    : 50 + (sentenceCount === 1 ? 20 : 0) + (lengthFit ? 15 : 0);
  const overallScore = clampScore(Math.min(82, structureScore));

  return {
    evaluationSource: 'rule-based',
    cached: false,
    taskSlug,
    wordCount,
    overallScore,
    readiness: overallScore >= 70 ? 'Developing well' : 'Needs focused practice',
    summary: isEmail
      ? 'This draft is checked with local rules when real AI grading is not active. The review focuses on visible email structure, task tone, and coverage signals.'
      : 'This draft is checked with local rules when real AI grading is not active. The review focuses on one-sentence control, length, and summary structure.',
    scores: {
      content: clampScore(overallScore + (isEmail && hasRequest ? 4 : 0)),
      form: clampScore(structureScore),
      grammar: clampScore(overallScore - 4),
      vocabulary: clampScore(overallScore - 2),
      coherence: clampScore(overallScore + 2),
    },
    strengths: [
      lengthFit ? 'The response is in a reasonable length range for this task.' : 'The response gives enough text to identify a practice direction.',
      isEmail && hasRequest ? 'The email includes request language, which helps task purpose.' : 'The response shows a clear attempt to address the prompt.',
    ],
    priorities: [
      isEmail && !hasGreeting ? 'Add a natural greeting so the email feels complete.' : 'Check that every required prompt point is clearly covered.',
      isEmail && !hasClosing ? 'Add a short closing line.' : 'Keep the response concise and easy to score.',
      'Use real AI grading only when you are ready to spend an evaluation credit.',
    ],
    criteria: [
      { label: 'Content', comment: 'Check whether the response answers the prompt directly and includes the required details.' },
      { label: 'Form', comment: isEmail ? 'A complete email should include a greeting, clear purpose, details, and closing.' : 'A summary should usually be one complete sentence.' },
      { label: 'Language', comment: 'Use controlled grammar first. Avoid complex forms that make the message unclear.' },
    ],
    plan: buildPlan(),
  };
}

async function validatePremiumSession(sessionId) {
  const cleanSessionId = normalizeText(sessionId, 160);
  if (!cleanSessionId) {
    return { valid: false, reason: 'No PTE Core premium session provided.' };
  }

  if (!STRIPE_API_KEY) {
    return { valid: false, reason: 'Premium access cannot be checked because STRIPE_API_KEY is missing.' };
  }

  const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2026-02-25.clover' });
  const session = await stripe.checkout.sessions.retrieve(cleanSessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription') {
    return { valid: false, reason: `This checkout session is not a subscription for ${PTE_CORE_PREMIUM_PRODUCT_NAME}.` };
  }

  if (session.status !== 'complete') {
    return { valid: false, reason: `Checkout status is ${session.status}.` };
  }

  const subscriptionId = extractId(session.subscription);
  if (!subscriptionId) {
    return { valid: false, reason: 'Missing subscription on checkout session.' };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  if (!active) {
    return { valid: false, reason: `Subscription status is ${subscription.status}.` };
  }

  const hasPrice = await subscriptionHasPteCorePrice(stripe, subscription);
  if (!hasPrice) {
    return { valid: false, reason: `Subscription does not include the required ${PTE_CORE_PREMIUM_PRODUCT_NAME} price.` };
  }

  return {
    valid: true,
    sessionId: cleanSessionId,
    subscriptionId,
    customerId: extractId(session.customer),
  };
}

function buildInstructions(taskSlug) {
  return [
    'You are a strict but supportive PTE Core writing coach.',
    'Return only JSON that matches the provided schema.',
    'Grade only the student response for the given PTE Core writing task.',
    'Use a 0-90 scale for all numeric scores. Do not claim this is an official Pearson score.',
    'Keep feedback concise, practical, and suitable for an adult CLB 6-9 learner.',
    taskSlug === 'write-email'
      ? 'For Write Email, focus on purpose, prompt coverage, tone, organization, grammar control, and useful detail.'
      : 'For Summarize Written Text, focus on main idea accuracy, one-sentence control, concision, grammar, and paraphrase quality.',
  ].join('\n');
}

function buildInput({ taskSlug, taskLabel, prompt, instructions, responseText }) {
  return [
    `Task slug: ${taskSlug}`,
    `Task label: ${taskLabel}`,
    `Prompt:\n${prompt}`,
    `Task instructions:\n${instructions}`,
    `Student response:\n${responseText}`,
  ].join('\n\n');
}

async function requestOpenAIGrade({ taskSlug, taskLabel, prompt, instructions, responseText, fallback }) {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: buildInstructions(taskSlug),
        input: buildInput({ taskSlug, taskLabel, prompt, instructions, responseText }),
        max_output_tokens: 1000,
        text: {
          format: {
            type: 'json_schema',
            name: 'pte_core_writing_grade',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['overallScore', 'readiness', 'summary', 'scores', 'strengths', 'priorities', 'criteria'],
              properties: {
                overallScore: { type: 'number' },
                readiness: { type: 'string' },
                summary: { type: 'string' },
                scores: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['content', 'form', 'grammar', 'vocabulary', 'coherence'],
                  properties: {
                    content: { type: 'number' },
                    form: { type: 'number' },
                    grammar: { type: 'number' },
                    vocabulary: { type: 'number' },
                    coherence: { type: 'number' },
                  },
                },
                strengths: { type: 'array', items: { type: 'string' } },
                priorities: { type: 'array', items: { type: 'string' } },
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['label', 'comment'],
                    properties: {
                      label: { type: 'string' },
                      comment: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const outputText = data.output_text || data.output?.flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .join('')
      .trim();

    if (!outputText) throw new Error('OpenAI returned an empty grading response.');

    return normalizeGrade(JSON.parse(outputText), {
      ...fallback,
      evaluationSource: 'openai',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!isSameOriginRequest(event)) {
    return jsonResponse(403, { error: 'Cross-origin requests are not allowed.' });
  }

  const canUseBlobs = Boolean(event?.blobs);
  if (canUseBlobs) {
    connectLambda(event);
  }

  const rawBody = String(event.body || '');
  if (rawBody.length > MAX_REQUEST_BODY_CHARS) {
    return jsonResponse(413, { error: 'Request payload is too large.' });
  }

  let body;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON request body.' });
  }

  const taskSlug = normalizeText(body.taskSlug, 80);
  const taskLabel = normalizeText(body.taskLabel, 120);
  const prompt = normalizeMultiline(body.prompt, 2500);
  const instructions = normalizeMultiline(body.instructions, 1000);
  const responseText = normalizeMultiline(body.responseText, MAX_RESPONSE_CHARS);
  const sessionId = normalizeText(body.sessionId, 160);

  if (!VALID_TASKS.has(taskSlug) || !prompt || !responseText) {
    return jsonResponse(400, { error: 'Only PTE Core writing tasks can be graded here.' });
  }

  const wordCount = getWordCount(responseText);
  const minimumWords = MIN_WORDS_BY_TASK[taskSlug] || 40;
  if (wordCount < minimumWords) {
    return jsonResponse(400, {
      error: `Response is too short to grade. Add more detail first. Minimum: ${minimumWords} words.`,
    });
  }

  const cacheKey = buildCacheKey({ taskSlug, prompt, responseText });
  const cached = await getCachedGrade({ cacheKey, canUseBlobs });
  if (cached) {
    return jsonResponse(200, cached);
  }

  let premiumAccess = { valid: false };
  if (sessionId) {
    try {
      premiumAccess = await validatePremiumSession(sessionId);
    } catch (error) {
      return jsonResponse(402, {
        error: error?.message || 'Unable to validate PTE Core premium access.',
        plan: buildPlan(),
      });
    }

    if (!premiumAccess.valid) {
      return jsonResponse(402, {
        error: premiumAccess.reason || 'PTE Core premium access is not active.',
        plan: buildPlan(),
      });
    }
  }

  const plan = premiumAccess.valid
    ? buildPlan({ tier: 'premium', sessionId: premiumAccess.sessionId })
    : buildPlan();

  const clientIp = getClientIp(event);
  const currentDailyCount = await getDailyCount({ clientIp, canUseBlobs });
  if (!premiumAccess.valid && FREE_DAILY_LIMIT > 0 && currentDailyCount >= FREE_DAILY_LIMIT) {
    return jsonResponse(429, {
      error: 'Daily free PTE writing grading limit reached. Unlock PTE Core Premium to continue with paid AI grading.',
      plan,
    });
  }

  const currentGlobalDailyCount = await getGlobalDailyCount({ canUseBlobs });
  if (!premiumAccess.valid && GLOBAL_DAILY_LIMIT > 0 && currentGlobalDailyCount >= GLOBAL_DAILY_LIMIT) {
    return jsonResponse(429, {
      error: 'Today’s site-wide free PTE AI grading pool has been used. Unlock PTE Core Premium to continue with paid AI grading.',
      plan,
    });
  }

  const fallback = buildMockGrade({ taskSlug, responseText, wordCount });
  let payload = {
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

    try {
      payload = {
        ...(await requestOpenAIGrade({
          taskSlug,
          taskLabel,
          prompt,
          instructions,
          responseText,
          fallback,
        })),
        aiEnabled: true,
        model: OPENAI_MODEL,
        plan,
      };
    } catch (error) {
      console.warn('[pte-core-grade] OpenAI grading failed; returning rule-based fallback:', error?.message || error);
      payload = {
        ...payload,
        evaluationSource: 'rule-based-fallback',
        summary: `${payload.summary} Real AI grading was attempted but could not complete, so this fallback did not spend another request.`,
      };
    }
  }

  await setCachedGrade({ cacheKey, payload, canUseBlobs });
  return jsonResponse(200, payload);
}
