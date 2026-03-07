#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest';
const DEFAULT_HISTORY_FILE = '.cache/telegram-post-history.json';
const HISTORY_MAX_ITEMS = 5000;

const TOPIC_BANK = [
  { type: 'vocab', level: 'B1', topic: 'Reliable - someone or something you can trust', lang: 'EN/FA' },
  { type: 'vocab', level: 'B1', topic: 'Convenient - easy to use or good for your situation', lang: 'EN/FA' },
  { type: 'vocab', level: 'B1', topic: 'Afford - have enough money to buy something', lang: 'EN/FA' },
  { type: 'vocab', level: 'A2', topic: 'Nervous - feeling worried before something happens', lang: 'EN/FA' },
  { type: 'vocab', level: 'B1', topic: 'Improve - make something better', lang: 'EN/FA' },
  { type: 'grammar', level: 'B1', topic: 'Used to vs Would - past habits and states', lang: 'EN/FA' },
  { type: 'grammar', level: 'A2', topic: 'Present Perfect vs Simple Past', lang: 'EN/FA' },
  { type: 'grammar', level: 'B1', topic: 'First and Second Conditionals - real and unreal situations', lang: 'EN/FA' },
  { type: 'grammar', level: 'A2', topic: 'Common preposition mistakes in English', lang: 'EN/FA' },
  { type: 'grammar', level: 'B1', topic: 'Reported speech - telling someone what another person said', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Hit the nail on the head - be exactly right', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Break a leg - good luck or best wishes', lang: 'EN/FA' },
  { type: 'idiom', level: 'A2', topic: 'Piece of cake - something very easy', lang: 'EN/FA' },
  { type: 'idiom', level: 'B1', topic: 'Under the weather - feeling a little sick', lang: 'EN/FA' },
  { type: 'expression', level: 'B1', topic: 'Better late than never - still good even if delayed', lang: 'EN/FA' },
  { type: 'expression', level: 'A2', topic: 'What a coincidence! - expressing surprise at timing', lang: 'EN/FA' },
  { type: 'expression', level: 'B1', topic: 'It depends - the answer changes based on the situation', lang: 'EN/FA' },
  { type: 'phrasal', level: 'B1', topic: 'Get by - manage with difficulty or limited resources', lang: 'EN/FA' },
  { type: 'phrasal', level: 'B1', topic: 'Look forward to - be excited about something in the future', lang: 'EN/FA' },
  { type: 'phrasal', level: 'A2', topic: 'Turn off / Turn on - control a device or light', lang: 'EN/FA' },
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

  const selected = TOPIC_BANK[pickDeterministicIndex(TOPIC_BANK.length, 11)] ?? TOPIC_BANK[0];
  return { ...selected };
}

