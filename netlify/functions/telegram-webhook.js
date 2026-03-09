const TELEGRAM_API_BASE = 'https://api.telegram.org';

// Simple in-memory data storage (extend with Netlify KV for persistence)
const botData = {
  users: {},
  stats: { messagesReceived: 0, postsCreated: 0, quizResponses: 0 },
  referrals: {},
  userQuizAnswers: {},
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function getConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    channelUrl: process.env.TELEGRAM_CHANNEL_URL ?? '',
    websiteUrl: process.env.WEBSITE_URL ?? 'https://ieltscorner.ca',
    ownerUsername: process.env.TELEGRAM_OWNER_USERNAME ?? '',
    ownerChatId: process.env.TELEGRAM_OWNER_CHAT_ID ?? '',
    contactEmail: process.env.CONTACT_EMAIL ?? '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
  };
}

function normalizeText(input) {
  return String(input ?? '').trim().toLowerCase();
}

function buildMainKeyboard(config) {
  const rows = [
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
      { text: '� Weekly Webinars', url: `${config.websiteUrl}/webinar` },
      { text: '📘 CELPIP eBook', url: `${config.websiteUrl}/ebook` },
    ],
  ];

  return { inline_keyboard: rows };
}

function contactMessage(config) {
  const lines = ['🔗 Connect with Kay:'];
  if (config.ownerUsername) {
    lines.push(`📱 Telegram: @${config.ownerUsername.replace(/^@/, '')}`);
  }
  if (config.contactEmail) {
    lines.push(`📧 Email: ${config.contactEmail}`);
  }
  lines.push('\n💬 Share your language goal and current level for guidance.');
  return lines.join('\n');
}

function buildUserData(userId) {
  if (!botData.users[userId]) {
    botData.users[userId] = {
      id: userId,
      goal: '',
      level: '',
      joinedAt: new Date().toISOString(),
      streak: 0,
      lastActive: new Date().toISOString(),
      referralCode: `ref_${userId}_${Math.random().toString(36).slice(2, 6)}`,
      quizScore: 0,
    };
  }
  return botData.users[userId];
}

