#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  claimPostOwnership,
  createContentFingerprint,
  fetchRecentChannelTexts,
  hasFingerprint,
  hasRecentTopic,
  loadPostHistory,
  rememberFingerprint,
  releasePostOwnershipClaim,
  resolveHistoryFilePath,
  resolvePublicChannelSlug,
  savePostHistory,
  toCanonicalPostText,
} from './lib/telegram-dedupe.mjs';

const SIGNATURE_BLOCK = [
  '🌈✨ Kay\'s English Corner 🇨🇦',
  'Your Gateway to English Success',
  '🌐 More lessons: https://ieltscorner.ca',
  '🧑‍🏫 Tutoring | ✍️ Writing feedback: https://ieltscorner.ca/tutoring | https://ieltscorner.ca/essay-correction',
].join('\n');

const BOT_GUIDES = [
  {
    title: '🤖 Bot Guide: Start Here',
    topic: 'bot-guide-start-here',
    hashtags: ['#TelegramBot', '#LearnEnglish', '#StudyHelp'],
    postBody: [
      '🤖 Bot Guide: Start Here',
      '',
      'New here? Imagine you just opened the bot and suddenly you see a few buttons. Where do you begin? 👇',
      '',
      'Start with /start. That opens the main menu and shows your fastest path.',
      '',
      '1️⃣ Open @Ewithkpaybot',
      '',
      '2️⃣ Tap /start',
      '',
      '3️⃣ Pick one clear need only:',
      'vocabulary / grammar / idioms / contact',
      '',
      '💡 Why this works:',
      'One clear need gives you one useful answer fast.',
      'If you tap everything randomly, the bot feels confusing.',
      '',
      '🇮🇷 فارسی خودمونی:',
      'اگه تازه اومدی، اول /start رو بزن.',
      'اونجا منوی اصلی باز می‌شه.',
      'بعد ببین الان دقیقا چی لازم داری: واژه؟ گرامر؟ اصطلاح؟',
      'همون یکی رو بزن. نذار چند تا نیاز با هم قاطی بشه.',
      '',
      '🎯 Try it now:',
      'Open the bot and send: grammar',
    ].join('\n'),
    quiz: {
      question: 'What should a new user send first?',
      options: ['/start', 'essay', 'score', 'channel'],
      correctIndex: 0,
      explanation: 'Start with /start so the bot shows the main options.',
    },
  },
  {
    title: '🧭 Bot Guide: what each button actually does',
    topic: 'bot-guide-buttons-and-links',
    hashtags: ['#TelegramBot', '#EnglishTips', '#DailyStudy'],
    postBody: [
      '🧭 Bot Guide: what each button actually does',
      '',
      'You open the bot. You see several buttons. If you do not know which one solves which problem, use this map 👇',
      '',
      'Think of the bot as quick help, not your full course.',
      'Each button solves a different kind of problem.',
      '',
      '📚 Vocabulary',
      'Use this when you want one useful word fast.',
      'You get a short meaning and a simple example.',
      '',
      '🎯 Grammar Tips',
      'Use this when you keep making one grammar mistake.',
      'You get one quick rule and a short example.',
      '',
      '💡 Idioms & Expressions',
      'Use this when you want more natural speaking.',
      'You get one expression you can actually use.',
      '',
      '✉️ Contact Kay',
      'Use this when you want to ask about classes or services.',
      'You get direct contact details.',
      '',
      '🌐 Visit Website',
      'Use this when you want the full lesson, samples, tutoring, or writing feedback.',
      '',
      '📣 Telegram Channel',
      'Use this when you want daily posts, quiz polls, and extra practice.',
      '',
      '👀 Real situation:',
      'You have 5 minutes before class and you keep making one grammar mistake.',
      'That is a Grammar Tips moment, not a Website moment.',
      '',
      '💡 Easiest way to think about it:',
      'bot = quick answer',
      'website = full lesson',
      'channel = daily practice',
      '',
      '🇮🇷 فارسی خودمونی:',
      'اگه فقط یه جواب سریع می‌خوای، داخل bot بمون.',
      'اگه می‌خوای یه موضوع رو کامل یاد بگیری یا نمونه ببینی، برو سایت.',
      'اگه می‌خوای هر روز پست و quiz ببینی، برو channel.',
      'یعنی اول هدفت رو مشخص کن، بعد دکمه درست رو بزن.',
      '',
      '🎯 Real example:',
      '5 minutes before class? Tap Grammar Tips.',
      'After class, if you want the full lesson, open the website.',
    ].join('\n'),
    quiz: {
      question: 'Where should you go for full lessons and paid services?',
      options: ['Visit Website', 'Vocabulary', 'Contact Kay', 'Telegram Channel only'],
      correctIndex: 0,
      explanation: 'The website is where the full lessons, samples, and services live.',
    },
  },
  {
    title: '📅 Bot Guide: Best Weekly Study Routine',
    topic: 'bot-guide-weekly-study-routine',
    hashtags: ['#StudyRoutine', '#TelegramBot', '#LearnEnglish'],
    postBody: [
      '📅 Bot Guide: Best Weekly Study Routine',
      '',
      'The bot works best as a small daily habit, not a once-a-week panic move 👇',
      '',
      'Use it like warm-up, not like a full textbook.',
      '',
      '✅ Daily:',
      'Use the bot for one quick thing only: vocabulary, grammar, or idioms.',
      '',
      '✅ 2 or 3 times a week:',
      'Open the website and read one full lesson.',
      '',
      '✅ When you need more help:',
      'Use tutoring or writing feedback.',
      '',
      '🇮🇷 فارسی خودمونی:',
      'هر روز فقط ۵ دقیقه از bot استفاده کن.',
      'هفته‌ای دو سه بار هم برو سایت و یه درس کامل بخون.',
      'کم ولی منظم، خیلی بهتر از فشار یهویی جواب می‌ده.',
      'یعنی bot برای گرم موندنه، نه برای اینکه جای کل مطالعه رو بگیره.',
      '',
      '💡 Tip:',
      'Small and regular beats big and random.',
    ].join('\n'),
    quiz: {
      question: 'What is the best daily use of the bot?',
      options: [
        'One quick useful step',
        'Open every button every day',
        'Ignore the channel',
        'Only use it once a month',
      ],
      correctIndex: 0,
      explanation: 'The best routine is small, regular, and easy to continue.',
    },
  },
  {
    title: '⌨️ Bot Guide: What Should You Type?',
    topic: 'bot-guide-what-to-type',
    hashtags: ['#TelegramBot', '#EnglishPractice', '#StudySmart'],
    postBody: [
      '⌨️ Bot Guide: What Should You Type?',
      '',
      'If you do not want to use buttons, type one clean keyword. Not one long messy message 👇',
      '',
      'The bot handles short clear requests better than mixed requests.',
      '',
      '✅ Good examples:',
      'grammar',
      'idioms',
      '/help',
      '',
      '❌ Not helpful:',
      'one long unclear message',
      'sending five different things together',
      '',
      '🇮🇷 فارسی خودمونی:',
      'لازم نیست حتما دکمه بزنی.',
      'یه کلمه‌ی واضح بفرست، جواب بهتر می‌گیری.',
      'مثلا فقط بنویس grammar.',
      'نه اینکه همه‌چیز رو باهم بفرستی و انتظار جواب دقیق داشته باشی.',
      '',
      '🎯 Try this:',
      'Send: grammar',
    ].join('\n'),
    quiz: {
      question: 'Which message is the clearest for the bot?',
      options: ['grammar', 'hello maybe grammar vocab idioms all together', '???', 'everything'],
      correctIndex: 0,
      explanation: 'A short clear keyword is the easiest thing for the bot to handle well.',
    },
  },
  {
    title: '🧩 Bot Guide: Bot, Channel, or Website?',
    topic: 'bot-guide-bot-channel-website',
    hashtags: ['#TelegramBot', '#IELTSCorner', '#StudyHelp'],
    postBody: [
      '🧩 Bot Guide: Bot, Channel, or Website?',
      '',
      'Think of these as 3 different tools, not 3 copies of the same thing 👇',
      '',
      'A lot of confusion disappears when you give each one a job.',
      '',
      '🤖 Bot = quick help',
      '📣 Channel = daily posts and quiz polls',
      '🌐 Website = full lessons, tutoring, and writing feedback',
      '',
      '💡 Best system:',
      'Start with the bot.',
      'Stay warm with the channel.',
      'Go deep with the website.',
      '',
      '🇮🇷 فارسی خودمونی:',
      'bot برای کمک سریع خوبه.',
      'channel برای تمرین روزانه و quiz خوبه.',
      'سایت برای درس کامل، نمونه، و سرویس‌های اصلیه.',
      'پس اینا رقیب هم نیستن. هر کدوم کار خودشون رو دارن.',
      '',
      '🎯 Try this system for one week.',
    ].join('\n'),
    quiz: {
      question: 'Where should you go for tutoring or writing feedback?',
      options: ['Website', 'Only the quiz poll', 'Idioms button', 'Comments section'],
      correctIndex: 0,
      explanation: 'The website is the right place for full paid services and deeper support.',
    },
  },
];

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = stripWrappingQuotes(rawValue);
    }
  } catch {
    // optional
  }
}

