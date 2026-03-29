import { handleTelegramWebhook } from '../../scripts/lib/telegram-bot-core.mjs';

export async function handler(event) {
  return handleTelegramWebhook({
    method: event.httpMethod,
    headers: event.headers || {},
    body: event.body || '',
    env: process.env,
    fetchImpl: fetch,
    logger: console,
  });
}
