const TELEGRAM_API_BASE = 'https://api.telegram.org';

const DEFAULT_LOCALE = 'en';
const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
  { code: 'uk', label: 'Українська' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
];

const STRINGS = {
  en: {
    languagePrompt:
      'Please choose your language first. After that, I will show you the right menu and explain how this bot works.',
    languageSaved: 'Language saved.',
    webinar: '🔥 Live Webinar - Only $12',
    consultation: '📅 Free Consultation',
    privateClasses: '👩‍🏫 Private Classes',
    essayCorrection: '✍️ AI Essay Correction',
    lessons: '📚 Lessons',
    ebook: '📘 CELPIP eBook',
    youtube: '🎥 YouTube Channel',
    greeting:
      "✨ KAY'S ENGLISH CORNER BOT ✨\n━━━━━━━━━━\n\nHi! I am Kay's helper bot.\nI make it easy to find the right service without getting lost.\n\n📌 WHAT THESE BUTTONS DO\n• 📅 Free Consultation: talk to Kay before you buy anything\n• 👩‍🏫 Private Classes: book one-to-one lessons\n• ✍️ AI Essay Correction: get writing feedback fast\n• 📚 Lessons: open the free study lessons\n• 📘 CELPIP eBook: open the book page\n• 🎥 YouTube Channel: watch free videos\n\n━━━━━━━━━━\n✅ You do not need to type a long message here.\n👉 Just tap the button that matches what you need.\n🌍 To change language, send /start.",
    stats:
      '📊 Bot Stats:\n• Messages received: {messages}\n• Quiz responses: {quiz}\n• Total users: {users}\n• Active today: {active}',
    announce:
      '📣 Broadcast feature demo.\n\nIn production, use:\n/announce [message]\n\nThe bot will send it to all subscribers.',
    dmForward: '📩 DM from {username}:\n\n"{text}"',
  },
  fa: {
    languagePrompt:
      'لطفا اول زبان خود را انتخاب کنید. بعد از آن، من منوی مناسب را نشان می‌دهم و خیلی ساده توضیح می‌دهم این ربات چطور کار می‌کند.',
    languageSaved: 'زبان ذخیره شد.',
    webinar: '🔥 وبینار زنده - فقط 12 دلار',
    consultation: '📅 مشاوره رایگان',
    privateClasses: '👩‍🏫 کلاس خصوصی',
    essayCorrection: '✍️ تصحیح انشا با هوش مصنوعی',
    lessons: '📚 درس‌ها',
    ebook: '📘 کتاب CELPIP',
    youtube: '🎥 کانال یوتیوب',
    greeting:
      '✨ ربات KAY’S ENGLISH CORNER ✨\n━━━━━━━━━━\n\nسلام! من ربات کمکی Kay هستم.\nمن کمک می‌کنم سریع سرویس درست را پیدا کنید و سردرگم نشوید.\n\n📌 دکمه‌ها چه کار می‌کنند\n• 📅 مشاوره رایگان: قبل از خرید با Kay صحبت کنید\n• 👩‍🏫 کلاس خصوصی: کلاس یک‌به‌یک رزرو کنید\n• ✍️ تصحیح انشا با هوش مصنوعی: برای رایتینگ سریع بازخورد بگیرید\n• 📚 درس‌ها: درس‌های رایگان را باز کنید\n• 📘 کتاب CELPIP: صفحه کتاب را ببینید\n• 🎥 کانال یوتیوب: ویدیوهای رایگان را ببینید\n\n━━━━━━━━━━\n✅ لازم نیست اینجا پیام طولانی بفرستید.\n👉 فقط روی دکمه مناسب بزنید.\n🌍 برای تغییر زبان، /start را بفرستید.',
    stats:
      '📊 آمار ربات:\n• تعداد پیام‌ها: {messages}\n• پاسخ‌های آزمون: {quiz}\n• تعداد کاربران: {users}\n• فعال امروز: {active}',
    announce:
      '📣 دموی پیام همگانی.\n\nدر حالت واقعی از این استفاده کنید:\n/announce [message]\n\nربات آن را برای همه مشترک‌ها می‌فرستد.',
    dmForward: '📩 پیام از {username}:\n\n"{text}"',
  },
  uk: {
    languagePrompt:
      'Спочатку виберіть мову. Після цього я покажу правильне меню і просто поясню, як працює цей бот.',
    languageSaved: 'Мову збережено.',
    webinar: '🔥 Живий вебінар - лише 12 $',
    consultation: '📅 Безкоштовна консультація',
    privateClasses: '👩‍🏫 Приватні заняття',
    essayCorrection: '✍️ Перевірка есе з ШІ',
    lessons: '📚 Уроки',
    ebook: '📘 Книга CELPIP',
    youtube: '🎥 Канал YouTube',
    greeting:
      "✨ БОТ KAY'S ENGLISH CORNER ✨\n━━━━━━━━━━\n\nПривіт! Я бот-помічник Kay.\nЯ допомагаю швидко знайти потрібну послугу без плутанини.\n\n📌 ЩО РОБЛЯТЬ ЦІ КНОПКИ\n• 📅 Безкоштовна консультація: поговоріть з Kay перед оплатою\n• 👩‍🏫 Приватні заняття: запишіться на індивідуальні уроки\n• ✍️ Перевірка есе з ШІ: швидко отримайте відгук на письмо\n• 📚 Уроки: відкрийте безкоштовні матеріали\n• 📘 Книга CELPIP: відкрийте сторінку книги\n• 🎥 Канал YouTube: дивіться безкоштовні відео\n\n━━━━━━━━━━\n✅ Не потрібно писати довге повідомлення.\n👉 Просто натисніть потрібну кнопку.\n🌍 Щоб змінити мову, надішліть /start.",
    stats:
      '📊 Статистика бота:\n• Отримано повідомлень: {messages}\n• Відповідей на тести: {quiz}\n• Усього користувачів: {users}\n• Активних сьогодні: {active}',
    announce:
      '📣 Демонстрація розсилки.\n\nУ реальному режимі використовуйте:\n/announce [message]\n\nБот надішле це всім підписникам.',
    dmForward: '📩 Повідомлення від {username}:\n\n"{text}"',
  },
  es: {
    languagePrompt:
      'Primero elige tu idioma. Después te mostraré el menú correcto y te explicaré de forma simple cómo funciona este bot.',
    languageSaved: 'Idioma guardado.',
    webinar: '🔥 Webinar en vivo - solo $12',
    consultation: '📅 Consulta gratis',
    privateClasses: '👩‍🏫 Clases privadas',
    essayCorrection: '✍️ Corrección de ensayo con IA',
    lessons: '📚 Lecciones',
    ebook: '📘 eBook CELPIP',
    youtube: '🎥 Canal de YouTube',
    greeting:
      '✨ BOT DE KAY’S ENGLISH CORNER ✨\n━━━━━━━━━━\n\n¡Hola! Soy el bot de ayuda de Kay.\nTe ayudo a encontrar el servicio correcto sin complicarte.\n\n📌 QUÉ HACEN ESTOS BOTONES\n• 📅 Consulta gratis: habla con Kay antes de pagar\n• 👩‍🏫 Clases privadas: reserva clases uno a uno\n• ✍️ Corrección de ensayo con IA: recibe feedback rápido sobre tu writing\n• 📚 Lecciones: abre las lecciones gratis\n• 📘 eBook CELPIP: abre la página del libro\n• 🎥 Canal de YouTube: mira videos gratis\n\n━━━━━━━━━━\n✅ No necesitas escribir un mensaje largo aquí.\n👉 Solo toca el botón correcto.\n🌍 Si quieres cambiar el idioma, envía /start.',
    stats:
      '📊 Estadísticas del bot:\n• Mensajes recibidos: {messages}\n• Respuestas de quiz: {quiz}\n• Usuarios totales: {users}\n• Activos hoy: {active}',
    announce:
      '📣 Demostración de difusión.\n\nEn producción usa:\n/announce [message]\n\nEl bot lo enviará a todos los suscriptores.',
    dmForward: '📩 Mensaje de {username}:\n\n"{text}"',
  },
  zh: {
    languagePrompt:
      '请先选择你的语言。选好以后，我会显示正确的菜单，并用很简单的方式解释这个机器人怎么用。',
    languageSaved: '语言已保存。',
    webinar: '🔥 直播讲座 - 仅需 $12',
    consultation: '📅 免费咨询',
    privateClasses: '👩‍🏫 私人课程',
    essayCorrection: '✍️ AI作文批改',
    lessons: '📚 课程',
    ebook: '📘 CELPIP电子书',
    youtube: '🎥 YouTube频道',
    greeting:
      '✨ KAY\'S ENGLISH CORNER 机器人 ✨\n━━━━━━━━━━\n\n你好！我是 Kay 的帮助机器人。\n我会帮你快速找到合适的服务，不用到处找。\n\n📌 这些按钮的作用\n• 📅 免费咨询：购买前先和 Kay 聊一聊\n• 👩‍🏫 私人课程：预约一对一课程\n• ✍️ AI作文批改：快速获得写作反馈\n• 📚 课程：打开免费学习课程\n• 📘 CELPIP电子书：打开电子书页面\n• 🎥 YouTube频道：观看免费视频\n\n━━━━━━━━━━\n✅ 你不需要在这里写很长的消息。\n👉 只要点击你需要的按钮就可以。\n🌍 如果想更改语言，请发送 /start。',
    stats:
      '📊 机器人统计：\n• 收到的消息：{messages}\n• 测验回复：{quiz}\n• 用户总数：{users}\n• 今日活跃：{active}',
    announce:
      '📣 群发功能演示。\n\n正式使用时请输入：\n/announce [message]\n\n机器人会把消息发送给所有订阅用户。',
    dmForward: '📩 来自 {username} 的消息：\n\n"{text}"',
  },
};

