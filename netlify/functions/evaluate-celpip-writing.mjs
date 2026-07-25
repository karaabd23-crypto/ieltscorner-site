import Stripe from 'stripe';
import { createHash } from 'crypto';
import { getStore } from '@netlify/blobs';
import {
  getHeader,
  getRequestHost,
  isSameOriginRequest,
  requestToEventLike,
} from './_utils/requestSecurity.mjs';
import {
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_PRODUCT_NAME,
  isCelpipFreePrompt,
} from '../../src/lib/celpipWritingData.mjs';
import {
  calibrateReportToSample,
  detectSampleBenchmarkMatch,
} from '../../src/lib/celpipScoreCalibration.mjs';
import { normalizeCelpipReport } from '../../src/lib/celpipWritingFeedback.mjs';
import { evaluateCelpipWriting } from '../../src/lib/celpipWritingEvaluator.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const ADMIN_BYPASS_TOKEN = (process.env.CELPIP_WRITING_ADMIN_BYPASS_TOKEN || '').trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
const OPENAI_TIMEOUT_MS = 25000;

// Netlify AI Gateway injects OPENAI_API_KEY / OPENAI_BASE_URL into the v2 runtime.
// Read them per request so a cold-start ordering never leaves them undefined.
function getOpenAiKey() {
  return (process.env.OPENAI_API_KEY || '').trim();
}

function getOpenAiUrl(path) {
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  return `${baseUrl}${path}`;
}
const STATS_STORE_NAME = 'celpip-writing-stats';
const FREE_USER_PREFIX = 'free-users/';
const DAILY_SUBMISSION_PREFIX = 'daily-submissions/';
const MAX_REQUEST_BODY_CHARS = 65000;
const MAX_PROMPT_TITLE_CHARS = 220;
const MAX_PROMPT_TEXT_CHARS = 5000;
const MAX_RESPONSE_TEXT_CHARS = 12000;
const MAX_PROMPT_INSTRUCTIONS = 10;
const MAX_PROMPT_INSTRUCTION_CHARS = 220;
const VALID_TASK_TYPES = new Set(['task1', 'task2']);

// ── Per-IP, per-task rate limit (survives across warm invocations) ──
const RATE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ipTaskMap = new Map(); // key: "ip::promptId" → timestamp

// ── Daily eval cap per IP ──
const DAILY_EVAL_CAP = 5;
const ipDailyCount = new Map(); // key: ip → { count, windowStart }

// ── Response cache for identical submissions ──
const evalCache = new Map(); // key: sha256 hash → { payload, ts }
const EVAL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function hasAlreadySubmitted(ip, promptId) {
  const key = `${ip}::${promptId}`;
  const ts = ipTaskMap.get(key);
  if (!ts) return false;
  if (Date.now() - ts > RATE_LIMIT_TTL_MS) {
    ipTaskMap.delete(key);
    return false;
  }
  return true;
}

function recordSubmission(ip, promptId) {
  const key = `${ip}::${promptId}`;
  ipTaskMap.set(key, Date.now());
  // Prune expired entries periodically (keep map from growing unbounded)
  if (ipTaskMap.size > 500) {
    const now = Date.now();
    for (const [k, ts] of ipTaskMap) {
      if (now - ts > RATE_LIMIT_TTL_MS) ipTaskMap.delete(k);
    }
  }
}

function getDailyCount(ip) {
  const entry = ipDailyCount.get(ip);
  if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_TTL_MS) return 0;
  return entry.count;
}

function incrementDailyCount(ip) {
  const entry = ipDailyCount.get(ip);
  if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_TTL_MS) {
    ipDailyCount.set(ip, { count: 1, windowStart: Date.now() });
  } else {
    entry.count += 1;
  }
  if (ipDailyCount.size > 500) {
    const now = Date.now();
    for (const [k, v] of ipDailyCount) {
      if (now - v.windowStart > RATE_LIMIT_TTL_MS) ipDailyCount.delete(k);
    }
  }
}

