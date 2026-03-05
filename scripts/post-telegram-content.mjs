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
  // Curated quality lessons - rotate through these instead of generic template
  const qualityLessons = [
    {
      title: '✏️ Grammar: Present Perfect vs Simple Past',
      type: 'grammar',
      level: 'B1',
      topic: 'Present Perfect vs Simple Past',
      postBody: `✏️ GRAMMAR NUGGET: Present Perfect vs Simple Past

❌ WRONG: "I have been to Paris last year" (The time is finished!)
✅ CORRECT: "I went to Paris last year" (Finished time = Simple Past)

The KEY rule:
• Use SIMPLE PAST with specific finished times (last year, yesterday, in 2020)
• Use PRESENT PERFECT with unfinished time periods (ever, never, recently)

Examples:
✓ "I've visited Paris" = Anytime in my life (no specific time)
✓ "I visited Paris last month" = Finished time period
✓ "She's lived here for 5 years" = Started in past, still now
✓ "She lived here in 2020" = That time is over now

🇮🇷

❌ غلط: "I have been to Paris last year"
✅ درست: "I went to Paris last year"

قانون اصلی:
• وقتی وقت مشخص و پایان یافته (سال گذشته، دیروز) از Simple Past استفاده کنید
• وقتی زمان نامشخص است (تا حالا، هرگز) از Present Perfect استفاده کنید

💡 TIP / نکته:
Pay attention to TIME words—they tell you which tense to use!
به کلمات زمان توجه کنید—آنها برای شما تنس درست را نشان می‌دهند!`,
      hashtags: ['#GrammarTip', '#PresentPerfect', '#EnglishGrammar', '#LearnEnglish'],
      quiz: {
        question: '❓ Which is CORRECT? "I ___ to Japan last summer."',
        options: [
          'have gone',
          'went',
          'am going',
        ],
        correctIndex: 1,
        explanation: '"Last summer" is a finished time → Simple Past "went" is correct!',
      },
    },
    {
      title: '📚 Vocabulary: "Ephemeral"',
      type: 'vocab',
      level: 'B2',
      topic: 'Ephemeral - lasting for a very short time',
      postBody: `📚 WORD OF THE DAY: "Ephemeral"

Definition: Something that lasts for a very short time or is temporary.

Pronunciation: eh-FEM-er-ul

This word is PERFECT for describing:
• Fleeting moments in life
• Short-lived beauty (like cherry blossoms)
• Temporary trends or fashions
• Memories that fade quickly

Real Examples (Native Speakers Use It):
✓ "The beauty of cherry blossoms is ephemeral—they only bloom for two weeks."
✓ "Social media fame is often ephemeral; people forget about trends quickly."
✓ "That moment of happiness was ephemeral but unforgettable."

Why Learn This?
Sounds sophisticated • Perfect for TOEFL/IELTS writing • Impresses native speakers

🇮🇷

تعریف: چیزی که برای مدت بسیار کوتاهی ماندگار است یا موقتی است.

این کلمه برای توصیف مناسب است:
• لحظات کوتاه ماندگار در زندگی
• زیبایی کوتاه مدت (مانند گل های گیلاس)
• روندهای موقتی
• خاطرات که به سرعت محو می‌شوند

💡 TIP / نکته:
"Ephemeral" gives your English a sophisticated, poetic touch!
از این کلمه برای نشان دادن زیبایی و ظرافت سخن استفاده کنید!`,
      hashtags: ['#VocabBuilder', '#WordOfTheDay', '#LearnEnglish', '#Vocabulary'],
      quiz: {
        question: '❓ Which could be described as "ephemeral"?',
        options: [
          'A permanent tattoo',
          'A beautiful sunset 🌅',
          'The Rocky Mountains',
        ],
        correctIndex: 1,
        explanation: 'A sunset is beautiful but lasts only a short time—that\'s ephemeral!',
      },
    },
    {
      title: '💬 Expression: "Better Late Than Never"',
      type: 'expression',
      level: 'A2',
      topic: 'Better late than never - still good even if delayed',
      postBody: `💬 EXPRESSION OF THE DAY: "Better Late Than Never"

Meaning: It's still good to do something even if you do it late or after expected time. Don't give up!

When Native Speakers Use It:
✓ "I haven't exercised in months. Better late than never—I'm starting today!"
✓ "You're arriving 2 hours late, but better late than never!"
✓ "I finally started learning English at age 40. Better late than never!"

Perfect For:
• Encouraging someone who feels behind
• Apologizing for delays but still showing up
• Motivating yourself to start something

What It DOESN'T Mean:
✗ Don't use it when someone apologizes for being extremely late to something important

🇮🇷

💡 TIP / نکته:
This phrase is VERY encouraging and positive!
از این برای تشویق کردن دوستان خود استفاده کنید!`,
      hashtags: ['#Expression', '#SpeakingTip', '#DailyEnglish', '#LearnEnglish'],
      quiz: {
        question: '❓ When would you say "Better late than never"?',
        options: [
          'When someone misses a deadline entirely',
          'When someone finally starts trying, even if delayed',
          'When someone cancels plans',
        ],
        correctIndex: 1,
        explanation: 'It\'s an encouraging phrase for when people finally take action, even if it\'s delayed!',
      },
    },
  ];

  // Pick a random lesson from the curated list
  const lesson = qualityLessons[Math.floor(Math.random() * qualityLessons.length)];

  const cta = channelUrl
    ? `\n\n🌈✨ Kay's English Corner\nYour Gateway to English Success in Canada 🇨🇦\n🔗 Join us on Telegram\n${channelUrl}`
    : '';

  return {
    title: lesson.title,
    type: lesson.type,
    level: lesson.level,
    topic: lesson.topic,
    postBody: `${lesson.postBody}${cta}`,
    hashtags: lesson.hashtags,
    quiz: lesson.quiz,
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