async function loadEnvFiles() {
  const cwd = process.cwd();
  await loadEnvFile(path.join(cwd, '.env'));
  await loadEnvFile(path.join(cwd, '.env.local'));
}

function resolveChatId(explicitChatId, channelUrl) {
  const direct = explicitChatId?.trim();
  if (direct) return direct;

  const url = channelUrl?.trim();
  if (!url) return '';
  const normalized = url.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) return '';
  return slug.startsWith('@') ? slug : `@${slug}`;
}

function appendFooter(body) {
  const cleanBody = String(body ?? '').trim();
  if (!cleanBody) return SIGNATURE_BLOCK;
  if (cleanBody.includes('Kay\'s English Corner') || cleanBody.includes('Kay’s English Corner')) {
    return cleanBody;
  }
  return `${cleanBody}\n\n${SIGNATURE_BLOCK}`;
}

function buildPostMessage(guide) {
  const body = appendFooter(guide.postBody);
  const hashtags = Array.isArray(guide.hashtags) && guide.hashtags.length
    ? `\n\n${guide.hashtags.join(' ')}`
    : '';
  return `${body}${hashtags}`;
}

async function telegramRequest(botToken, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }

  return data.result;
}

function getWeekNumber(date = new Date()) {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const days = Math.floor((date - firstDay) / 86400000);
  return Math.ceil((days + firstDay.getUTCDay() + 1) / 7);
}