function pickDeterministicIndex(length, salt = 0) {
  if (!Number.isInteger(length) || length <= 0) {
    return 0;
  }

  const runNumber = Number.parseInt(process.env.GITHUB_RUN_NUMBER ?? '', 10);
  const runAttempt = Number.parseInt(process.env.GITHUB_RUN_ATTEMPT ?? '1', 10);

  if (Number.isFinite(runNumber) && runNumber > 0) {
    const attempt = Number.isFinite(runAttempt) && runAttempt > 0 ? runAttempt : 1;
    const seed = (runNumber * 97) + (attempt * 13) + salt;
    return seed % length;
  }

  return Math.floor(Math.random() * length);
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
  // 7 B1-level format templates rotating through diverse styles
  // All match Kay's English Corner enthusiastic voice

  // FORMAT 1: Mini Story (narrative-based)
  const storyFormats = [
    {
      title: '📖 Mini Story: The Job Interview Surprise',
      format: 'story',
      level: 'B1',
      topic: 'Story about nervousness and success',
      postBody: `📖 Mini Story: The Job Interview Surprise

Sarah was SO nervous about her job interview! 😰

She left her house 2 hours early (way too early! 😅) and arrived at the office building. But when she checked the address again... OH NO! 😱 Wrong building!

She RAN to the correct address! Her heart was racing! 🏃‍♀️💨

When she arrived, sweating and out of breath, the interviewer smiled and said: "Don't worry! You're actually 15 minutes EARLY!" 😊

Sarah got the job! 🎉

🇮🇷 سارا خیلی نگران مصاحبه کاریش بود! ۲ ساعت زودتر رفت ولی به آدرس اشتباه رفته بود! دوید و به موقع رسید! کار رو گرفت! 💪

💡 What We Learn:
✅ "Way too early" = خیلی خیلی زود 
✅ "Out of breath" = نفس نفس زدن (من از نفس افتادم)
✅ "Don't worry" = نگران نباش

🎯 YOUR TURN: Have YOU ever gone to the wrong place? Tell us! 👇`,
      hashtags: ['#EnglishStory', '#LearnEnglish', '#B1English', '#RealLife'],
      quizzes: [
        {
          question: '❓ What does "out of breath" mean?',
          options: ['Very angry', 'Breathing hard after running', 'Holding your breath', 'Speaking quietly'],
          correctIndex: 1,
          explanation: '"Out of breath" = نفس نفس زدن! After running or exercise! 🏃‍♀️💨',
        },
      ],
    },
  ];

  // FORMAT 2: Visual Comparison (side-by-side)
  const comparisonFormats = [
    {
      title: '⚡ Quick Fix: Stop Saying "Very"!',
      format: 'comparison',
      level: 'B1',
      topic: 'Power words instead of very',
      postBody: `⚡ Quick Fix: Stop Saying "Very"!

Native speakers DON'T say "very" all the time! 😅
They use POWER WORDS instead! 💪

Here's the upgrade! ⬆️

❌ Very tired → ✅ EXHAUSTED 😴
❌ Very hungry → ✅ STARVING 🍕
❌ Very cold → ✅ FREEZING 🥶
❌ Very hot → ✅ BOILING 🔥
❌ Very funny → ✅ HILARIOUS 😂
❌ Very scared → ✅ TERRIFIED 😱

🇮🇷 فارسی:
❌ خیلی خسته → ✅ خسته مرده (exhausted)
❌ خیلی گرسنه → ✅ دارم از گرسنگی میمیرم (starving)
❌ خیلی سرد → ✅ یخ زده (freezing)

💡 Pro Tip: These words are MORE expressive and make you sound SO much more natural! 🌟

🎯 Try it NOW: Make a sentence with ONE power word! 👇`,
      hashtags: ['#VocabularyTips', '#PowerWords', '#B1English', '#StopSayingVery'],
      quizzes: [
        {
          question: '❓ "I\'m not just tired, I\'m _____!" (Super tired)',
          options: ['very tired', 'exhausted', 'sleeping', 'boring'],
          correctIndex: 1,
          explanation: '"Exhausted" = خسته مرده! Much stronger than "very tired!" 💪',
        },
      ],
    },
  ];

  // FORMAT 3: Ultra-Short Tip
  const quickTipFormats = [
    {
      title: '💬 Say It Right: "I\'m good" vs "I\'m well"',
      format: 'quick-tip',
      level: 'B1',
      topic: 'Common greeting responses',
      postBody: `💬 Say It Right: "I'm good" vs "I'm well"

Someone asks: "How are you?" 👋

Which is correct? BOTH! But different! 😊

✅ "I'm good!" = I'm feeling fine/happy (CASUAL, friendly) 😄
✅ "I'm well!" = I'm healthy (FORMAL, polite) 🎩

🇮🇷 فارسی:
"I'm good" = حالم خوبه (خودمونی) 😊
"I'm well" = سلامتم (رسمی) 👔

💡 99% of the time → "I'm good!" is perfect! ✨

🎯 Next time someone asks "How are you?" → try "I'm good, thanks!" 👇`,
      hashtags: ['#QuickTip', '#B1English', '#SayItRight', '#DailyEnglish'],
      quizzes: [],
    },
  ];

  // FORMAT 4: Common Mistake Deep Dive
  const mistakeFocusFormats = [
    {
      title: '🔍 One Mistake Everyone Makes: "Bored" vs "Boring"',
      format: 'mistake-focus',
      level: 'B1',
      topic: '-ed vs -ing adjectives',
      postBody: `🔍 One Mistake Everyone Makes: "Bored" vs "Boring"

This trips up EVERYONE! Even advanced students! 😅

❌ "The movie was bored." ← WRONG! ✗
✅ "The movie was boring." ← RIGHT! ✓

❌ "I was boring at the party." ← WRONG! ✗
✅ "I was bored at the party." ← RIGHT! ✓

📌 THE RULE (memorize this!):

🔹 BORING = the thing that CAUSES boredom (it makes YOU bored!)
→ The movie is boring. (فیلم کسل کننده است)

🔹 BORED = YOU feel boredom (you ARE experiencing it!)
→ I am bored. (من خسته شدم / حوصله‌ام سر رفت)

🇮🇷 به فارسی:
Boring = چیزی که کسل کننده است (فیلم، کتاب، درس)
Bored = تو احساس کسلی میکنی

✨ More examples:
✅ "This book is interesting!" (کتاب جالبه)
✅ "I am interested in science!" (من به علم علاقه دارم)

✅ "That lesson was confusing!" (درس گیج کننده بود)
✅ "I was confused!" (من گیج شدم)

💡 Remember: -ING describes the THING, -ED describes YOUR FEELING! 🎯

🎯 YOUR TURN: Make a sentence with "bored" or "boring"! 👇`,
      hashtags: ['#CommonMistakes', '#BoredVsBoring', '#B1Grammar', '#EnglishGrammar'],
      quizzes: [
        {
          question: '❓ "That class was so _____. I almost fell asleep!" 😴',
          options: ['bored', 'boring', 'bore', 'to bore'],
          correctIndex: 1,
          explanation: 'The CLASS causes boredom → "boring"! YOU feel bored! 💤',
        },
      ],
    },
  ];

  // FORMAT 5: Idiom with Story/Origin
  const idiomOriginFormats = [
    {
      title: '🎭 Idiom Story: "Piece of cake!"',
      format: 'idiom-origin',
      level: 'B1',
      topic: 'Idiom meaning very easy',
      postBody: `🎭 Idiom Story: "Piece of cake!" 🍰

"That test was a piece of cake!" 

Wait... what?! 🤔 A test is a CAKE?! 😂

Nope! "Piece of cake" = SUPER EASY! ✨

🎂 The Story Behind It:
In the 1870s in America, there were "cake walk" competitions! 🚶‍♀️ The couple who walked the most gracefully won a CAKE as a prize! 🏆

It was SO easy (just walk nicely!) that people started saying "That's a piece of cake!" = That's SO simple! 😄

✍️ Real Examples:
✅ "The IELTS speaking test? Piece of cake!" 🍰
✅ "Don't worry about driving in Canada — it's a piece of cake!" 🚗
✅ "Cooking rice? Piece of cake!" 🍚

🇮🇷 شرح فارسی:
"Piece of cake" یعنی خیلی آسون! مث آب خوردن! 🍰
✅ "نگران نباش، این تست خیلی آسونه!" = "Don't worry, this test is a piece of cake!"
✅ "رانندگی تو کانادا؟ آسونه!" = "Driving in Canada? Piece of cake!"

💡 Similar phrases:
• "It's easy as pie!" 🥧
• "It's a walk in the park!" 🌳
• "It's a breeze!" 💨

🎯 What's something that's a "piece of cake" for YOU? Share! 👇`,
      hashtags: ['#EnglishIdioms', '#PieceOfCake', '#B1English', '#IdiomStory'],
      quizzes: [
        {
          question: '❓ "Don\'t worry, this exam is a piece of ___!"',
          options: ['bread', 'cake', 'candy', 'cookie'],
          correctIndex: 1,
          explanation: '"Piece of CAKE" = super easy! خیلی آسون! 🍰✨',
        },
      ],
    },
  ];

  // FORMAT 6: Canadian Context / Real-Life
  const culturalPracticalFormats = [
    {
      title: '🇨🇦 Real Canada: What to Say at Tim Hortons',
      format: 'cultural-practical',
      level: 'B1',
      topic: 'Ordering coffee in Canada',
      postBody: `🇨🇦 Real Canada: What to Say at Tim Hortons ☕

You walk into Tim Hortons (Canada's #1 coffee shop!) and... freeze! 😅 What do you SAY?!

Don't panic! Here's EXACTLY what to say! 💪

👉 STEP 1: The barista says "Hi! What can I get for you?"

YOU say: "Can I have a _____, please?" ✨
(medium coffee, large latte, small hot chocolate, etc.)

👉 STEP 2: They ask: "For here or to go?"

• "For here" = eat/drink inside 🏪
• "To go" = take it with you 📦

YOU say: "To go, please!" 

👉 STEP 3: They tell you the price: "That'll be $3.50"

YOU say: "Here you go!" 💳 (when giving money/card)

They say: "Thank you! Have a great day!" ☀️

YOU say: "You too!" 😊

✅ DONE! 🎉

🇮🇷 به فارسی:
"Can I have..." = میتونم ... داشته باشم؟
"For here or to go?" = اینجا میخورید یا میبرید؟
"Here you go" = بفرمایید (وقتی پول میدی)

💡 BONUS Canadian Phrase:
"Double-double" = coffee with 2 creams + 2 sugars! 🇨🇦☕
Super common! Everyone knows it!

🎯 Next time you order coffee, use these phrases! 💪👇`,
      hashtags: ['#CanadianEnglish', '#TimHortons', '#B1Speaking', '#RealCanada'],
      quizzes: [
        {
          question: '❓ What does "for here or to go?" mean?',
          options: ['Hot or cold?', 'Eat inside or take with you?', 'Large or small?', 'With sugar or no sugar?'],
          correctIndex: 1,
          explanation: '"For here" = inside! "To go" = take it! 📦☕',
        },
      ],
    },
  ];

  // FORMAT 7: Pronunciation Challenge
  const pronunciationFormats = [
    {
      title: '🔊 Pronunciation Challenge: "Literally"',
      format: 'pronunciation',
      level: 'B1',
      topic: 'How native speakers say literally',
      postBody: `🔊 Pronunciation Challenge: "Literally" 🤯

How do YOU say "literally"? 🤔

Most people say: LIT-er-AL-ly (4 syllables) ❌
Native speakers say: LIT-rally (2 syllables!) ✅

Wait... WHAT?! Only 2 syllables?! 😱 YES! 

We skip the "er-al" sounds! It becomes: "LIT-r'lly" 🎯

Try it 5 times FAST:
"Literally, literally, literally, literally, literally!" 🗣️💨

✍️ Real Examples:
✅ "I <b>literally</b> ran to the bus stop!" 🏃‍♀️
→ LIT-rally ran!

✅ "This is <b>literally</b> the best coffee ever!" ☕
→ LIT-rally the best!

🇮🇷 به فارسی:
Literally یعنی واقعاً، مستقیماً (تأکید روی حقیقت)
ولی تلفظش فقط ۲ بخشه: "لیت-رُلی" 🗣️

⚠️ Common mistake:
Learners say: "LIT-er-AL-ly" (too long! Sounds unnatural! 😅)
Natives say: "LIT-r'lly" (fast, smooth! ✨)

💡 Pro Tip: Say it FAST and let your mouth skip the middle part! Your tongue will learn the shortcut! 💪

🎯 Say it OUT LOUD right now: "I literally can't believe it!" Try 3 times! 👇`,
      hashtags: ['#Pronunciation', '#Literally', '#B1English', '#SayItRight'],
      quizzes: [
        {
          question: '❓ How many syllables do native speakers use for "literally"?',
          options: ['4 syllables', '3 syllables', '2 syllables', '1 syllable'],
          correctIndex: 2,
          explanation: 'Only 2 syllables! "LIT-r\'lly" — we skip the middle! 🗣️✨',
        },
      ],
    },
  ];

  // Combine all 7 format types
  const allFormats = [
    ...storyFormats,
    ...comparisonFormats,
    ...quickTipFormats,
    ...mistakeFocusFormats,
    ...idiomOriginFormats,
    ...culturalPracticalFormats,
    ...pronunciationFormats,
  ];

  // Rotate formats per workflow run to avoid repeated identical posts
  const selectedLesson = allFormats[pickDeterministicIndex(allFormats.length, 37)];

  const cta = channelUrl
    ? `\n\n🌈✨ Kay's English Corner\nYour Gateway to English Success in Canada 🇨🇦\n🔗 Join us on Telegram\n${channelUrl}`
    : '';

  return {
    title: selectedLesson.title,
    format: selectedLesson.format,
    level: selectedLesson.level,
    topic: selectedLesson.topic,
    postBody: `${selectedLesson.postBody}${cta}`,
    hashtags: selectedLesson.hashtags,
    quizzes: selectedLesson.quizzes || [selectedLesson.quiz],
  };
}
function buildB1Prompt({ type, level, topic, templateHint, channelUrl }) {
  return `You are Kay, an enthusiastic and warm English teacher creating a Telegram post for your channel "Kay's English Corner."
Your audience: Farsi-speaking English learners (mostly in Canada), level A2-B1.

Content Type: ${type}
Specific Topic: ${topic}
Level: ${level}
${templateHint}

YOUR VOICE AND STYLE (this is critical — match this exactly):
- You are EXCITED to teach. You use lots of exclamation marks!
- You scatter emojis THROUGHOUT the text (not just in headers). Every 2-3 lines should have at least one emoji.
- You use ALL CAPS for key words and emphasis: "This is SO important!", "Here's the SECRET:"
- You build up excitement before revealing the answer: "Here's the thing that trips everyone up... 😅", "But don't worry — the rule is actually SO simple! 💡"
- You talk directly to the reader: "You know that feeling when...", "Have you ever noticed..."
- You are warm and encouraging, like a friend helping a friend. Never formal or academic.
- Keep explanations at A2 level even if content is B1 — use the simplest words possible.

FARSI SECTIONS:
- Include a 🇮🇷 section with Farsi explanation
- Translate at least 2 full example sentences into Farsi (not just the word definition)
- Write Farsi naturally, the way people actually talk

STRUCTURE:
1) Catchy emoji-rich title for ${type}
2) Hook that builds excitement ("This one confuses SO many students! 😅")
3) Clear explanation with ❌ WRONG / ✅ RIGHT examples from daily life
4) 🇮🇷 Farsi companion section with translated examples
5) 💡 Practical tip or "Pro Tip" they can use TODAY
6) 🎯 Call-to-action: ask them to try using it and share in comments
7) Footer: "🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!"

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

Rules:
- postBody max 2200 characters, plain text, no markdown tables.
- Focus ONLY on vocabulary, grammar, idioms, expressions — NOT exam tips.
- quiz: simple fill-in-the-blank or best-choice from a real-life scenario.
- quiz options: clear, simple English. No trick answers.
- Hashtags: 3 to 6, e.g. #LearnEnglish #B1English #DailyEnglish
- quiz.correctIndex must be 0-3.
- NEVER use academic words like: paradigm, methodology, furthermore, consequently, albeit, whereas, circumlocution, epistemic.
${channelUrl ? `- Include this channel link naturally near the end: ${channelUrl}` : ''}`;
}