// Ephemeral state only. This matches the current Cloudflare/Netlify behavior.
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
    websiteUrl: String(env.WEBSITE_URL ?? 'https://ieltscorner.ca').trim(),
    ownerChatId: String(env.TELEGRAM_OWNER_CHAT_ID ?? '').trim(),
    webhookSecret: String(env.TELEGRAM_WEBHOOK_SECRET ?? '').trim(),
  };
}

function getStrings(locale = DEFAULT_LOCALE) {
  return STRINGS[locale] || STRINGS[DEFAULT_LOCALE];
}

function interpolate(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ''));
}

function buildLanguageKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'English', callback_data: 'lang:en' },
        { text: 'فارسی', callback_data: 'lang:fa' },
      ],
      [
        { text: 'Українська', callback_data: 'lang:uk' },
        { text: 'Español', callback_data: 'lang:es' },
      ],
      [
        { text: '中文', callback_data: 'lang:zh' },
      ],
    ],
  };
}

function buildMainKeyboard(config, locale) {
  const text = getStrings(locale);

  return {
    inline_keyboard: [
      [{ text: text.webinar, url: `${config.websiteUrl}/webinar` }],
      [
        { text: text.consultation, url: 'https://calendar.app.google/nzoni849GjBUfEac6' },
        { text: text.privateClasses, url: `${config.websiteUrl}/tutoring` },
      ],
      [
        { text: text.essayCorrection, url: `${config.websiteUrl}/celpip/writing/ai-feedback` },
        { text: text.lessons, url: `${config.websiteUrl}/lessons` },
      ],
      [
        { text: text.ebook, url: `${config.websiteUrl}/ebook` },
        { text: text.youtube, url: 'https://www.youtube.com/@KaraAbdolmaleki' },
      ],
    ],
  };
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
      locale: '',
    };
  }

  botState.users[key].lastActive = new Date().toISOString();
  return botState.users[key];
}

