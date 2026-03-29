const TELEGRAM_API_BASE = 'https://api.telegram.org';

// Ephemeral state only. This matches the current Netlify behavior and is enough
// for the first Cloudflare migration step.
const botState = {
  users: {},
  stats: { messagesReceived: 0, quizResponses: 0 },
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

function getHeader(headers, name) {
  if (!headers) return '';

  if (typeof headers.get === 'function') {
    return String(headers.get(name) || headers.get(name.toLowerCase()) || '').trim();
  }

  const target = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) {
      return String(value || '').trim();
    }
  }

  return '';
}

function normalizeText(input) {
  return String(input ?? '').trim().toLowerCase();
}

function getConfig(env = {}) {
  return {
    botToken: String(env.TELEGRAM_BOT_TOKEN ?? '').trim(),
    channelUrl: String(env.TELEGRAM_CHANNEL_URL ?? '').trim(),
    websiteUrl: String(env.WEBSITE_URL ?? 'https://ieltscorner.ca').trim(),
    ownerUsername: String(env.TELEGRAM_OWNER_USERNAME ?? '').trim(),
    ownerChatId: String(env.TELEGRAM_OWNER_CHAT_ID ?? '').trim(),
    contactEmail: String(env.CONTACT_EMAIL ?? '').trim(),
    webhookSecret: String(env.TELEGRAM_WEBHOOK_SECRET ?? '').trim(),
  };
}

function buildMainKeyboard(config) {
  return {
    inline_keyboard: [
      [{ text: '🔥 Register for Live Webinar → Only $12', url: `${config.websiteUrl}/webinar` }],
      [
        { text: '🌐 Visit Website', url: config.websiteUrl },
        { text: '📣 Telegram Channel', url: config.channelUrl },
      ],
      [
        { text: '📚 Vocabulary', callback_data: 'vocab' },
        { text: '🎯 Grammar Tips', callback_data: 'grammar' },
      ],
      [
        { text: '💡 Idioms & Expressions', callback_data: 'idioms' },
        { text: '✉️ Contact Kay', callback_data: 'contact' },
      ],
      [
        { text: '🎥 YouTube Channel', url: 'https://www.youtube.com/@KaraAbdolmaleki' },
        { text: '📘 CELPIP eBook', url: `${config.websiteUrl}/ebook` },
      ],
    ],
  };
}

function contactMessage(config) {
  const lines = ['🔗 Connect with Kay:'];

  if (config.ownerUsername) {
    lines.push(`📱 Telegram: @${config.ownerUsername.replace(/^@/, '')}`);
  }

  if (config.contactEmail) {
    lines.push(`📧 Email: ${config.contactEmail}`);
  }

  lines.push('', '💬 Share your language goal and current level for guidance.');
  return lines.join('\n');
}

function buildUserData(userId) {
  const key = String(userId || '').trim();
  if (!key) return null;

  if (!botState.users[key]) {
    botState.users[key] = {
      id: key,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      referralCode: `ref_${key}_${Math.random().toString(36).slice(2, 6)}`,
    };
  }

  botState.users[key].lastActive = new Date().toISOString();
  return botState.users[key];
}

