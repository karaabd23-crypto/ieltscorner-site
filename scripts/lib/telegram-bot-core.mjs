const TELEGRAM_API_BASE = 'https://api.telegram.org';

const DEFAULT_LOCALE = 'en';
const ACTIVE_MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);
const MAX_OBSERVED_USERNAMES = 200;
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
    groupInviteMissing:
      'Set TELEGRAM_GROUP_INVITE_URL or TELEGRAM_GROUP_URL first so I know which group invite link to send.',
    groupInviteUsage:
      'Use /invitegroup @username1 @username2 | optional custom message',
    groupInviteNoMatches:
      'None of those usernames are known DM users yet. I can only message people who already started the bot.',
    groupInviteDefault:
      'You are invited to join the IELTS Corner Telegram study group. Tap the button below to join.',
    groupInviteButton: '👥 Join Study Group',
    groupInviteSummary:
      'Invite run finished. Sent: {sent}. Failed: {failed}. Unmatched: {unmatched}.',
    groupInviteUnmatched:
      'Unmatched usernames: {usernames}',
    webinar: '🔥 Live Webinar - Only $12',
    consultation: '📅 Free Consultation',
    privateClasses: '👩‍🏫 Private Classes',
    essayCorrection: '✍️ AI Essay Correction',
    lessons: '📚 Free Lessons',
    ebook: '📘 CELPIP eBook',
    youtube: '🎥 YouTube Channel',
    greeting:
      "✨ KAY'S ENGLISH CORNER BOT ✨\n━━━━━━━━━━\n\nHi! I am Kay's helper bot.\nI make it easy to find the right service without getting lost.\n\n📌 WHAT THESE BUTTONS DO\n• 📅 Free Consultation: talk to Kay before you buy anything\n• 👩‍🏫 Private Classes: book one-to-one lessons\n• ✍️ AI Essay Correction: get writing feedback fast\n• 📚 Lessons: open the free study lessons\n• 📘 CELPIP eBook: open the book page\n• 🎥 YouTube Channel: watch free videos\n\n━━━━━━━━━━\n✅ You do not need to type a long message here.\n👉 Just tap the button that matches what you need.\n🌍 To change language, send /start.",
    stats:
      '📊 Bot Stats:\n• Messages received: {messages}\n• Quiz responses: {quiz}\n• Total users: {users}\n• Active today: {active}',
    announce:
      '📣 Broadcast feature demo.\n\nIn production, use:\n/announce [message]\n\nThe bot will send it to all subscribers.',
    channelInfo:
      '📣 Channel info for {channel}\n• Title: {title}\n• Chat ID: {chatId}\n• Members: {members}\n• Admins: {admins}\n• Observed usernames: {observed}\n\nTelegram does not provide bots with a full channel member list. This bot can only export usernames it has actually observed through join requests or member status updates.',
    channelMembersEmpty:
      'I have not observed any usernames for {channel} yet. Telegram does not expose a full channel member list to bots, so I can only export usernames seen through join requests or member status updates.',
    channelMembers:
      'Observed usernames for {channel} ({shown}{truncated}):\n{usernames}',
    channelArgMissing:
      'Send the command with a public @username, numeric chat ID, or t.me link. Example: /channelinfo https://t.me/yourchannel',
    channelArgInvalid:
      'I could not parse that channel reference. Use a public @username, numeric chat ID, or t.me link.',
    dmForward: '📩 DM from {username}:\n\n"{text}"',
  },
  fa: {
    languagePrompt:
      'لطفا اول زبان خود را انتخاب کنید. بعد از آن، من منوی مناسب را نشان می‌دهم و خیلی ساده توضیح می‌دهم این ربات چطور کار می‌کند.',
    languageSaved: 'زبان ذخیره شد.',
    groupInviteMissing:
      'اول TELEGRAM_GROUP_INVITE_URL یا TELEGRAM_GROUP_URL را تنظیم کنید تا لینک دعوت گروه مشخص باشد.',
    groupInviteUsage:
      'از /invitegroup @username1 @username2 | پیام اختیاری استفاده کنید',
    groupInviteNoMatches:
      'هیچ‌کدام از این یوزرنیم‌ها جزو کاربران شناخته‌شده دایرکت نیستند. فقط به کسانی می‌توانم پیام بدهم که قبلا ربات را استارت کرده‌اند.',
    groupInviteDefault:
      'شما به گروه مطالعه تلگرام IELTS Corner دعوت شده‌اید. برای عضویت روی دکمه زیر بزنید.',
    groupInviteButton: '👥 ورود به گروه مطالعه',
    groupInviteSummary:
      'ارسال دعوت تمام شد. موفق: {sent}. ناموفق: {failed}. نامنطبق: {unmatched}.',
    groupInviteUnmatched:
      'یوزرنیم‌های نامنطبق: {usernames}',
    webinar: '🔥 وبینار زنده - فقط 12 دلار',
    consultation: '📅 مشاوره رایگان',
    privateClasses: '👩‍🏫 کلاس خصوصی',
    essayCorrection: '✍️ تصحیح رایتینگ سلپیپ باAI',
    lessons: '📚 درس‌ها',
    ebook: '📘 کتاب CELPIP',
    youtube: '🎥 کانال یوتیوب',
    greeting:
      '✨ ربات KAY’S ENGLISH CORNER ✨\n━━━━━━━━━━\n\nسلام! من ربات کمکی Kay هستم.\nمن کمک می‌کنم سریع سرویس درست را پیدا کنید و سردرگم نشوید.\n\n📌 دکمه‌ها چه کار می‌کنند\n• 📅 مشاوره رایگان: قبل از خرید با Kay صحبت کنید\n• 👩‍🏫 کلاس خصوصی: کلاس یک‌به‌یک رزرو کنید\n• ✍️ تصحیح انشا با هوش مصنوعی: برای رایتینگ سریع بازخورد بگیرید\n• 📚 درس‌ها: درس‌های رایگان را باز کنید\n• 📘 کتاب CELPIP: صفحه کتاب را ببینید\n• 🎥 کانال یوتیوب: ویدیوهای رایگان را ببینید\n\n━━━━━━━━━━\n✅ لازم نیست اینجا پیام طولانی بفرستید.\n👉 فقط روی دکمه مناسب بزنید.\n🌍 برای تغییر زبان، /start را بفرستید.',
    stats:
      '📊 آمار ربات:\n• تعداد پیام‌ها: {messages}\n• پاسخ‌های آزمون: {quiz}\n• تعداد کاربران: {users}\n• فعال امروز: {active}',
    announce:
      '📣 دموی پیام همگانی.\n\nدر حالت واقعی از این استفاده کنید:\n/announce [message]\n\nربات آن را برای همه مشترک‌ها می‌فرستد.',
    channelInfo:
      '📣 اطلاعات کانال {channel}\n• عنوان: {title}\n• شناسه چت: {chatId}\n• تعداد اعضا: {members}\n• مدیرها: {admins}\n• یوزرنیم‌های مشاهده‌شده: {observed}\n\nتلگرام فهرست کامل اعضای کانال را به ربات‌ها نمی‌دهد. این ربات فقط یوزرنیم‌هایی را می‌تواند خروجی بگیرد که واقعا از طریق درخواست عضویت یا تغییر وضعیت عضو دیده است.',
    channelMembersEmpty:
      'هنوز هیچ یوزرنیمی برای {channel} مشاهده نشده است. تلگرام فهرست کامل اعضای کانال را به ربات‌ها نمی‌دهد، بنابراین فقط یوزرنیم‌هایی را می‌توانم خروجی بگیرم که از طریق درخواست عضویت یا تغییر وضعیت عضو دیده شده‌اند.',
    channelMembers:
      'یوزرنیم‌های مشاهده‌شده برای {channel} ({shown}{truncated}):\n{usernames}',
    channelArgMissing:
      'دستور را همراه با @username عمومی، شناسه عددی چت یا لینک t.me بفرستید. مثال: /channelinfo https://t.me/yourchannel',
    channelArgInvalid:
      'نتوانستم این مرجع کانال را تشخیص بدهم. از @username عمومی، شناسه عددی چت یا لینک t.me استفاده کنید.',
    dmForward: '📩 پیام از {username}:\n\n"{text}"',
  },
  uk: {
    languagePrompt:
      'Спочатку виберіть мову. Після цього я покажу правильне меню і просто поясню, як працює цей бот.',
    languageSaved: 'Мову збережено.',
    groupInviteMissing:
      'Спочатку задайте TELEGRAM_GROUP_INVITE_URL або TELEGRAM_GROUP_URL, щоб я знав, яке посилання-запрошення в групу надсилати.',
    groupInviteUsage:
      'Використайте /invitegroup @username1 @username2 | необовʼязкове повідомлення',
    groupInviteNoMatches:
      'Жоден із цих usernames не є відомим DM-користувачем. Я можу писати лише тим, хто вже запускав бота.',
    groupInviteDefault:
      'Вас запрошено до навчальної Telegram-групи IELTS Corner. Натисніть кнопку нижче, щоб приєднатися.',
    groupInviteButton: '👥 Приєднатися до групи',
    groupInviteSummary:
      'Надсилання запрошень завершено. Успішно: {sent}. Помилки: {failed}. Не знайдено: {unmatched}.',
    groupInviteUnmatched:
      'Не знайдені usernames: {usernames}',
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
    channelInfo:
      '📣 Інформація про канал {channel}\n• Назва: {title}\n• Chat ID: {chatId}\n• Учасників: {members}\n• Адміністратори: {admins}\n• Помічені usernames: {observed}\n\nTelegram не надає ботам повний список учасників каналу. Цей бот може експортувати лише usernames, які реально побачив через заявки на вступ або оновлення статусу учасника.',
    channelMembersEmpty:
      'Я ще не бачив usernames для {channel}. Telegram не відкриває ботам повний список учасників каналу, тому я можу експортувати лише usernames, які були помічені через заявки на вступ або оновлення статусу учасника.',
    channelMembers:
      'Помічені usernames для {channel} ({shown}{truncated}):\n{usernames}',
    channelArgMissing:
      'Надішліть команду разом із публічним @username, числовим chat ID або посиланням t.me. Приклад: /channelinfo https://t.me/yourchannel',
    channelArgInvalid:
      'Не вдалося розпізнати це посилання на канал. Використайте публічний @username, числовий chat ID або посилання t.me.',
    dmForward: '📩 Повідомлення від {username}:\n\n"{text}"',
  },
  es: {
    languagePrompt:
      'Primero elige tu idioma. Después te mostraré el menú correcto y te explicaré de forma simple cómo funciona este bot.',
    languageSaved: 'Idioma guardado.',
    groupInviteMissing:
      'Primero configura TELEGRAM_GROUP_INVITE_URL o TELEGRAM_GROUP_URL para que sepa qué enlace de invitación al grupo enviar.',
    groupInviteUsage:
      'Usa /invitegroup @username1 @username2 | mensaje opcional',
    groupInviteNoMatches:
      'Ninguno de esos usernames es un usuario DM conocido. Solo puedo escribir a personas que ya iniciaron el bot.',
    groupInviteDefault:
      'Estás invitado a unirte al grupo de estudio de Telegram de IELTS Corner. Toca el botón de abajo para entrar.',
    groupInviteButton: '👥 Unirse al grupo',
    groupInviteSummary:
      'Invitación completada. Enviadas: {sent}. Fallidas: {failed}. Sin coincidencia: {unmatched}.',
    groupInviteUnmatched:
      'Usernames sin coincidencia: {usernames}',
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
    channelInfo:
      '📣 Información del canal {channel}\n• Título: {title}\n• ID del chat: {chatId}\n• Miembros: {members}\n• Administradores: {admins}\n• Usernames observados: {observed}\n\nTelegram no da a los bots una lista completa de miembros del canal. Este bot solo puede exportar usernames que realmente haya visto mediante solicitudes de ingreso o cambios de estado de miembros.',
    channelMembersEmpty:
      'Todavía no he observado usernames para {channel}. Telegram no expone a los bots la lista completa de miembros del canal, así que solo puedo exportar usernames vistos mediante solicitudes de ingreso o cambios de estado de miembros.',
    channelMembers:
      'Usernames observados para {channel} ({shown}{truncated}):\n{usernames}',
    channelArgMissing:
      'Envía el comando con un @username público, un ID numérico del chat o un enlace t.me. Ejemplo: /channelinfo https://t.me/yourchannel',
    channelArgInvalid:
      'No pude interpretar esa referencia del canal. Usa un @username público, un ID numérico del chat o un enlace t.me.',
    dmForward: '📩 Mensaje de {username}:\n\n"{text}"',
  },
  zh: {
    languagePrompt:
      '请先选择你的语言。选好以后，我会显示正确的菜单，并用很简单的方式解释这个机器人怎么用。',
    languageSaved: '语言已保存。',
    groupInviteMissing:
      '请先设置 TELEGRAM_GROUP_INVITE_URL 或 TELEGRAM_GROUP_URL，这样我才知道要发送哪个群组邀请链接。',
    groupInviteUsage:
      '请使用 /invitegroup @username1 @username2 | 可选消息',
    groupInviteNoMatches:
      '这些用户名都不是已知的私聊用户。我只能给已经启动过机器人的人发消息。',
    groupInviteDefault:
      '你已被邀请加入 IELTS Corner Telegram 学习群。点击下面的按钮即可加入。',
    groupInviteButton: '👥 加入学习群',
    groupInviteSummary:
      '邀请发送完成。成功：{sent}。失败：{failed}。未匹配：{unmatched}。',
    groupInviteUnmatched:
      '未匹配用户名：{usernames}',
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
    channelInfo:
      '📣 频道信息 {channel}\n• 标题：{title}\n• Chat ID：{chatId}\n• 成员数：{members}\n• 管理员：{admins}\n• 已观察到的用户名：{observed}\n\nTelegram 不会向机器人提供完整的频道成员列表。这个机器人只能导出它通过加入请求或成员状态更新真正看到过的用户名。',
    channelMembersEmpty:
      '我还没有为 {channel} 观察到任何用户名。Telegram 不会向机器人公开完整的频道成员列表，所以我只能导出通过加入请求或成员状态更新看到的用户名。',
    channelMembers:
      '为 {channel} 观察到的用户名（显示 {shown}{truncated}）：\n{usernames}',
    channelArgMissing:
      '请在命令后附上公开 @username、数字 chat ID 或 t.me 链接。例如：/channelinfo https://t.me/yourchannel',
    channelArgInvalid:
      '我无法解析这个频道引用。请使用公开 @username、数字 chat ID 或 t.me 链接。',
    dmForward: '📩 来自 {username} 的消息：\n\n"{text}"',
  },
};

