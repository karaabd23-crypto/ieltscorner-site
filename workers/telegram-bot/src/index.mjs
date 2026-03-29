import { handleTelegramWebhook } from '../../../scripts/lib/telegram-bot-core.mjs';

function toResponse(result) {
  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers,
  });
}

export default {
  async fetch(request, env) {
    const result = await handleTelegramWebhook({
      method: request.method,
      headers: request.headers,
      body: await request.text(),
      env,
      fetchImpl: fetch,
      logger: console,
    });

    return toResponse(result);
  },
};