function getUserLocale(userId) {
  const user = buildUserData(userId);
  return user?.locale || '';
}

function setUserLocale(userId, locale) {
  const user = buildUserData(userId);
  if (!user) return DEFAULT_LOCALE;

  user.locale = STRINGS[locale] ? locale : DEFAULT_LOCALE;
  return user.locale;
}

function buildLanguagePrompt() {
  return {
    text: STRINGS[DEFAULT_LOCALE].languagePrompt,
    reply_markup: buildLanguageKeyboard(),
  };
}

function buildGreeting(config, locale) {
  const text = getStrings(locale);
  return {
    text: text.greeting,
    reply_markup: buildMainKeyboard(config, locale),
  };
}

function buildStatsMessage(userId, locale) {
  const activeToday = Object.values(botState.users).filter((user) => {
    const lastActive = Date.parse(user.lastActive || '');
    return Number.isFinite(lastActive) && (Date.now() - lastActive) < 86400000;
  }).length;

  return interpolate(getStrings(locale).stats, {
    messages: botState.stats.messagesReceived,
    quiz: botState.stats.quizResponses,
    users: Object.keys(botState.users).length,
    active: activeToday,
    userId,
  });
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

async function sendLanguagePrompt(chatId, config, fetchImpl) {
  const prompt = buildLanguagePrompt();
  return sendMessage(chatId, prompt.text, config, fetchImpl, {
    reply_markup: prompt.reply_markup,
  });
}

async function sendGreeting(chatId, config, fetchImpl, locale) {
  const reply = buildGreeting(config, locale);
  return sendMessage(chatId, reply.text, config, fetchImpl, {
    reply_markup: reply.reply_markup,
  });
}

async function processTextMessage(update, config, fetchImpl) {
  const userId = update.message.from?.id;
  const text = String(update.message.text || '');
  const normalized = normalizeText(text);
  const locale = getUserLocale(userId);

  if (normalized === '/start' || normalized === '/language' || !locale) {
    await sendLanguagePrompt(update.message.chat.id, config, fetchImpl);
    return;
  }

  if (normalized === '/stats' && String(userId) === config.ownerChatId) {
    await sendMessage(
      update.message.chat.id,
      buildStatsMessage(userId, locale || DEFAULT_LOCALE),
      config,
      fetchImpl,
      { reply_markup: buildMainKeyboard(config, locale || DEFAULT_LOCALE) },
    );
    return;
  }

  if (normalized.startsWith('/announce') && String(userId) === config.ownerChatId) {
    await sendMessage(
      update.message.chat.id,
      getStrings(locale || DEFAULT_LOCALE).announce,
      config,
      fetchImpl,
      { reply_markup: buildMainKeyboard(config, locale || DEFAULT_LOCALE) },
    );
    return;
  }

  await sendGreeting(update.message.chat.id, config, fetchImpl, locale || DEFAULT_LOCALE);

  if (config.ownerChatId && canForwardDM(text, userId, config)) {
    const username = update.message.from?.username ? `@${update.message.from.username}` : `ID: ${userId}`;
    const ownerLocale = getUserLocale(config.ownerChatId) || DEFAULT_LOCALE;
    await sendMessage(
      config.ownerChatId,
      interpolate(getStrings(ownerLocale).dmForward, { username, text }),
      config,
      fetchImpl,
    ).catch(() => {});
  }
}

async function processCallback(update, config, fetchImpl) {
  const userId = update.callback_query.from?.id;
  const data = String(update.callback_query.data || '');
  const chatId = update.callback_query.message?.chat?.id;

  await telegramCall('answerCallbackQuery', {
    callback_query_id: update.callback_query.id,
  }, config.botToken, fetchImpl);

  if (!chatId) return;

  if (data.startsWith('lang:')) {
    const locale = setUserLocale(userId, data.slice(5));
    await sendMessage(chatId, getStrings(locale).languageSaved, config, fetchImpl);
    await sendGreeting(chatId, config, fetchImpl, locale);
    return;
  }

  const locale = getUserLocale(userId) || DEFAULT_LOCALE;
  await sendGreeting(chatId, config, fetchImpl, locale);
}

async function processUpdate(update, config, fetchImpl, logger) {
  if (update.message?.new_chat_members) {
    for (const newMember of update.message.new_chat_members) {
      if (newMember?.is_bot) continue;

      const userId = newMember?.id;
      if (!userId) continue;

      buildUserData(userId);
      await sendLanguagePrompt(userId, config, fetchImpl).catch((error) => {
        logger?.log?.(`Could not DM user ${userId}: ${error.message}`);
      });
    }
  }

  if (update.message && isPrivateChat(update.message.chat)) {
    buildUserData(update.message.from?.id);
    await processTextMessage(update, config, fetchImpl);
  }

  if (update.callback_query && isPrivateChat(update.callback_query.message?.chat)) {
    buildUserData(update.callback_query.from?.id);
    await processCallback(update, config, fetchImpl);
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