async function generateContentWithOpenAI({ model, type, level, topic, template, channelUrl }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const templateHint = template
    ? `Use this style template while keeping factual clarity:\n${template}`
    : 'Use concise, encouraging micro-lesson style for Telegram channels.';

  const prompt = buildB1Prompt({ type, level, topic, templateHint, channelUrl });

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

async function generateContentWithAnthropic({ model, type, level, topic, template, channelUrl }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  const templateHint = template
    ? `Use this style template while keeping factual clarity:\n${template}`
    : 'Use concise, encouraging micro-lesson style for Telegram channels.';

  const prompt = buildB1Prompt({ type, level, topic, templateHint, channelUrl });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 1200,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const outputText = Array.isArray(data?.content)
    ? data.content.filter((item) => item?.type === 'text').map((item) => item.text).join('\n')
    : '';

  if (!outputText || typeof outputText !== 'string') {
    throw new Error('Anthropic response did not include valid text content.');
  }

  const parsed = JSON.parse(extractJson(outputText));
  return parsed;
}

function normalizeContent(content, fallback) {
  const safe = content && typeof content === 'object' ? content : fallback;
  
  // Handle both old single quiz and new quizzes array
  let quizzes = [];
  if (Array.isArray(safe.quizzes) && safe.quizzes.length > 0) {
    quizzes = safe.quizzes;
  } else if (safe.quiz) {
    quizzes = [safe.quiz];
  } else if (Array.isArray(fallback.quizzes) && fallback.quizzes.length > 0) {
    quizzes = fallback.quizzes;
  } else {
    quizzes = [fallback.quiz];
  }

  // Normalize quiz objects
  const normalizedQuizzes = quizzes.slice(0, 3).map((quiz) => {
    const options = Array.isArray(quiz.options) ? quiz.options.slice(0, 4).map((item) => String(item)) : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    return {
      question: String(quiz.question || '').slice(0, 290),
      options: options.length >= 3 ? options.slice(0, 4) : [...options, ...Array(4 - options.length).fill('').map((_, i) => `Option ${options.length + i + 1}`)],
      correctIndex: Math.max(0, Math.min(3, Number(quiz.correctIndex ?? 0))),
      explanation: String(quiz.explanation || '').slice(0, 180),
    };
  });

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
    quizzes: normalizedQuizzes,
    quiz: normalizedQuizzes[0], // Keep for backwards compatibility
  };
}

