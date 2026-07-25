import { withLambda } from '@netlify/aws-lambda-compat';
import { handleTelegramWebhook } from '../../scripts/lib/telegram-bot-core.mjs';

async function handler(event) {
  return handleTelegramWebhook({
    method: event.httpMethod,
    headers: event.headers || {},
    body: event.body || '',
    env: process.env,
    fetchImpl: fetch,
    logger: console,
  });
}

export default withLambda(handler);