function selectGuide() {
  const weekNumber = getWeekNumber(new Date());
  const index = (weekNumber - 1) % BOT_GUIDES.length;
  return { weekNumber, guideIndex: index, guide: BOT_GUIDES[index] };
}

async function main() {
  await loadEnvFiles();

  const dryRun = process.argv.includes('--dry-run');
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL?.trim() ?? '';
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);

  if (!dryRun && !botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }

  if (!chatId) {
    throw new Error('Missing target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL)');
  }

  const { weekNumber, guideIndex, guide } = selectGuide();
  const messageText = buildPostMessage(guide);

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      weekNumber,
      guideIndex: guideIndex + 1,
      guide,
      messageText,
    }, null, 2));
    return;
  }

  const historyFilePath = resolveHistoryFilePath();
  const history = await loadPostHistory(historyFilePath);
  const topicDedupeDays = Math.max(7, Number.parseInt(process.env.TELEGRAM_BOT_GUIDE_DEDUPE_DAYS ?? '28', 10) || 28);
  const fingerprint = createContentFingerprint(messageText, { stripSignature: true });

  if (hasFingerprint(history, fingerprint)) {
    console.log('[skip] Weekly bot guide already exists in history.');
    return;
  }

  if (hasRecentTopic(history, guide.topic, { kind: 'bot-guide', maxAgeDays: topicDedupeDays })) {
    console.log(`[skip] Bot guide topic already posted in the last ${topicDedupeDays} days.`);
    return;
  }

  const claim = await claimPostOwnership({
    kind: 'bot-guide',
    fingerprint,
    topic: guide.topic,
  });

  if (!claim.claimed) {
    console.log('[skip] Another run already owns this weekly bot guide.');
    return;
  }

  try {
    const publicSlug = resolvePublicChannelSlug(channelUrl, chatId);
    const existingTexts = await fetchRecentChannelTexts(publicSlug, { stripSignature: true });
    const normalizedMessage = toCanonicalPostText(messageText, { stripSignature: true });

    if (existingTexts.includes(normalizedMessage)) {
      console.log('[skip] Matching weekly bot guide already appears in recent channel posts.');
      return;
    }

    console.log(`Posting weekly bot guide ${guideIndex + 1}/${BOT_GUIDES.length} for week ${weekNumber}`);

    const contentResult = await telegramRequest(botToken, 'sendMessage', {
      chat_id: chatId,
      text: messageText,
      disable_web_page_preview: true,
    });

    let quizMessageId = null;
    if (guide.quiz) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const pollResult = await telegramRequest(botToken, 'sendPoll', {
        chat_id: chatId,
        question: guide.quiz.question,
        options: guide.quiz.options,
        type: 'quiz',
        correct_option_id: guide.quiz.correctIndex,
        explanation: guide.quiz.explanation,
        is_anonymous: true,
      });
      quizMessageId = pollResult?.message_id ?? null;
    }

    rememberFingerprint(history, fingerprint, {
      kind: 'bot-guide',
      topic: guide.topic,
      title: guide.title,
      messageId: contentResult?.message_id ?? null,
      quizMessageIds: quizMessageId ? [quizMessageId] : [],
    });
    await savePostHistory(historyFilePath, history);

    console.log(`Posted weekly bot guide: ${guide.title}`);
  } finally {
    await releasePostOwnershipClaim(claim);
  }
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