// Ephemeral state only. This matches the current Cloudflare/Netlify behavior.
const botState = {
  users: {},
  observedChats: {},
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

function isOwner(userId, config) {
  return Boolean(config.ownerChatId) && String(userId) === config.ownerChatId;
}

function getCommandArgument(text) {
  return String(text ?? '').trim().split(/\s+/).slice(1).join(' ').trim();
}

function parseChatReference(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  if (/^-?\d+$/.test(raw)) {
    return raw;
  }

  if (raw.startsWith('@')) {
    return raw;
  }

  let candidate = raw;
  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(`https://${raw}`);

    if (!/(^|\.)t\.me$/i.test(url.hostname)) {
      return '';
    }

    const parts = url.pathname.split('/').filter(Boolean);
    if (!parts.length) return '';

    const slug = parts[0];
    if (slug === '+' || slug === 'joinchat' || slug.startsWith('+')) {
      return '';
    }

    candidate = slug;
  } catch {
    candidate = raw;
  }

  const slug = candidate.replace(/^@/, '').trim();
  if (!slug || !/^[A-Za-z0-9_]{5,}$/.test(slug)) {
    return '';
  }

  return `@${slug}`;
}

function getObservedChat(chatId) {
  const key = String(chatId ?? '').trim();
  if (!key) return null;

  if (!botState.observedChats[key]) {
    botState.observedChats[key] = {
      id: key,
      title: '',
      username: '',
      users: {},
    };
  }

  return botState.observedChats[key];
}

