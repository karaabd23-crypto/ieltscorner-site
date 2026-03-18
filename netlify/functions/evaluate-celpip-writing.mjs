import Stripe from 'stripe';
import {
  CELPIP_LEVEL_GUIDE,
  CELPIP_TASK_CONFIG,
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';
import { normalizeCelpipReport } from '../../src/lib/celpipWritingFeedback.mjs';

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const PRICE_ID = (process.env.CELPIP_WRITING_PRICE_ID || 'price_1T9z9OAfbKGrKsHyDdo8ua53').trim();
const ADMIN_BYPASS_TOKEN = (process.env.CELPIP_WRITING_ADMIN_BYPASS_TOKEN || '').trim();

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

function buildPrompt({ taskType, promptTitle, promptText, promptInstructions, responseText, timeSpentSeconds, wordCount }) {
  const task = CELPIP_TASK_CONFIG[taskType] || CELPIP_TASK_CONFIG.task1;
  const levelGuide = CELPIP_LEVEL_GUIDE
    .map((item) => `Level ${item.level}: ${item.label} - ${item.descriptor}`)
    .join('\n');

  return `You are a strict but fair CELPIP Writing examiner.

Use the CELPIP level scale from 1 to 12. Judge the response the way a serious CELPIP rater would: task completion, organization/coherence, vocabulary, and grammar/language control.

Reference guide:
${levelGuide}

Task type: ${task.label}
Expected timing: ${task.minutes} minutes
Target length: ${task.targetWords}
Time used by student: ${Math.floor(Number(timeSpentSeconds || 0) / 60)} minutes ${Number(timeSpentSeconds || 0) % 60} seconds
Word count: ${wordCount}

Prompt title: ${promptTitle}
Prompt: ${promptText}
Instructions: ${(promptInstructions || []).join(' | ')}

Student response:
${responseText}

Return ONLY valid JSON with this exact shape:
{
  "overallLevel": 8,
  "descriptor": "short descriptor",
  "overallSummary": "2-3 sentence CELPIP-style summary",
  "traitScores": {
    "Task fulfillment": 8,
    "Organization": 8,
    "Vocabulary": 7,
    "Grammar": 7
  },
  "criterionComments": {
    "Task fulfillment": "1-2 sentence rater comment",
    "Organization": "1-2 sentence rater comment",
    "Vocabulary": "1-2 sentence rater comment",
    "Grammar": "1-2 sentence rater comment"
  },
  "strengths": ["bullet", "bullet", "bullet"],
  "improvementPriorities": ["bullet", "bullet", "bullet"],
  "errorAnalysis": [
    {
      "category": "Prompt coverage",
      "severity": "high",
      "explanation": "clear ESL-friendly comment",
      "evidence": "short quote or short description from the response",
      "fixNow": "one practical revision step"
    }
  ],
  "rewriteSuggestions": [
    {
      "before": "student wording",
      "after": "better wording",
      "why": "why the revision is stronger"
    }
  ],
  "lessonNeeds": ["short lesson need", "short lesson need"],
  "nextPracticeSteps": ["step", "step", "step"]
}

Rules:
- Be conservative; do not inflate scores.
- Think like a CELPIP rater first, a coach second.
- If the response misses instructions, reduce task fulfillment noticeably.
- If tone is inappropriate for Task 1 email, mention it clearly.
- If support is weak in Task 2, lower organization and task fulfillment.
- Keep comments simple enough for an ESL student at CLB 6 to understand.
- Every trait score must be an integer from 1 to 12.
- Give 3 to 6 errorAnalysis items.
- Do not invent evidence. If evidence is missing, say briefly what is missing instead.
- lessonNeeds should be short labels such as "email tone", "prompt coverage", "support and examples", "sentence boundaries".`;
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI response did not contain valid JSON');
  }

  return JSON.parse(match[0]);
}

async function callAnthropic(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1800,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic request failed: ${text}`);
  }

  const data = await response.json();
  const text = data?.content?.map((item) => item.text || '').join('\n') || '';
  return extractJson(text);
}

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${text}`);
  }

  const data = await response.json();
  return extractJson(data?.choices?.[0]?.message?.content || '{}');
}

