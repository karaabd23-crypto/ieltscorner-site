import Stripe from 'stripe';
import {
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_PRODUCT_NAME,
  CELPIP_FREE_TASK_ID,
} from '../../src/lib/celpipWritingData.mjs';
import { normalizeCelpipReport } from '../../src/lib/celpipWritingFeedback.mjs';
import { evaluateCelpipWriting } from '../../src/lib/celpipWritingEvaluator.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const ADMIN_BYPASS_TOKEN = (process.env.CELPIP_WRITING_ADMIN_BYPASS_TOKEN || '').trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TIMEOUT_MS = 25000;

// ── Per-IP, per-task rate limit (survives across warm invocations) ──
const RATE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ipTaskMap = new Map(); // key: "ip::promptId" → timestamp

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

function getClientIp(event) {
  return (
    event.headers?.['x-nf-client-connection-ip'] ||
    event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers?.['client-ip'] ||
    'unknown'
  );
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
  const host = String(event?.headers?.host || '');
  const origin = String(event?.headers?.origin || '');
  return /localhost|127\.0\.0\.1/i.test(`${host} ${origin}`);
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
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

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
        max_tokens: 1800,
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

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
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

    if (!taskType || !responseText || !promptTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // ── Rate limit: one submission per IP per task ──
    const clientIp = getClientIp(event);
    const rateLimitKey = promptId || `${taskType}::${promptTitle}`;
    if (hasAlreadySubmitted(clientIp, rateLimitKey)) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: 'You have already submitted an essay for this task. Try a different prompt.',
        }),
      };
    }

    const wordCount = String(responseText || '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 40) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Response is too short to grade meaningfully.' }) };
    }

    const bypassByToken = ADMIN_BYPASS_TOKEN && adminToken && adminToken === ADMIN_BYPASS_TOKEN;
    const bypassByLocalhost = ADMIN_BYPASS_TOKEN && isLocalhostRequest(event) && sessionId === 'admin-bypass';
    const isAdminBypass = Boolean(bypassByToken || bypassByLocalhost);

    // Allow the designated free task without a Stripe session
    const isFreeTaskBypass = isFreeTask === true && promptId === CELPIP_FREE_TASK_ID;

    if (!isAdminBypass && !isFreeTaskBypass) {
      if (!sessionId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId' }) };
      }
      await validateSession(sessionId);
    }

    let rawReport;
    let evaluationSource = 'openai';

    // Record this IP+task so repeat submissions are blocked
    recordSubmission(clientIp, rateLimitKey);

    try {
      rawReport = await requestOpenAIEvaluation({
        taskType,
        promptTitle,
        promptText,
        promptInstructions,
        responseText,
      });
    } catch (openAiError) {
      evaluationSource = 'rules-fallback';
      const fallbackReason = openAiError?.message || String(openAiError || 'Unknown error');
      if (OPENAI_API_KEY) {
        console.error(`[celpip-eval] Falling back to rule-based evaluator: ${fallbackReason}`);
      } else {
        console.warn('[celpip-eval] OPENAI_API_KEY missing, using rule-based evaluator.');
      }
      rawReport = evaluateCelpipWriting({
        taskType,
        promptTitle,
        promptText,
        promptInstructions,
        responseText,
      });
    }

    const report = normalizeCelpipReport(rawReport, { taskType });

    return {
      statusCode: 200,
      body: JSON.stringify({
        report,
        evaluationSource,
        evaluationModel: evaluationSource === 'openai' ? OPENAI_MODEL : 'rule-based',
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Evaluation failed' }),
    };
  }
}
