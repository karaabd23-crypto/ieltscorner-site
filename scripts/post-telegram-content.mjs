#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';

const TOPIC_BANK = [
  { type: 'vocab', level: 'B1', topic: 'Serendipity - finding good things by chance', lang: 'EN/FA' },
  { type: 'vocab', level: 'B1', topic: 'Ephemeral - lasting for a very short time', lang: 'EN/FA' },
  { type: 'vocab', level: 'B2', topic: 'Perspicacious - having keen judgment', lang: 'EN/FA' },
  { type: 'vocab', level: 'A2', topic: 'Nostalgic - sentimental longing for the past', lang: 'EN/FA' },
  { type: 'grammar', level: 'B1', topic: 'Used to vs Would - past habits and states', lang: 'EN/FA' },
  { type: 'grammar', level: 'A2', topic: 'Present Perfect vs Simple Past', lang: 'EN/FA' },
  { type: 'grammar', level: 'B2', topic: 'Mixed conditionals for nuanced situations', lang: 'EN/FA' },
  { type: 'grammar', level: 'A2', topic: 'Common preposition mistakes in English', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Hit the nail on the head - be exactly right', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Break a leg - good luck or best wishes', lang: 'EN/FA' },
  { type: 'idiom', level: 'A2', topic: 'Piece of cake - something very easy', lang: 'EN/FA' },
  { type: 'idiom', level: 'B2', topic: 'Put all your eggs in one basket - depend on one thing only', lang: 'EN/FA' },
  { type: 'expression', level: 'B1', topic: 'Better late than never - still good even if delayed', lang: 'EN/FA' },
  { type: 'expression', level: 'A2', topic: 'What a coincidence! - expressing surprise at timing', lang: 'EN/FA' },
  { type: 'expression', level: 'B2', topic: 'To be honest with you - introducing sincere opinion', lang: 'EN/FA' },
  { type: 'phrasal', level: 'B1', topic: 'Get by - manage with difficulty or limited resources', lang: 'EN/FA' },
];

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(line.slice(separatorIndex + 1));

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env files
  }
}

async function loadEnvFiles() {
  const root = process.cwd();
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.env.local'));
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    exam: 'AUTO',
    topic: '',
    templateFile: '',
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--exam') {
      options.exam = String(argv[index + 1] ?? 'auto').toUpperCase();
      index += 1;
    } else if (arg === '--topic') {
      options.topic = String(argv[index + 1] ?? '');
      index += 1;
    } else if (arg === '--template-file') {
      options.templateFile = String(argv[index + 1] ?? '');
      index += 1;
    } else if (arg === '--model') {
      options.model = String(argv[index + 1] ?? DEFAULT_MODEL);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const validExams = new Set(['AUTO', 'IELTS', 'CELPIP', 'ESL']);
  if (!validExams.has(options.exam)) {
    throw new Error('--exam must be one of: auto, IELTS, CELPIP, ESL');
  }

  return options;
}

function pickTopic(forcedTopic) {
  if (forcedTopic) {
    return {
      type: 'vocab',
      level: 'B1',
      topic: forcedTopic,
    };
  }

  const selected = TOPIC_BANK[Math.floor(Math.random() * TOPIC_BANK.length)] ?? TOPIC_BANK[0];
  return { ...selected };
}

async function readTemplate(templateFileArg) {
  const templateFromEnv = process.env.TELEGRAM_POST_TEMPLATE?.trim();
  if (templateFromEnv) {
    return templateFromEnv;
  }

  const envTemplateFile = process.env.TELEGRAM_TEMPLATE_FILE?.trim();
  const templateFile = templateFileArg || envTemplateFile;

  if (!templateFile) {
    return '';
  }

  try {
    const content = await readFile(templateFile, 'utf8');
    return content.trim();
  } catch {
    return '';
  }
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response.');
  }
  return text.slice(start, end + 1);
}

function fallbackContent({ type, level, topic, channelUrl }) {
  const tags = ['#VocabBuilder', '#GrammarTip', '#IdiomsEnglish', '#LearnEnglish'];
  const typeLabel = {
    vocab: '📚 Word of the Day',
    grammar: '✏️ Grammar Nugget',
    idiom: '🎭 Idiom of the Day',
    expression: '💬 Expression Tip',
    phrasal: '🔗 Phrasal Verb',
  }[type] || '📚 English Lesson';

  const body = [
    `${typeLabel}`,
    `Topic: ${topic}`,
    '',
    'English Explanation:',
    'Learn this natural English usage. Expand your active vocabulary and communication.',
    '',
    'شرح فارسی:',
    'یاد بگیرید چگونه این کلمه یا ابراز متداول را در مکالمه واقعی استفاده کنید.',
    '',
    '💡 Tip:',
    'Use this in 2-3 sentences today. Record yourself. Notice the difference in your clarity.',
    '',
    'Share your example in comments! 👉',    '',
    '🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!',    '',
    '🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!',
  ].join('\n');

  const cta = channelUrl
    ? `\n\n🌈✨ Kay's English Corner\nYour Gateway to English Success in Canada 🇨🇦\n🔗 Join us on Telegram\n${channelUrl}`
    : '';

  return {
    title: typeLabel,
    type,
    level,
    topic,
    postBody: `${body}${cta}`,
    hashtags: tags,
    quiz: {
      question: `Which scenario uses "${topic.split(' -')[0]}" correctly?`,
      options: [
        'Scenario A with correct usage',
        'Scenario B with natural application',
        'Scenario C with common mistake',
        'All of the above',
      ],
      correctIndex: 1,
      explanation: 'Native speakers use this word naturally in everyday contexts.',
    },
  };
}