function keywordReply(text, config, userId) {
  const t = normalizeText(text);
  if (!t) return null;

  const user = buildUserData(userId);

  if (t.startsWith('/start') || t.startsWith('/help')) {
    return {
      text: `Welcome to Kay's English Corner! 👋\n\nI help you build vocabulary, master grammar, learn idioms, and grow your English naturally.\n\nWhat interests you?`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (t.includes('/stats') && userId.toString() === config.ownerChatId) {
    const stats = botData.stats;
    const activeToday = Object.values(botData.users).filter(u => {
      const lastActive = new Date(u.lastActive);
      const now = new Date();
      return (now - lastActive) < 86400000;
    }).length;
    return {
      text: `📊 Bot Stats:\n• Messages received: ${stats.messagesReceived}\n• Quiz responses: ${stats.quizResponses}\n• Total users: ${Object.keys(botData.users).length}\n• Active today: ${activeToday}`,
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (t.includes('/announce') && userId.toString() === config.ownerChatId) {
    return {
      text: '📣 Broadcast feature demo. In production, use:\n/announce [message]\nBot will send to all subscribers.',
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (t.includes('vocab') || t.includes('vocabulary')) {
    return {
      text: '📚 Vocabulary Builder:\nWe post 1 new word daily with context and Persian translation.\n\n💡 Tip: Collect 5 words, use them in sentences.\n\nNext: Check the channel for today\'s word!',
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (t.includes('grammar')) {
    return {
      text: '🧠 Grammar Nuggets:\nShort, actionable grammar rules that stick.\n\nExamples:\n• When to use "will" vs "going to"\n• Common preposition mistakes\n• Verb tense differences',
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (t.includes('idiom') || t.includes('expression')) {
    return {
      text: '🎭 Idioms & Expressions:\nLearn how native speakers talk.\n\nRecent:\n• "Hit the nail on the head" = be right\n• "Break a leg" = good luck\n• "Piece of cake" = very easy',
      reply_markup: buildMainKeyboard(config),
    };
  }

  if (t.includes('contact') || t.includes('dm')) {
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
  const user = buildUserData(userId);

  switch (data) {
    case 'vocab':
      return {
        text: '📚 Latest vocabulary:\n\n**Serendipity** (noun)\nFinding good things by chance.\n\nExample: "Meeting my best friend was pure serendipity."\n\n💬 Try using it today!',
      };
    case 'grammar':
      return {
        text: '✏️ Today\'s Grammar Tip:\n\n**"Used to" vs "Would"**\n\n• Used to = past habit or state\n  "I used to live in Tehran."\n  "I used to drink coffee daily."\n\n• Would = repeated past action only\n  ✓ "I would visit grandma weekly."\n  ✗ "I would be shy." (use used to)',
      };
    case 'idioms':
      return {
        text: '🎭 Idiom of the Day:\n\n**"Put all your eggs in one basket"**\n\nMeaning: Depend entirely on one thing; risky.\n\nExample: "Don\'t focus only on IELTS—also explore other paths."\n\nOrigin: Ancient saying about eggs and baskets!',
      };
    case 'contact':
      return {
        text: contactMessage(config),
      };
    default:
      return {
        text: 'Option received. More coming soon!',
      };
  }
}

async function telegramCall(method, payload, botToken) {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }

  return data;
}

function isPrivateChat(chat) {
  return chat?.type === 'private';
}

function canForwardDM(text, userId, config) {
  return text && !text.startsWith('/') && !text.toLowerCase().includes('studied') && userId.toString() !== config.ownerChatId;
}

async function sendWelcomeMessage(chatId, config, botToken) {
  const welcomeText = `👋 Welcome to Kay's English Corner!

I'm your AI English companion. Here's what I can help with:

📚 **Vocabulary** - Daily words & phrases
✏️ **Grammar** - Practical tips & explanations
💡 **Idioms & Expressions** - Natural English speech patterns
� **Weekly Webinars** - Live sessions every Saturday
📘 **CELPIP eBook** - Complete exam preparation guide

To get started, just:
1. Say hello or click any button below
2. Browse vocabulary, grammar, or idioms
3. Visit our website for full lessons

Ready? Let's go! 🚀`;

  try {
    await telegramCall('sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      reply_markup: buildMainKeyboard(config),
      disable_web_page_preview: true,
    }, botToken);
  } catch (error) {
    console.error('Failed to send welcome message:', error.message);
  }
}

export async function handler(event) {
  const config = getConfig();

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!config.botToken) {
    return json(500, { error: 'Missing TELEGRAM_BOT_TOKEN' });
  }

  if (config.webhookSecret) {
    const incomingSecret = event.headers['x-telegram-bot-api-secret-token'] ?? event.headers['X-Telegram-Bot-Api-Secret-Token'];
    if (!incomingSecret || incomingSecret !== config.webhookSecret) {
      return json(401, { error: 'Invalid webhook secret' });
    }
  }

  let update;
  try {
    update = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  botData.stats.messagesReceived += 1;

  try {
    // Handle new members joining group/supergroup
    if (update.message?.new_chat_members) {
      for (const newMember of update.message.new_chat_members) {
        // Don't greet bots or the bot itself
        if (newMember.is_bot) continue;

        const userId = newMember.id;
        buildUserData(userId);

        // Send welcome DM to the new member
        await telegramCall('sendMessage', {
          chat_id: userId,
          text: `Welcome to Kay's English Corner! 👋\n\nI help you build vocabulary, master grammar, learn idioms, and grow your English naturally.\n\nWhat interests you?`,
          reply_markup: buildMainKeyboard(config),
          disable_web_page_preview: true,
        }, config.botToken).catch((err) => {
          console.log(`Could not DM user ${userId}:`, err.message);
        });
      }
    }

    // Handle text messages in private chat
    if (update.message && isPrivateChat(update.message.chat)) {
      const userId = update.message.from?.id;
      const text = update.message.text;

      const user = buildUserData(userId);

      const reply = keywordReply(text, config, userId);
      if (reply) {
        await telegramCall('sendMessage', {
          chat_id: update.message.chat.id,
          text: reply.text,
          reply_markup: reply.reply_markup,
          disable_web_page_preview: true,
        }, config.botToken);
      }

      // Forward unmatched DMs to owner for manual follow-up
      if (config.ownerChatId && canForwardDM(text, userId, config)) {
        const username = update.message.from?.username ? `@${update.message.from.username}` : `ID: ${userId}`;
        await telegramCall('sendMessage', {
          chat_id: config.ownerChatId,
          text: `📩 DM from ${username}:\n\n"${text}"`,
          disable_web_page_preview: true,
        }, config.botToken).catch(() => {});
      }
    }

    // Handle callback button clicks
    if (update.callback_query && isPrivateChat(update.callback_query.message?.chat)) {
      const userId = update.callback_query.from?.id;
      const data = update.callback_query.data;

      buildUserData(userId);

      const response = callbackReply(data, config, userId);
      await telegramCall('answerCallbackQuery', {
        callback_query_id: update.callback_query.id,
      }, config.botToken);

      await telegramCall('sendMessage', {
        chat_id: update.callback_query.message.chat.id,
        text: response.text,
        reply_markup: buildMainKeyboard(config),
        disable_web_page_preview: true,
      }, config.botToken);
    }

    // Track quiz poll responses
    if (update.poll_answer) {
      botData.stats.quizResponses += 1;
    }
  } catch (error) {
    return json(500, { error: error.message });
  }

  return json(200, { ok: true });
}