function keywordReply(text, config, userId) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  buildUserData(userId);

  if (normalized.startsWith('/start') || normalized.startsWith('/help')) {
    return {
      text: `Welcome to Kay's English Corner! 👋\n\nI help you build vocabulary, master grammar, learn idioms, and grow your English naturally.\n\nWhat interests you?`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (normalized.includes('/stats') && String(userId) === config.ownerChatId) {
    const activeToday = Object.values(botState.users).filter((user) => {
      const lastActive = Date.parse(user.lastActive || '');
      return Number.isFinite(lastActive) && (Date.now() - lastActive) < 86400000;
    }).length;

    return {
      text: `📊 Bot Stats:\n• Messages received: ${botState.stats.messagesReceived}\n• Quiz responses: ${botState.stats.quizResponses}\n• Total users: ${Object.keys(botState.users).length}\n• Active today: ${activeToday}`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (normalized.includes('/announce') && String(userId) === config.ownerChatId) {
    return {
      text: '📣 Broadcast feature demo.\n\nIn production, use:\n/announce [message]\n\nThe bot will send it to all subscribers.',
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (normalized.includes('vocab') || normalized.includes('vocabulary')) {
    return {
      text: `📚 Vocabulary Builder:\nWe post 1 new word daily with context and Persian translation.\n\n💡 Tip: collect 5 words and use them in your own sentences.\n\nNext: check the channel for today's word.`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (normalized.includes('grammar')) {
    return {
      text: `🧠 Grammar Nuggets:\nShort, actionable grammar rules that stick.\n\nExamples:\n• "Will" vs "going to"\n• Common preposition mistakes\n• Verb tense differences`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (normalized.includes('idiom') || normalized.includes('expression')) {
    return {
      text: `🎭 Idioms & Expressions:\nLearn how native speakers talk.\n\nRecent examples:\n• "Hit the nail on the head" = be exactly right\n• "Break a leg" = good luck\n• "Piece of cake" = very easy`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (normalized.includes('contact') || normalized.includes('dm')) {
    return {
      text: contactMessage(config),
      reply_markup: buildMainKeyboard(config),
    };
  }

  return {
    text: 'I can help with vocabulary, grammar, idioms, webinars, and eBooks. Choose an option below 👇',
    reply_markup: buildMainKeyboard(config),
  };
}

function callbackReply(data, config, userId) {
  buildUserData(userId);

  switch (data) {
    case 'vocab':
      return {
        text: `📚 Latest vocabulary:\n\nSerendipity (noun)\nFinding good things by chance.\n\nExample: "Meeting my best friend was pure serendipity."\n\n💬 Try using it today.`,
      };
    case 'grammar':
      return {
        text: `✏️ Today's Grammar Tip:\n\n"Used to" vs "Would"\n\n• Used to = past habit or state\n  "I used to live in Tehran."\n  "I used to drink coffee daily."\n\n• Would = repeated past action only\n  ✓ "I would visit grandma weekly."\n  ✗ "I would be shy." (use "used to")`,
      };
    case 'idioms':
      return {
        text: `🎭 Idiom of the Day:\n\n"Put all your eggs in one basket"\n\nMeaning: depend entirely on one thing, which is risky.\n\nExample: "Don't focus only on IELTS. Explore other paths too."`,
      };
    case 'contact':
      return { text: contactMessage(config) };
    default:
      return { text: 'Option received. More is coming soon.' };
  }
}

async function telegramCall(method, payload, botToken, fetchImpl) {
  const response = await fetchImpl(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }

  return data;
}

function isPrivateChat(chat) {
  return chat?.type === 'private';
}

function canForwardDM(text, userId, config) {
  const normalized = normalizeText(text);
  return Boolean(
    normalized
      && !normalized.startsWith('/')
      && !normalized.includes('studied')
      && String(userId) !== config.ownerChatId
  );
}

async function sendMessage(chatId, text, config, fetchImpl, extra = {}) {
  return telegramCall('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  }, config.botToken, fetchImpl);
}

async function processUpdate(update, config, fetchImpl, logger) {
  if (update.message?.new_chat_members) {
    for (const newMember of update.message.new_chat_members) {
      if (newMember?.is_bot) continue;

      const userId = newMember?.id;
      if (!userId) continue;

      buildUserData(userId);

      await sendMessage(
        userId,
        `Welcome to Kay's English Corner! 👋\n\nI help you build vocabulary, master grammar, learn idioms, and grow your English naturally.\n\nWhat interests you?`,
        config,
        fetchImpl,
        { reply_markup: buildMainKeyboard(config) },
      ).catch((error) => {
        logger?.log?.(`Could not DM user ${userId}: ${error.message}`);
      });
    }
  }

  if (update.message && isPrivateChat(update.message.chat)) {
    const userId = update.message.from?.id;
    const text = String(update.message.text || '');

    buildUserData(userId);

    const reply = keywordReply(text, config, userId);
    if (reply) {
      await sendMessage(update.message.chat.id, reply.text, config, fetchImpl, {
        reply_markup: reply.reply_markup,
      });
    }

    if (config.ownerChatId && canForwardDM(text, userId, config)) {
      const username = update.message.from?.username ? `@${update.message.from.username}` : `ID: ${userId}`;
      await sendMessage(config.ownerChatId, `📩 DM from ${username}:\n\n"${text}"`, config, fetchImpl).catch(() => {});
    }
  }

  if (update.callback_query && isPrivateChat(update.callback_query.message?.chat)) {
    const userId = update.callback_query.from?.id;
    const data = update.callback_query.data;

    buildUserData(userId);

    const response = callbackReply(data, config, userId);
    await telegramCall('answerCallbackQuery', {
      callback_query_id: update.callback_query.id,
    }, config.botToken, fetchImpl);

    await sendMessage(update.callback_query.message.chat.id, response.text, config, fetchImpl, {
      reply_markup: buildMainKeyboard(config),
    });
  }

  if (update.poll_answer) {
    botState.stats.quizResponses += 1;
  }
}

export async function handleTelegramWebhook({
  method = 'POST',
  headers = {},
  body = '',
  env = {},
  fetchImpl = fetch,
  logger = console,
} = {}) {
  const config = getConfig(env);

  if (method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!config.botToken) {
    return json(500, { error: 'Missing TELEGRAM_BOT_TOKEN' });
  }

  if (config.webhookSecret) {
    const incomingSecret = getHeader(headers, 'x-telegram-bot-api-secret-token');
    if (!incomingSecret || incomingSecret !== config.webhookSecret) {
      return json(401, { error: 'Invalid webhook secret' });
    }
  }

  let update;
  try {
    update = JSON.parse(body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  botState.stats.messagesReceived += 1;

  try {
    await processUpdate(update, config, fetchImpl, logger);
    return json(200, { ok: true });
  } catch (error) {
    logger?.error?.('Telegram webhook error:', error?.message || error);
    return json(500, { error: error?.message || 'Telegram webhook failed' });
  }
}