function buildAdminFallbackReport({ taskType, wordCount }) {
  const task = CELPIP_TASK_CONFIG[taskType] || CELPIP_TASK_CONFIG.task1;
  const level = wordCount >= 140 ? 8 : wordCount >= 90 ? 7 : 6;

  return {
    overallLevel: level,
    descriptor: 'Local admin preview report',
    overallSummary: `This is a local admin fallback report for ${task.label}. Live AI grading is unavailable, but the full scoring flow is working.`,
    traitScores: {
      'Task fulfillment': level,
      Organization: Math.max(1, level - 1),
      Vocabulary: Math.max(1, level - 1),
      Grammar: Math.max(1, level - 1),
    },
    criterionComments: {
      'Task fulfillment': taskType === 'task1'
        ? 'The email purpose is visible, but prompt coverage and tone still need closer control.'
        : 'The position is understandable, but support still needs stronger development.',
      Organization: 'The main order works, but the response still needs tighter paragraph control.',
      Vocabulary: 'Word choice is understandable, but more precise language would help the score.',
      Grammar: 'The meaning is clear overall, but grammar control still needs cleaner editing.',
    },
    strengths: [
      'Main message is understandable.',
      'The response attempts an appropriate task shape.',
      'The writing shows awareness of purpose and audience.',
    ],
    improvementPriorities: [
      'Expand supporting details with concrete examples.',
      'Improve sentence variety and transitions between ideas.',
      'Proofread for grammar and punctuation accuracy.',
    ],
    errorAnalysis: [
      {
        category: taskType === 'task1' ? 'Prompt coverage' : 'Support and examples',
        severity: 'medium',
        explanation: taskType === 'task1'
          ? 'The response needs fuller coverage of the task points.'
          : 'The response needs more specific support for the main position.',
        evidence: '',
        fixNow: 'Outline the job of each paragraph before you write again.',
      },
      {
        category: 'Sentence control',
        severity: 'medium',
        explanation: 'Some sentences would be stronger with cleaner grammar and punctuation.',
        evidence: '',
        fixNow: 'Edit one paragraph slowly and check every sentence boundary.',
      },
    ],
    rewriteSuggestions: [
      {
        before: 'I am really bothered by the noise you are making.',
        after: 'I am writing to report repeated late-night noise from the unit above mine.',
        why: 'The revision sounds more professional and gives the task purpose immediately.',
      },
      {
        before: 'Please help by speaking to the tenant upstairs.',
        after: 'I would appreciate it if management could contact the tenant and enforce quiet hours after 10 PM.',
        why: 'The revision is more specific and more appropriate for a formal email.',
      },
    ],
    lessonNeeds: taskType === 'task1'
      ? ['email tone', 'prompt coverage', 'sentence boundaries']
      : ['support and examples', 'clear position', 'sentence boundaries'],
    nextPracticeSteps: [
      'Write one revised version using stronger topic sentences.',
      'Add one specific detail in each paragraph.',
      'Cut informal wording and keep professional tone throughout.',
    ],
  };
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
      taskType,
      promptTitle,
      promptText,
      promptInstructions,
      responseText,
      timeSpentSeconds,
    } = body;

    if (!sessionId || !taskType || !responseText || !promptTitle) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const wordCount = String(responseText || '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 40) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Response is too short to grade meaningfully.' }) };
    }

    const bypassByToken = ADMIN_BYPASS_TOKEN && adminToken && adminToken === ADMIN_BYPASS_TOKEN;
    const bypassByLocalhost = ADMIN_BYPASS_TOKEN && isLocalhostRequest(event) && sessionId === 'admin-bypass';
    const isAdminBypass = Boolean(bypassByToken || bypassByLocalhost);
    if (!isAdminBypass) {
      await validateSession(sessionId);
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      if (isAdminBypass) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            report: normalizeCelpipReport(buildAdminFallbackReport({ taskType, wordCount }), { taskType }),
            fallback: true,
          }),
        };
      }

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'AI grading is not configured yet. Add ANTHROPIC_API_KEY or OPENAI_API_KEY in Netlify environment variables.',
        }),
      };
    }

    const prompt = buildPrompt({
      taskType,
      promptTitle,
      promptText,
      promptInstructions,
      responseText,
      timeSpentSeconds,
      wordCount,
    });

    let report;
    try {
      const rawReport = ANTHROPIC_API_KEY ? await callAnthropic(prompt) : await callOpenAI(prompt);
      report = normalizeCelpipReport(rawReport, { taskType });
    } catch (error) {
      if (!isAdminBypass) {
        throw error;
      }

      report = normalizeCelpipReport(buildAdminFallbackReport({ taskType, wordCount }), { taskType });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ report }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Evaluation failed' }),
    };
  }
}