function updateObservedChat(chat) {
  const observedChat = getObservedChat(chat?.id);
  if (!observedChat) return null;

  observedChat.title = String(chat?.title ?? observedChat.title ?? '').trim();
  observedChat.username = String(chat?.username ?? observedChat.username ?? '').trim();
  return observedChat;
}

function trackObservedMember(chat, user, source, status = 'member') {
  if (!chat?.id || !user?.id || user.is_bot) return;

  const observedChat = updateObservedChat(chat);
  if (!observedChat) return;

  const key = String(user.id);
  const existing = observedChat.users[key] || {};
  const firstName = String(user.first_name ?? existing.firstName ?? '').trim();
  const lastName = String(user.last_name ?? existing.lastName ?? '').trim();
  const username = String(user.username ?? existing.username ?? '').trim();

  observedChat.users[key] = {
    id: key,
    firstName,
    lastName,
    username,
    status,
    source,
    active: ACTIVE_MEMBER_STATUSES.has(status),
    firstSeenAt: existing.firstSeenAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
}

function formatAdminLabel(member) {
  const user = member?.user;
  if (!user) return null;
  if (user.username) return `@${user.username}`;

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || `ID ${user.id}`;
}

function getObservedUsernames(chatId) {
  const observedChat = getObservedChat(chatId);
  if (!observedChat) return [];

  const usernames = Object.values(observedChat.users)
    .filter((entry) => entry.active && entry.username)
    .map((entry) => `@${entry.username}`);

  return Array.from(new Set(usernames)).sort((left, right) => left.localeCompare(right));
}

function formatChannelLabel(chat) {
  if (chat?.username) return `@${chat.username}`;
  if (chat?.title) return chat.title;
  return String(chat?.id ?? 'this chat');
}

function chunkLines(lines, maxLength = 3500) {
  const chunks = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function parseInviteUsernamesArgument(text) {
  const raw = getCommandArgument(text);
  if (!raw) {
    return { usernames: [], customMessage: '' };
  }

  const [targetsPart, ...messageParts] = raw.split('|');
  const usernames = Array.from(
    new Set(
      String(targetsPart || '')
        .match(/@[A-Za-z0-9_]{5,}/g) || [],
    ),
  ).map((username) => username.toLowerCase());

  return {
    usernames,
    customMessage: messageParts.join('|').trim(),
  };
}

function syncKnownUserProfile(userId, telegramUser = {}) {
  const user = buildUserData(userId);
  if (!user) return null;

  if (telegramUser.username) {
    user.username = `@${String(telegramUser.username).trim().toLowerCase()}`;
  }

  if (telegramUser.first_name) {
    user.firstName = String(telegramUser.first_name).trim();
  }

  if (telegramUser.last_name) {
    user.lastName = String(telegramUser.last_name).trim();
  }

  return user;
}

function resolveKnownUsersByUsername(usernames) {
  const requested = usernames.map((username) => String(username).trim().toLowerCase());
  const matchedUsers = [];
  const unmatchedUsernames = [];

  for (const username of requested) {
    const matchedUser = Object.values(botState.users).find((user) => user.username === username);
    if (matchedUser) {
      matchedUsers.push(matchedUser);
    } else {
      unmatchedUsernames.push(username);
    }
  }

  return {
    matchedUsers,
    unmatchedUsernames,
  };
}

function buildGroupInviteMessage(config, locale, customMessage = '') {
  const strings = getStrings(locale);
  return {
    text: customMessage || strings.groupInviteDefault,
    reply_markup: {
      inline_keyboard: [[{ text: strings.groupInviteButton, url: config.groupInviteUrl }]],
    },
  };
}

async function sendGroupInviteToKnownUsers(ownerChatId, usernames, customMessage, config, fetchImpl, locale) {
  const strings = getStrings(locale);
  const { matchedUsers, unmatchedUsernames } = resolveKnownUsersByUsername(usernames);

  if (!matchedUsers.length) {
    await sendMessage(ownerChatId, strings.groupInviteNoMatches, config, fetchImpl);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const user of matchedUsers) {
    const recipientLocale = user.locale || DEFAULT_LOCALE;
    const invite = buildGroupInviteMessage(config, recipientLocale, customMessage);
    try {
      await sendMessage(user.id, invite.text, config, fetchImpl, {
        reply_markup: invite.reply_markup,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  await sendMessage(
    ownerChatId,
    interpolate(strings.groupInviteSummary, {
      sent,
      failed,
      unmatched: unmatchedUsernames.length,
    }),
    config,
    fetchImpl,
  );

  if (unmatchedUsernames.length) {
    await sendMessage(
      ownerChatId,
      interpolate(strings.groupInviteUnmatched, {
        usernames: unmatchedUsernames.join(', '),
      }),
      config,
      fetchImpl,
    );
  }
}

function getConfig(env = {}) {
  return {
    botToken: String(env.TELEGRAM_BOT_TOKEN ?? '').trim(),
    websiteUrl: String(env.WEBSITE_URL ?? 'https://ieltscorner.ca').trim(),
    groupInviteUrl: String(env.TELEGRAM_GROUP_INVITE_URL ?? env.TELEGRAM_GROUP_URL ?? '').trim(),
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

async function fetchChatSummary(chatRef, config, fetchImpl) {
  const [chatResponse, memberCountResponse, adminsResponse] = await Promise.all([
    telegramCall('getChat', { chat_id: chatRef }, config.botToken, fetchImpl),
    telegramCall('getChatMemberCount', { chat_id: chatRef }, config.botToken, fetchImpl),
    telegramCall('getChatAdministrators', { chat_id: chatRef }, config.botToken, fetchImpl),
  ]);

  const chat = chatResponse.result;
  updateObservedChat(chat);

  return {
    chat,
    memberCount: memberCountResponse.result,
    administrators: adminsResponse.result || [],
  };
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

async function sendChannelInfo(chatId, chatRef, config, fetchImpl, locale) {
  const summary = await fetchChatSummary(chatRef, config, fetchImpl);
  const channelLabel = formatChannelLabel(summary.chat);
  const admins = summary.administrators.map(formatAdminLabel).filter(Boolean);
  const observedUsernames = getObservedUsernames(summary.chat.id);

  await sendMessage(
    chatId,
    interpolate(getStrings(locale).channelInfo, {
      channel: channelLabel,
      title: summary.chat.title || channelLabel,
      chatId: summary.chat.id,
      members: summary.memberCount,
      admins: admins.length ? admins.join(', ') : 'none visible',
      observed: observedUsernames.length,
    }),
    config,
    fetchImpl,
  );
}

async function sendObservedMembers(chatId, chatRef, config, fetchImpl, locale) {
  const summary = await fetchChatSummary(chatRef, config, fetchImpl);
  const channelLabel = formatChannelLabel(summary.chat);
  const observedUsernames = getObservedUsernames(summary.chat.id);

  if (!observedUsernames.length) {
    await sendMessage(
      chatId,
      interpolate(getStrings(locale).channelMembersEmpty, { channel: channelLabel }),
      config,
      fetchImpl,
    );
    return;
  }

  const visibleUsernames = observedUsernames.slice(0, MAX_OBSERVED_USERNAMES);
  const header = interpolate(getStrings(locale).channelMembers, {
    channel: channelLabel,
    shown: visibleUsernames.length,
    truncated: observedUsernames.length > visibleUsernames.length ? ` of ${observedUsernames.length}` : '',
    usernames: '',
  }).split('\n{usernames}')[0];

  const chunks = chunkLines([header, ...visibleUsernames]);
  for (const chunk of chunks) {
    await sendMessage(chatId, chunk, config, fetchImpl);
  }
}

async function processTextMessage(update, config, fetchImpl) {
  const userId = update.message.from?.id;
  const text = String(update.message.text || '');
  const normalized = normalizeText(text);
  syncKnownUserProfile(userId, update.message.from);
  const locale = getUserLocale(userId);
  const strings = getStrings(locale || DEFAULT_LOCALE);

  if (normalized === '/start' || normalized === '/language' || !locale) {
    await sendLanguagePrompt(update.message.chat.id, config, fetchImpl);
    return;
  }

  if (normalized === '/stats' && isOwner(userId, config)) {
    await sendMessage(
      update.message.chat.id,
      buildStatsMessage(userId, locale || DEFAULT_LOCALE),
      config,
      fetchImpl,
      { reply_markup: buildMainKeyboard(config, locale || DEFAULT_LOCALE) },
    );
    return;
  }

  if (normalized.startsWith('/announce') && isOwner(userId, config)) {
    await sendMessage(
      update.message.chat.id,
      getStrings(locale || DEFAULT_LOCALE).announce,
      config,
      fetchImpl,
      { reply_markup: buildMainKeyboard(config, locale || DEFAULT_LOCALE) },
    );
    return;
  }

  if (normalized.startsWith('/channelinfo') && isOwner(userId, config)) {
    const chatRef = parseChatReference(getCommandArgument(text));
    if (!getCommandArgument(text)) {
      await sendMessage(update.message.chat.id, strings.channelArgMissing, config, fetchImpl);
      return;
    }
    if (!chatRef) {
      await sendMessage(update.message.chat.id, strings.channelArgInvalid, config, fetchImpl);
      return;
    }

    await sendChannelInfo(update.message.chat.id, chatRef, config, fetchImpl, locale || DEFAULT_LOCALE);
    return;
  }

  if (normalized.startsWith('/channelmembers') && isOwner(userId, config)) {
    const chatRef = parseChatReference(getCommandArgument(text));
    if (!getCommandArgument(text)) {
      await sendMessage(update.message.chat.id, strings.channelArgMissing, config, fetchImpl);
      return;
    }
    if (!chatRef) {
      await sendMessage(update.message.chat.id, strings.channelArgInvalid, config, fetchImpl);
      return;
    }

    await sendObservedMembers(update.message.chat.id, chatRef, config, fetchImpl, locale || DEFAULT_LOCALE);
    return;
  }

  if (normalized.startsWith('/invitegroup') && isOwner(userId, config)) {
    if (!config.groupInviteUrl) {
      await sendMessage(update.message.chat.id, strings.groupInviteMissing, config, fetchImpl);
      return;
    }

    const { usernames, customMessage } = parseInviteUsernamesArgument(text);
    if (!usernames.length) {
      await sendMessage(update.message.chat.id, strings.groupInviteUsage, config, fetchImpl);
      return;
    }

    await sendGroupInviteToKnownUsers(
      update.message.chat.id,
      usernames,
      customMessage,
      config,
      fetchImpl,
      locale || DEFAULT_LOCALE,
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
  syncKnownUserProfile(userId, update.callback_query.from);

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
      trackObservedMember(update.message.chat, newMember, 'message_new_chat_member', 'member');
      await sendLanguagePrompt(userId, config, fetchImpl).catch((error) => {
        logger?.log?.(`Could not DM user ${userId}: ${error.message}`);
      });
    }
  }

  if (update.chat_member?.new_chat_member?.user) {
    trackObservedMember(
      update.chat_member.chat,
      update.chat_member.new_chat_member.user,
      'chat_member',
      String(update.chat_member.new_chat_member.status || 'member'),
    );
  }

  if (update.chat_join_request?.from) {
    trackObservedMember(update.chat_join_request.chat, update.chat_join_request.from, 'chat_join_request', 'pending');
  }

  if (update.message && isPrivateChat(update.message.chat)) {
    syncKnownUserProfile(update.message.from?.id, update.message.from);
    await processTextMessage(update, config, fetchImpl);
  }

  if (update.callback_query && isPrivateChat(update.callback_query.message?.chat)) {
    syncKnownUserProfile(update.callback_query.from?.id, update.callback_query.from);
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