function htmlToPlainText(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function normalizeForDedupe(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createContentFingerprint(text) {
  const normalized = normalizeForDedupe(text);
  return createHash('sha256').update(normalized).digest('hex');
}

function resolveHistoryFilePath() {
  const configured = process.env.TELEGRAM_HISTORY_FILE?.trim();
  if (!configured) {
    return path.join(process.cwd(), DEFAULT_HISTORY_FILE);
  }

  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

async function loadPostHistory(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch {
    // ignore missing/invalid history file
  }

  return { items: [] };
}

function hasFingerprint(history, fingerprint) {
  return history.items.some((item) => item?.fingerprint === fingerprint);
}

function rememberFingerprint(history, fingerprint, meta = {}) {
  const next = {
    fingerprint,
    kind: 'content',
    topic: String(meta.topic ?? ''),
    createdAt: new Date().toISOString(),
  };

  history.items.push(next);
  if (history.items.length > HISTORY_MAX_ITEMS) {
    history.items = history.items.slice(history.items.length - HISTORY_MAX_ITEMS);
  }
}

async function savePostHistory(filePath, history) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
}

function resolvePublicChannelSlug(channelUrl, chatId) {
  const fromUrl = String(channelUrl ?? '').trim();
  if (fromUrl) {
    const normalized = fromUrl
      .replace(/^https?:\/\//i, '')
      .replace(/^t\.me\//i, '')
      .replace(/^s\//i, '');
    const slug = normalized.split(/[/?#]/)[0]?.trim();
    if (slug && !slug.startsWith('+')) {
      return slug.replace(/^@/, '');
    }
  }

  const fromChat = String(chatId ?? '').trim();
  if (fromChat.startsWith('@')) {
    return fromChat.slice(1);
  }

  return '';
}

async function fetchRecentChannelTexts(slug) {
  if (!slug) {
    return [];
  }

  try {
    const response = await fetch(`https://t.me/s/${slug}`);
    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const blocks = [...html.matchAll(/<div class="tgme_widget_message_text[\s\S]*?>([\s\S]*?)<\/div>/g)];
    return blocks
      .map((match) => normalizeForDedupe(htmlToPlainText(match[1] ?? '')))
      .filter(Boolean);
  } catch {
    return [];
  }
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
  const pick = pickTopic(options.topic);
  const template = await readTemplate(options.templateFile);
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL?.trim() ?? '';

  const fallback = fallbackContent({
    exam: pick.exam,
    level: pick.level,
    topic: pick.topic,
    channelUrl,
  });

  let generated;
  let generationError = '';

  if (process.env.OPENAI_API_KEY) {
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
      generationError = error.message;
      console.warn(`[warn] OpenAI generation failed: ${error.message}`);
    }
  }

  if (!generated && process.env.ANTHROPIC_API_KEY) {
    try {
      generated = await generateContentWithAnthropic({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
        exam: pick.exam,
        level: pick.level,
        topic: pick.topic,
        template,
        channelUrl,
      });
      console.log('[ok] Generated content using Anthropic fallback');
    } catch (error) {
      generationError = generationError ? `${generationError} | ${error.message}` : error.message;
      console.warn(`[warn] Anthropic generation failed: ${error.message}`);
    }
  }

  if (!generated) {
    if (generationError) {
      console.warn(`[warn] Falling back to template content: ${generationError}`);
    }
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

  const messageText = buildPostMessage(content);
  const historyFilePath = resolveHistoryFilePath();
  const history = await loadPostHistory(historyFilePath);
  const messageFingerprint = createContentFingerprint(messageText);
  console.log(`[dedup] Message fingerprint: ${messageFingerprint.slice(0, 12)}... | History size: ${history.items?.length ?? 0} items`);
  if (hasFingerprint(history, messageFingerprint)) {
    console.log('[skip] Duplicate content found in persistent history. Skipping publish.');
    return;
  }
  console.log('[post] Message is unique. Proceeding with post.');

  const publicSlug = resolvePublicChannelSlug(channelUrl, chatId);
  const existingTexts = await fetchRecentChannelTexts(publicSlug);
  const normalizedMessage = normalizeForDedupe(messageText);
  if (existingTexts.includes(normalizedMessage)) {
    console.log('[skip] Duplicate content detected in recent channel posts. Skipping publish.');
    return;
  }
  console.log('[post] Channel check passed. Posting to Telegram...');

  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text: messageText,
    disable_web_page_preview: true,
  }, botToken);

  // Send all 3 quizzes (or however many are provided)
  for (let i = 0; i < content.quizzes.length; i += 1) {
    const quiz = content.quizzes[i];
    const delayMs = i > 0 ? 500 : 0; // Small delay between polls to avoid rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    
    await telegramRequest('sendPoll', {
      chat_id: chatId,
      question: quiz.question,
      options: quiz.options,
      type: 'quiz',
      correct_option_id: quiz.correctIndex,
      explanation: quiz.explanation,
      is_anonymous: true,
    }, botToken);
  }

  rememberFingerprint(history, messageFingerprint, { topic: content.topic });
  await savePostHistory(historyFilePath, history);

  console.log(`[ok] Posted content and ${content.quizzes.length} quiz polls for topic: ${content.topic}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