function buildEvalCacheKey({ taskType, promptId, responseText }) {
  return createHash('sha256')
    .update(`${taskType}::${promptId}::${responseText}`)
    .digest('hex');
}

function getCachedEval(key) {
  const entry = evalCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > EVAL_CACHE_TTL_MS) { evalCache.delete(key); return null; }
  return entry.payload;
}

function setCachedEval(key, payload) {
  evalCache.set(key, { payload, ts: Date.now() });
  if (evalCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of evalCache) {
      if (now - v.ts > EVAL_CACHE_TTL_MS) evalCache.delete(k);
    }
  }
}

function getClientIp(event) {
  return (
    getHeader(event, 'x-nf-client-connection-ip') ||
    getHeader(event, 'x-forwarded-for').split(',')[0]?.trim() ||
    getHeader(event, 'client-ip') ||
    'unknown'
  );
}

function buildFreeUserKey(clientIp) {
  const normalizedIp = String(clientIp || '').trim();
  if (!normalizedIp || normalizedIp === 'unknown') return null;

  const hash = createHash('sha256')
    .update(`celpip-free-eval:${normalizedIp}`)
    .digest('hex');

  return `${FREE_USER_PREFIX}${hash}`;
}

async function recordFreeEvaluationUser({ clientIp }) {
  const key = buildFreeUserKey(clientIp);
  if (!key) return;

  try {
    const store = getStore(STATS_STORE_NAME);
    await store.setJSON(
      key,
      { firstFreeEvalAt: new Date().toISOString() },
      { onlyIfNew: true },
    );
  } catch (error) {
    console.warn('[celpip-eval] Unable to persist free-evaluation usage stats:', error?.message || error);
  }
}

async function hasUsedFreeEvaluation({ clientIp }) {
  const key = buildFreeUserKey(clientIp);
  if (!key) return false;

  try {
    const store = getStore(STATS_STORE_NAME);
    const existing = await store.get(key, { type: 'json' });
    return Boolean(existing);
  } catch (error) {
    console.warn('[celpip-eval] Unable to verify free-evaluation usage:', error?.message || error);
    return false;
  }
}

function getDailySubmissionKey(date = new Date()) {
  return `${DAILY_SUBMISSION_PREFIX}${date.toISOString().slice(0, 10)}`;
}

async function incrementDailyEssaySubmissionCount() {
  const store = getStore(STATS_STORE_NAME);
  const key = getDailySubmissionKey();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await store.getWithMetadata(key, { type: 'json' });
    const updatedAt = new Date().toISOString();

    if (!current) {
      const write = await store.setJSON(
        key,
        { count: 1, updatedAt },
        { onlyIfNew: true },
      );
      if (write?.modified) return;
      continue;
    }

    const currentCount = Number(current.data?.count) || 0;
    const write = await store.setJSON(
      key,
      { count: currentCount + 1, updatedAt },
      { onlyIfMatch: current.etag },
    );
    if (write?.modified) return;
  }

  throw new Error('Unable to update daily essay count after retries.');
}

async function recordEssaySubmissionStats({ clientIp, isFreeTaskBypass, isAdminBypass }) {
  try {
    await incrementDailyEssaySubmissionCount();

    if (isFreeTaskBypass && !isAdminBypass) {
      await recordFreeEvaluationUser({ clientIp });
    }
  } catch (error) {
    console.warn('[celpip-eval] Unable to persist essay submission stats:', error?.message || error);
  }
}

const LESSON_NEED_OPTIONS = [
  'prompt coverage',
  'email tone',
  'support and examples',
  'clear position',
  'organization',
  'linking',
  'sentence boundaries',
  'agreement',
  'word choice',
  'articles',
  'tenses',
];

function isLocalhostRequest(event) {
  const host = String(getRequestHost(event) || '');
  const origin = String(getHeader(event, 'origin') || '');
  return /localhost|127\.0\.0\.1/i.test(`${host} ${origin}`);
}

