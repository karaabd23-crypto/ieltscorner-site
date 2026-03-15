import Stripe from 'stripe';
import {
  CELPIP_LEVEL_GUIDE,
  CELPIP_TASK_CONFIG,
  CELPIP_WRITING_BILLING_INTERVAL,
  CELPIP_WRITING_MONTHLY_EVAL_LIMIT,
  CELPIP_WRITING_PRODUCT_NAME,
} from '../../src/lib/celpipWritingData.mjs';

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

  const subscription =
    typeof session.subscription === 'object' && session.subscription !== null
      ? session.subscription
      : await stripe.subscriptions.retrieve(subscriptionId);

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

  return { session, subscription };
}

function buildPrompt({ taskType, promptTitle, promptText, promptInstructions, responseText, timeSpentSeconds, wordCount }) {
  const task = CELPIP_TASK_CONFIG[taskType] || CELPIP_TASK_CONFIG.task1;
  const levelGuide = CELPIP_LEVEL_GUIDE.map((item) => `Level ${item.level}: ${item.label} — ${item.descriptor}`).join('\n');

  return `You are a strict but fair CELPIP Writing examiner.

Use the CELPIP level scale from 1 to 12. Base your judgment on task completion, organization/coherence, vocabulary, and grammar/language control. Use the following level guide inspired by CELPIP score comparison descriptors:\n${levelGuide}\n\nTask type: ${task.label}\nExpected timing: ${task.minutes} minutes\nTarget length: ${task.targetWords}\nTime used by student: ${Math.floor(Number(timeSpentSeconds || 0) / 60)} minutes ${Number(timeSpentSeconds || 0) % 60} seconds\nWord count: ${wordCount}\n\nPrompt title: ${promptTitle}\nPrompt: ${promptText}\nInstructions: ${(promptInstructions || []).join(' | ')}\n\nStudent response:\n${responseText}\n\nReturn ONLY valid JSON with this exact shape:\n{\n  "overallLevel": 8,\n  "descriptor": "short descriptor",\n  "overallSummary": "2-3 sentence summary",\n  "traitScores": {\n    "Task fulfillment": 8,\n    "Organization": 8,\n    "Vocabulary": 7,\n    "Grammar": 7\n  },\n  "strengths": ["bullet", "bullet", "bullet"],\n  "improvementPriorities": ["bullet", "bullet", "bullet"],\n  "rewriteSuggestions": ["original issue → better version", "original issue → better version"],\n  "nextPracticeSteps": ["step", "step", "step"]\n}\n\nRules:\n- Be conservative; do not inflate scores.\n- If the response misses instructions, reduce task fulfillment noticeably.\n- If tone is inappropriate for Task 1 email, mention it clearly.\n- If support is weak in Task 2, lower organization and task fulfillment.\n- Keep each list item concrete and specific to this response.\n- Every trait score must be an integer from 1 to 12.`;
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
      max_tokens: 1400,
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
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

function normalizeReport(report) {
  const level = Math.max(1, Math.min(12, Number(report?.overallLevel || 1)));
  return {
    overallLevel: level,
    descriptor: String(report?.descriptor || ''),
    overallSummary: String(report?.overallSummary || ''),
    traitScores: report?.traitScores && typeof report.traitScores === 'object' ? report.traitScores : {},
    strengths: Array.isArray(report?.strengths) ? report.strengths.slice(0, 5) : [],
    improvementPriorities: Array.isArray(report?.improvementPriorities) ? report.improvementPriorities.slice(0, 5) : [],
    rewriteSuggestions: Array.isArray(report?.rewriteSuggestions) ? report.rewriteSuggestions.slice(0, 4) : [],
    nextPracticeSteps: Array.isArray(report?.nextPracticeSteps) ? report.nextPracticeSteps.slice(0, 4) : [],
  };
}

function buildAdminFallbackReport({ taskType, responseText, wordCount }) {
  const task = CELPIP_TASK_CONFIG[taskType] || CELPIP_TASK_CONFIG.task1;
  const level = wordCount >= 140 ? 8 : wordCount >= 90 ? 7 : 6;

  return {
    overallLevel: level,
    descriptor: 'Local admin preview report',
    overallSummary: `This is a local admin fallback report for ${task.label}. Live AI grading is currently unavailable, but your end-to-end UI flow is working.`,
    traitScores: {
      'Task fulfillment': level,
      'Organization': Math.max(1, level - 1),
      'Vocabulary': Math.max(1, level - 1),
      'Grammar': Math.max(1, level - 1),
    },
    strengths: [
      'Main message is understandable.',
      'Tone is generally appropriate for the task.',
      'You attempted clear purpose and audience awareness.',
    ],
    improvementPriorities: [
      'Expand supporting details with concrete examples.',
      'Improve sentence variety and transitions between ideas.',
      'Proofread for grammar and punctuation accuracy.',
    ],
    rewriteSuggestions: [
      'I am really bothered by the noise you are making → I am writing to report repeated late-night noise from the unit above mine.',
      'Please help by speaking to the tenant upstairs → I would appreciate it if management could contact the tenant and enforce quiet hours after 10 PM.',
    ],
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

    let session = null;
    let subscription = null;
    if (!isAdminBypass) {
      const result = await validateSession(sessionId);
      session = result.session;
      subscription = result.subscription;
    }

    // Usage tracking via Stripe customer metadata (skipped for admin bypass)
    let customerId = '';
    let evalsUsed = 0;
    let topupCredits = 0;
    let periodStart = '';
    if (!isAdminBypass && session && subscription && STRIPE_API_KEY) {
      customerId = extractId(session.customer);
      if (customerId) {
        const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          periodStart = new Date(subscription.current_period_start * 1000).toISOString().slice(0, 10);
          const storedPeriod = String(customer.metadata?.celpip_eval_period || '');
          evalsUsed =
            storedPeriod === periodStart
              ? Math.max(0, Number(customer.metadata?.celpip_eval_count || '0'))
              : 0;
          topupCredits = Math.max(0, Number(customer.metadata?.celpip_topup_credits || '0'));

          if (evalsUsed >= CELPIP_WRITING_MONTHLY_EVAL_LIMIT && topupCredits <= 0) {
            return {
              statusCode: 429,
              body: JSON.stringify({
                error: `Monthly evaluation limit of ${CELPIP_WRITING_MONTHLY_EVAL_LIMIT} reached. Purchase additional requests to continue.`,
                limitReached: true,
                evalsUsed,
                evalLimit: CELPIP_WRITING_MONTHLY_EVAL_LIMIT,
              }),
            };
          }
        }
      }
    }

    if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
      if (isAdminBypass) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            report: buildAdminFallbackReport({ taskType, responseText, wordCount }),
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
      report = normalizeReport(
        ANTHROPIC_API_KEY ? await callAnthropic(prompt) : await callOpenAI(prompt)
      );
    } catch (error) {
      if (!isAdminBypass) {
        throw error;
      }

      report = normalizeReport(buildAdminFallbackReport({ taskType, responseText, wordCount }));
    }

    // Increment usage counter after a successful evaluation
    if (!isAdminBypass && customerId && periodStart && STRIPE_API_KEY) {
      try {
        const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: '2020-08-27' });
        const newCount = evalsUsed + 1;
        const updatedMeta = {
          celpip_eval_count: String(newCount),
          celpip_eval_period: periodStart,
        };
        if (evalsUsed >= CELPIP_WRITING_MONTHLY_EVAL_LIMIT && topupCredits > 0) {
          updatedMeta.celpip_topup_credits = String(topupCredits - 1);
        }
        await stripe.customers.update(customerId, { metadata: updatedMeta });
      } catch {
        // Non-fatal: usage tracking failure should not block the grading response
      }
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