async function generateContentWithOpenAI({ model, type, level, topic, template, channelUrl }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackContent({ type, level, topic, channelUrl });
  }

  const templateHint = template
    ? `Use this style template while keeping factual clarity:\n${template}`
    : 'Use concise, encouraging micro-lesson style for Telegram channels.';

  const prompt = `You are creating one Telegram post for English language learners.
Audience: Intermediate English learners (B1-B2 level).
Content Type: ${type} (vocabulary, grammar, idiom, expression, or phrasal verb)
Specific Topic: ${topic}
Level: ${level}
${templateHint}

Return STRICT JSON only:
{
  "title": string,
  "type": "${type}",
  "level": string,
  "topic": string,
  "postBody": string,
  "hashtags": string[],
  "quiz": {
    "question": string,
    "options": [string, string, string, string],
    "correctIndex": number,
    "explanation": string
  }
}

Requirements:
- postBody max 2200 characters, plain text, no markdown tables.
- Match this house style:
  1) Catchy title line with emoji for ${type}.
  2) English explanation + example usage + natural context.
  3) Persian/Farsi companion explanation.
  4) Tip on how to practice this TODAY.
  5) Call-to-action to share example in comments.
  6) Friendly branded footer for Kay's English Corner.
- Focus ONLY on vocabulary, grammar, idioms, expressions—NOT exam tips.
- Keep sentence structure simple and learner-friendly.
- Include one practical usage task the user can try immediately.
- quiz.question should feel like a usage scenario (fill-in-the-blank or best-choice).
- Hashtags: 3 to 6 tags for ${type}.
- quiz.correctIndex must be 0-3.
- quiz options must be distinct and plausible.
- Include this line near the end: "🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!"
${channelUrl ? `- Include this CTA naturally in postBody: ${channelUrl}` : ''}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 900,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const outputText = data?.choices?.[0]?.message?.content;
  if (!outputText || typeof outputText !== 'string') {
    throw new Error('OpenAI response did not include valid message content.');
  }

  const parsed = JSON.parse(extractJson(outputText));
  return parsed;
}

function normalizeContent(content, fallback) {
  const safe = content && typeof content === 'object' ? content : fallback;
  const quiz = safe.quiz && typeof safe.quiz === 'object' ? safe.quiz : fallback.quiz;

  const options = Array.isArray(quiz.options) ? quiz.options.slice(0, 4).map((item) => String(item)) : fallback.quiz.options;
  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  const hashtags = Array.isArray(safe.hashtags)
    ? safe.hashtags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6)
    : fallback.hashtags;

  return {
    title: String(safe.title ?? fallback.title),
    examFocus: String(safe.examFocus ?? fallback.examFocus),
    level: String(safe.level ?? fallback.level),
    topic: String(safe.topic ?? fallback.topic),
    postBody: String(safe.postBody ?? fallback.postBody).slice(0, 3500),
    hashtags: hashtags.length ? hashtags : fallback.hashtags,
    quiz: {
      question: String(quiz.question ?? fallback.quiz.question).slice(0, 290),
      options,
      correctIndex: Math.max(0, Math.min(3, Number(quiz.correctIndex ?? fallback.quiz.correctIndex))),
      explanation: String(quiz.explanation ?? fallback.quiz.explanation).slice(0, 180),
    },
  };
}

async function telegramRequest(method, payload, token) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }

  return data;
}

function buildPostMessage(content) {
  const hashLine = content.hashtags.length ? `\n\n${content.hashtags.join(' ')}` : '';
  return `${content.postBody}${hashLine}`;
}

function resolveChatId(explicitChatId, channelUrl) {
  const direct = explicitChatId?.trim();
  if (direct) {
    return direct;
  }

  const url = channelUrl?.trim();
  if (!url) {
    return '';
  }

  const normalized = url.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) {
    return '';
  }

  return slug.startsWith('@') ? slug : `@${slug}`;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);
  const pick = pickTopic(options.exam, options.topic);
  const template = await readTemplate(options.templateFile);
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL?.trim() ?? '';

  const fallback = fallbackContent({
    exam: pick.exam,
    level: pick.level,
    topic: pick.topic,
    channelUrl,
  });

  let generated;
  try {
    generated = await generateContentWithOpenAI({
      model: options.model,
      exam: pick.exam,
      level: pick.level,
      topic: pick.topic,
      template,
      channelUrl,
    });
  } catch (error) {
    console.warn(`[warn] Falling back to template content: ${error.message}`);
    generated = fallback;
  }

  const content = normalizeContent(generated, fallback);

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: 'dry-run', content }, null, 2));
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);

  if (!botToken || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and/or target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL).');
  }

  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text: buildPostMessage(content),
    disable_web_page_preview: true,
  }, botToken);

  await telegramRequest('sendPoll', {
    chat_id: chatId,
    question: content.quiz.question,
    options: content.quiz.options,
    type: 'quiz',
    correct_option_id: content.quiz.correctIndex,
    explanation: content.quiz.explanation,
    is_anonymous: true,
  }, botToken);

  console.log(`[ok] Posted content and quiz poll for topic: ${content.topic}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