function normalizeTaskType(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizePromptId(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizePromptInstructions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return '';
}

function buildTaskRubric(taskType) {
  if (taskType === 'task2') {
    return [
      'Task type: CELPIP Writing Task 2 (survey response).',
      'Score the response on whether the writer makes a clear choice early, supports it with reasons and examples, briefly handles the alternative option, and closes clearly.',
      'Do not reward generic filler. Thin support, weak comparison, and unclear position should lower Task fulfillment and Organization.',
    ].join('\n');
  }

  return [
    'Task type: CELPIP Writing Task 1 (email).',
    'Score the response on whether it states the purpose clearly, covers all prompt bullets, uses an audience-appropriate tone, gives enough detail, and ends with a clear request or closing.',
    'Do not reward politeness alone. Missing prompt points, weak tone control, or vague impact details should lower Task fulfillment and Organization.',
  ].join('\n');
}

function buildOpenAISystemPrompt(taskType) {
  return [
    'You are a strict but helpful CELPIP writing examiner.',
    'Return only valid JSON. No markdown. No explanation outside the JSON object.',
    'Estimate CELPIP CLB scores on a 1-12 scale.',
    'Use these exact trait keys: "Task fulfillment", "Organization", "Vocabulary", "Grammar".',
    'Judge the actual student writing exactly as written. Do not assume intended meaning when the writing is unclear.',
    'Keep strengths concise and specific. Keep priorities action-oriented.',
    'In errorAnalysis, include 3 to 6 high-signal issues. Each issue must have: category, severity, explanation, evidence, fixNow.',
    'In rewriteSuggestions, include 2 to 4 concrete rewrites. Each item must have: before, after, why.',
    `In lessonNeeds, choose only from this list: ${LESSON_NEED_OPTIONS.join(', ')}.`,
    'descriptor should be a short CELPIP-level label such as "Good proficiency".',
    'overallSummary should be 2 or 3 sentences, practical and specific.',
    'criterionComments should be a short paragraph for each of the four trait keys.',
    buildTaskRubric(taskType),
    `Use this JSON schema exactly:
{
  "overallLevel": 1,
  "descriptor": "string",
  "overallSummary": "string",
  "traitScores": {
    "Task fulfillment": 1,
    "Organization": 1,
    "Vocabulary": 1,
    "Grammar": 1
  },
  "criterionComments": {
    "Task fulfillment": "string",
    "Organization": "string",
    "Vocabulary": "string",
    "Grammar": "string"
  },
  "strengths": ["string"],
  "improvementPriorities": ["string"],
  "errorAnalysis": [
    {
      "category": "string",
      "severity": "high",
      "explanation": "string",
      "evidence": "string",
      "fixNow": "string"
    }
  ],
  "rewriteSuggestions": [
    {
      "before": "string",
      "after": "string",
      "why": "string"
    }
  ],
  "lessonNeeds": ["string"],
  "nextPracticeSteps": ["string"]
}`,
  ].join('\n\n');
}

function buildOpenAIUserMessage({
  taskType,
  promptTitle,
  promptText,
  promptInstructions,
  responseText,
}) {
  const instructions = Array.isArray(promptInstructions) && promptInstructions.length
    ? promptInstructions.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'None provided';

  return [
    `Task type: ${taskType}`,
    `Prompt title: ${promptTitle}`,
    `Scenario:\n${promptText || 'None provided'}`,
    `Prompt instructions:\n${instructions}`,
    `Student response:\n${responseText}`,
  ].join('\n\n');
}

async function requestOpenAIEvaluation({
  taskType,
  promptTitle,
  promptText,
  promptInstructions,
  responseText,
}) {
  if (!getOpenAiKey()) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(getOpenAiUrl('/chat/completions'), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getOpenAiKey()}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildOpenAISystemPrompt(taskType) },
          {
            role: 'user',
            content: buildOpenAIUserMessage({
              taskType,
              promptTitle,
              promptText,
              promptInstructions,
              responseText,
            }),
          },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty evaluation response.');
    }

    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function validateSession(sessionId) {
  if (!STRIPE_API_KEY) {
    throw new Error('Missing STRIPE_API_KEY');
  }

  const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.mode !== 'subscription' || session.status !== 'complete') {
    throw new Error(`This checkout session is not an active ${CELPIP_WRITING_BILLING_INTERVAL}ly subscription.`);
  }

  const subscriptionId = extractId(session.subscription);
  if (!subscriptionId) {
    throw new Error('No subscription found for this checkout session.');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  if (!active) {
    throw new Error(`Subscription is ${subscription.status}. Access requires an active subscription.`);
  }

  if (PRICE_ID) {
    const hasPrice = subscription.items.data.some((item) => item.price?.id === PRICE_ID);
    if (!hasPrice) {
      throw new Error(`Subscription does not include the required ${CELPIP_WRITING_PRODUCT_NAME} plan.`);
    }
  }

  return session;
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export default async (req) => {
  const event = requestToEventLike(req);

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!isSameOriginRequest(event)) {
    return jsonResponse(403, { error: 'Cross-origin requests are not allowed.' });
  }

  try {
    // The v2 runtime wires Blobs up automatically — no connectLambda needed.
    const canUseBlobs = true;

    const rawBody = String((await req.text()) || '');
    if (rawBody.length > MAX_REQUEST_BODY_CHARS) {
      return jsonResponse(413, { error: 'Request payload is too large.' });
    }

    let body;
    try {
      body = JSON.parse(rawBody || '{}');
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON request body.' });
    }

    const {
      sessionId,
      adminToken,
      isFreeTask,
      promptId,
      taskType,
      promptTitle,
      promptText,
      promptInstructions,
      responseText,
    } = body;

    const normalizedTaskType = normalizeTaskType(taskType);
    const normalizedPromptId = normalizePromptId(promptId);
    const normalizedPromptTitle = normalizeText(promptTitle);
    const normalizedPromptText = normalizeText(promptText);
    const normalizedResponseText = normalizeText(responseText);
    const normalizedPromptInstructions = normalizePromptInstructions(promptInstructions);

    if (!VALID_TASK_TYPES.has(normalizedTaskType) || !normalizedResponseText || !normalizedPromptTitle) {
      return jsonResponse(400, { error: 'Missing required fields' });
    }

    if (normalizedPromptId && !/^[A-Za-z0-9-]{1,80}$/.test(normalizedPromptId)) {
      return jsonResponse(400, { error: 'Invalid prompt ID format.' });
    }

    if (
      normalizedPromptTitle.length > MAX_PROMPT_TITLE_CHARS ||
      normalizedPromptText.length > MAX_PROMPT_TEXT_CHARS ||
      normalizedResponseText.length > MAX_RESPONSE_TEXT_CHARS
    ) {
      return jsonResponse(400, { error: 'One or more fields exceed allowed length.' });
    }

    if (
      normalizedPromptInstructions.length > MAX_PROMPT_INSTRUCTIONS ||
      normalizedPromptInstructions.some((item) => item.length > MAX_PROMPT_INSTRUCTION_CHARS)
    ) {
      return jsonResponse(400, { error: 'Prompt instructions are invalid.' });
    }

    // Rate limit: one submission per IP per task
    const clientIp = getClientIp(event);
    const rateLimitKey = normalizedPromptId || `${normalizedTaskType}::${normalizedPromptTitle}`;
    if (hasAlreadySubmitted(clientIp, rateLimitKey)) {
      return jsonResponse(429, {
        error: 'You have already submitted an essay for this task. Try a different prompt.',
      });
    }

    const wordCount = normalizedResponseText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 40) {
      return jsonResponse(400, { error: 'Response is too short to grade meaningfully.' });
    }

    const bypassByToken = ADMIN_BYPASS_TOKEN && adminToken && adminToken === ADMIN_BYPASS_TOKEN;
    const bypassByLocalhost = ADMIN_BYPASS_TOKEN && isLocalhostRequest(event) && sessionId === 'admin-bypass';
    const isAdminBypass = Boolean(bypassByToken || bypassByLocalhost);

    // Allow designated free prompts without a Stripe session
    const isFreePrompt = Boolean(
      normalizedTaskType &&
      normalizedPromptId &&
      isCelpipFreePrompt(normalizedTaskType, normalizedPromptId)
    );
    const isFreeTaskBypass = isFreeTask === true && isFreePrompt;

    if (isFreeTaskBypass && !isAdminBypass && canUseBlobs) {
      const alreadyUsed = await hasUsedFreeEvaluation({ clientIp });
      if (alreadyUsed) {
        return jsonResponse(403, {
          error: 'Your free evaluation has already been used. Please subscribe to continue.',
        });
      }
    }

    if (!isAdminBypass && !isFreeTaskBypass) {
      if (!sessionId) {
        return jsonResponse(400, { error: 'Missing sessionId' });
      }
      await validateSession(sessionId);
    }

    // Daily cap: non-admin IPs limited to DAILY_EVAL_CAP evaluations per 24h
    if (!isAdminBypass && getDailyCount(clientIp) >= DAILY_EVAL_CAP) {
      return jsonResponse(429, { error: 'Daily evaluation limit reached. Try again tomorrow.' });
    }

    // Cache: return stored result for identical task+prompt+response within 1 hour
    const evalCacheKey = buildEvalCacheKey({
      taskType: normalizedTaskType,
      promptId: normalizedPromptId,
      responseText: normalizedResponseText,
    });
    const cachedPayload = getCachedEval(evalCacheKey);
    if (cachedPayload) {
      return jsonResponse(200, {
        ...cachedPayload,
        evaluationSource: `${cachedPayload.evaluationSource}:cached`,
      });
    }

    let rawReport;
    let evaluationSource = 'openai';

    // Record this IP+task so repeat submissions are blocked
    recordSubmission(clientIp, rateLimitKey);

    try {
      rawReport = await requestOpenAIEvaluation({
        taskType: normalizedTaskType,
        promptTitle: normalizedPromptTitle,
        promptText: normalizedPromptText,
        promptInstructions: normalizedPromptInstructions,
        responseText: normalizedResponseText,
      });
    } catch (openAiError) {
      evaluationSource = 'rules-fallback';
      const fallbackReason = openAiError?.message || String(openAiError || 'Unknown error');
      if (getOpenAiKey()) {
        console.error(`[celpip-eval] Falling back to rule-based evaluator: ${fallbackReason}`);
      } else {
        console.warn('[celpip-eval] OPENAI_API_KEY missing, using rule-based evaluator.');
      }
      rawReport = evaluateCelpipWriting({
        taskType: normalizedTaskType,
        promptTitle: normalizedPromptTitle,
        promptText: normalizedPromptText,
        promptInstructions: normalizedPromptInstructions,
        responseText: normalizedResponseText,
      });
    }

    let report = normalizeCelpipReport(rawReport, { taskType: normalizedTaskType });

    const sampleMatch = detectSampleBenchmarkMatch({
      taskType: normalizedTaskType,
      promptId: normalizedPromptId,
      responseText: normalizedResponseText,
    });
    if (sampleMatch) {
      report = calibrateReportToSample(report, sampleMatch);
      evaluationSource = `${evaluationSource}:sample-calibrated`;
    }

    if (canUseBlobs) {
      await recordEssaySubmissionStats({
        clientIp,
        isFreeTaskBypass,
        isAdminBypass,
      });
    }

    incrementDailyCount(clientIp);

    const responsePayload = {
      report,
      evaluationSource,
      evaluationModel: evaluationSource.startsWith('openai') ? OPENAI_MODEL : 'rule-based',
    };
    setCachedEval(evalCacheKey, responsePayload);

    return jsonResponse(200, responsePayload);
  } catch (error) {
    return jsonResponse(500, { error: error?.message || 'Evaluation failed' });
  }
};