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
  '🌈✨ Kay\'s English Corner',
  'Your Gateway to English Success in Canada 🇨🇦',
  '🌐 Lessons + services: https://ieltscorner.ca',
  '🔗 Join us: https://t.me/kaysenglishcorner',
].join('\n');

const BOT_GUIDES = [
  {
    title: '🤖 Bot Guide: Start Here',
    topic: 'bot-guide-start-here',
    hashtags: ['#TelegramBot', '#LearnEnglish', '#StudyHelp'],
    postBody: [
      '🤖 Bot Guide: Start Here',
      '',
      'If you are new, this is the fastest way to use the bot well.',
      '',
      '👉 STEP 1',
      'Open @Ewithkpaybot',
      '',
      '👉 STEP 2',
      'Tap /start',
      '',
      '👉 STEP 3',
      'Use one clear keyword:',
      'vocab / grammar / idioms / contact',
      '',
      '💡 Why this works:',
      'Short clear commands get better answers.',
      '',
      '🇮🇷 فارسی کوتاه:',
      'اگه تازه اومدی، اول /start رو بزن.',
      'بعد یکی از اینا رو بفرست: vocab / grammar / idioms / contact',
      '',
      '🎯 Try it now:',
      'Open the bot and send: vocab',
    ].join('\n'),
    quiz: {
      question: 'What should a new user send first?',
      options: ['/start', 'essay', 'score', 'channel'],
      correctIndex: 0,
      explanation: 'Start with /start so the bot shows the main options.',
    },
  },
  {
    title: '🧭 Bot Guide: Which Button Should You Use?',
    topic: 'bot-guide-buttons-and-links',
    hashtags: ['#TelegramBot', '#EnglishTips', '#DailyStudy'],
    postBody: [
      '🧭 Bot Guide: Which Button Should You Use?',
      '',
      'The bot works best when you use the right tool for the right job.',
      '',
      '📚 Vocabulary = one quick word lesson',
      '🎯 Grammar Tips = one short grammar point',
      '💡 Idioms = a natural expression',
      '✉️ Contact Kay = direct contact info',
      '🌐 Visit Website = full lessons and deeper study',
      '📣 Telegram Channel = daily posts and polls',
      '',
      '💡 Easy rule:',
      'Quick help? Stay inside the bot.',
      'Full lesson? Go to the website.',
      '',
      '🇮🇷 فارسی کوتاه:',
      'کمک سریع می‌خوای؟ vocab یا grammar یا idioms.',
      'توضیح کامل می‌خوای؟ برو سایت.',
      '',
      '🎯 Best habit:',
      'اول نیازت رو مشخص کن، بعد همون دکمه رو بزن.',
    ].join('\n'),
    quiz: {
      question: 'Where should you go for full lessons?',
      options: ['Visit Website', 'Idioms', 'Contact Kay', 'YouTube only'],
      correctIndex: 0,
      explanation: 'The website is the right place for full lessons and deeper study.',
    },
  },
  {
    title: '📅 Bot Guide: Best Weekly Study Routine',
    topic: 'bot-guide-weekly-study-routine',
    hashtags: ['#StudyRoutine', '#TelegramBot', '#LearnEnglish'],
    postBody: [
      '📅 Bot Guide: Best Weekly Study Routine',
      '',
      'Here is a simple way to use the bot without getting overwhelmed:',
      '',
      '✅ Daily:',
      'Use the bot for one quick thing: vocab, grammar, or idioms.',
      '',
      '✅ Two or three times a week:',
      'Open the website and read one full lesson.',
      '',
      '✅ When you need more help:',
      'Use tutoring or writing feedback.',
      '',
      '🇮🇷 فارسی کوتاه:',
      'هر روز یه کمک کوتاه از bot بگیر.',
      'هفته‌ای دو سه بار هم یه درس کامل از سایت بخون.',
      '',
      '💡 Tip:',
      'همه‌چیز رو توی یک روز نریز. کم ولی منظم بهتره.',
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
      'If you do not want to tap buttons, just type one clear keyword.',
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
      '🇮🇷 فارسی کوتاه:',
      'لازم نیست حتما دکمه بزنی.',
      'یه کلمه‌ی واضح بفرست، جواب بهتر می‌گیری.',
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
      'Each one has a different job:',
      '',
      '🤖 Bot = quick help',
      '📣 Channel = daily posts and quiz polls',
      '🌐 Website = full lessons, tutoring, and writing feedback',
      '',
      '💡 Best system:',
      '1. Bot for a quick start',
      '2. Channel for daily practice',
      '3. Website for serious study',
      '',
      '🇮🇷 فارسی کوتاه:',
      'bot برای کمک سریع خوبه.',
      'channel برای پست و quiz خوبه.',
      'سایت برای درس کامل و کلاس بهتره.',
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
