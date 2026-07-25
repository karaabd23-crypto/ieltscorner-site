import { withLambda } from '@netlify/aws-lambda-compat';
import { createHash } from 'node:crypto';
import {
  CELPIP_PROMPT_BANK,
  getPromptSampleResponses,
} from '../../src/lib/celpipWritingData.mjs';

const allPrompts = [
  ...CELPIP_PROMPT_BANK.task1.map((prompt) => ({ taskType: 'task1', prompt })),
  ...CELPIP_PROMPT_BANK.task2.map((prompt) => ({ taskType: 'task2', prompt })),
]
  .map(({ taskType, prompt }) => {
    const sampleResponses = getPromptSampleResponses(prompt);
    const sampleResponse = sampleResponses.clb9 || sampleResponses.clb7 || sampleResponses.clb11 || sampleResponses.clb5 || '';
    return {
      id: prompt.id,
      title: prompt.title,
      taskType,
      scenario: prompt.scenario || prompt.question || '',
      sampleResponse,
      sampleResponses,
      sampleLevel: prompt.sampleLevel || '',
      sampleLevelWhy: Array.isArray(prompt.sampleLevelWhy) ? prompt.sampleLevelWhy : [],
    };
  })
  .filter((prompt) => prompt.sampleResponse);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function emailHash(email) {
  return createHash('sha256').update(email).digest('hex');
}

function pickPromptForEmail(email) {
  const seedHex = createHash('sha256').update(`celpip-free-sample:${email}`).digest('hex').slice(0, 12);
  const seed = Number.parseInt(seedHex, 16);
  const index = Number.isFinite(seed) ? seed % allPrompts.length : 0;
  return allPrompts[index] || allPrompts[0];
}

function sanitizePrompt(prompt) {
  if (!prompt) return null;
  return {
    id: prompt.id,
    title: prompt.title,
    taskType: prompt.taskType,
    scenario: prompt.scenario,
    sampleResponse: prompt.sampleResponse,
    sampleResponses: prompt.sampleResponses,
    sampleLevel: prompt.sampleLevel,
    sampleLevelWhy: prompt.sampleLevelWhy,
  };
}

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const email = normalizeEmail(body.email);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };
    }

    if (allPrompts.length === 0) {
      return { statusCode: 500, body: JSON.stringify({ error: 'No sample essays are currently available.' }) };
    }

    // Deterministic unlock: each email always maps to exactly one sample essay.
    // This keeps the experience consistent and avoids runtime dependencies.
    const selectedPrompt = pickPromptForEmail(emailHash(email));

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        alreadyClaimed: false,
        prompt: sanitizePrompt(selectedPrompt),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Unable to unlock a free sample essay right now.' }),
    };
  }
}

export default withLambda(handler);
