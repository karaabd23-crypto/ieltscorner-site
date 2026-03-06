#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest';

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
  // 10 B1-level fallback templates matching Kay's English Corner channel voice

  // FORMAT 1: Vocabulary
  const vocabLessons = [
    {
      title: '💡 Word Power: "Reliable"',
      format: 'vocabulary',
      level: 'B1',
      topic: 'Reliable - someone or something you can trust',
      postBody: `💡 Word Power: "Reliable"

Let's explore this super useful word! ✨

You know that ONE friend who is ALWAYS there when you need them? 🤝 The one who never cancels plans and always keeps their promises? THAT person is reliable! 😊

🔤 "Reliable" means someone or something you can TRUST and DEPEND ON! 💪

It's not just for people — things can be reliable too! Your car, your phone, your wifi... well, maybe not your wifi 😅

✍️ Real Examples:
✅ "My best friend is so reliable — she always helps me when I need her!" 🤗
✅ "This car is very reliable. It never breaks down!" 🚗
✅ "We need a reliable internet connection for the meeting." 💻

🇮🇷 شرح فارسی:
Reliable یعنی قابل اعتماد! مثلاً کسی که همیشه میتونی روش حساب کنی! 🌟
✅ "دوستم خیلی قابل اعتماده — همیشه وقتی نیاز دارم کمکم میکنه!"
✅ "این ماشین خیلی قابل اعتماده. هیچوقت خراب نمیشه!"

💡 Pro Tip:
The opposite is "unreliable" — someone you CAN'T count on! 🙅
"Don't ask him — he's so unreliable. He always forgets!" 😤

🎯 Your turn! Think of someone reliable in YOUR life and write a sentence about them! Share below! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#LearnEnglish', '#Vocabulary', '#B1English', '#DailyEnglish', '#WordPower'],
      quizzes: [
        {
          question: '❓ "I always take this bus because it\'s very _____. It comes on time every day!"',
          options: ['expensive', 'reliable', 'nervous', 'difficult'],
          correctIndex: 1,
          explanation: '"Reliable" means you can trust it — it works every time! 💪',
        },
        {
          question: '❓ Which person is the MOST reliable?',
          options: ['Someone who always cancels plans', 'Someone who always keeps their promises', 'Someone who is always late', 'Someone who forgets everything'],
          correctIndex: 1,
          explanation: 'A reliable person keeps their promises! You can COUNT on them! 🤝',
        },
        {
          question: '❓ "My old phone was so _____. It turned off all the time!" What word fits?',
          options: ['reliable', 'unreliable', 'convenient', 'comfortable'],
          correctIndex: 1,
          explanation: 'If something breaks or stops working a lot, it\'s UNreliable! 📱😤',
        },
      ],
    },
  ];

  // FORMAT 2: Grammar
  const grammarLessons = [
    {
      title: '🧠 Grammar Guide: "Used to" vs "Would" (Past Habits Explained!)',
      format: 'grammar',
      level: 'B1',
      topic: 'Used to vs Would - past habits and states',
      postBody: `🧠 Grammar Guide: "Used to" vs "Would" (Past Habits Explained!)

This one confuses SO many students! Let's fix it forever! 🎯 ✨

Okay, here's the frustrating part: "used to" and "would" BOTH talk about past habits! 😅 They sound similar, they mean similar things... but there are sneaky differences! 🤔

But don't worry — the rule is actually SO simple once you understand it! 💡

📌 The Key Difference (Write this down!):
"USED TO" = A past habit that NO LONGER happens (it stopped!) 🛑
"WOULD" = A past habit you did repeatedly BY CHOICE 😄

🇮🇷 فارسی:
Used to = عادتی که دیگه انجام نمی‌دی
Would = عادتی که تکرار میکردی (انتخابی)

❌ WRONG: "When I was young, I would live in Paris" (NO! Weird!)
✅ RIGHT: "When I was young, I used to live in Paris" ✓
→ Living somewhere is a STATE, not a chosen action!

✅ "When I was 10, I would play basketball every day" ⚽ (your choice!)
✅ "She would always visit her grandmother on weekends" 👵

✍️ Real Examples:
✅ "I used to be scared of dogs, but now I love them!" 🐕
"من قبلاً از سگ می‌ترسیدم، ولی حالا عاشقشونم!"

💡 Pro Tip: If you can say "I DON'T anymore" → use "USED TO"! 🛑
If you "DID THIS many times by choice" → use "WOULD"! 😄

🎯 Try it NOW: Write a sentence about a habit you USED TO have! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#EnglishGrammar', '#UsedToVsWould', '#B1Grammar', '#LearnEnglish'],
      quizzes: [
        {
          question: '❓ "When I was a child, I _____ in a small town." (state, not choice)',
          options: ['would live', 'used to live', 'would living', 'use to live'],
          correctIndex: 1,
          explanation: 'Living somewhere is a STATE — always use "used to" for states! 🏠',
        },
        {
          question: '❓ "Every summer, we _____ go to the beach and swim all day." (repeated fun activity)',
          options: ['used to', 'would', 'Both are correct!', 'will'],
          correctIndex: 2,
          explanation: 'Both work here! It\'s a repeated activity. But "would" emphasizes the fun memory! 🏖️',
        },
        {
          question: '❓ Which is WRONG?',
          options: ['I used to play piano.', 'I would play piano every day.', 'I would be tall when I was young.', 'I used to be tall.'],
          correctIndex: 2,
          explanation: '"Be tall" is a STATE — you can\'t use "would" for states! Use "used to"! 📏',
        },
      ],
    },
  ];

  // FORMAT 3: Idiom
  const idiomLessons = [
    {
      title: '🎭 Idiom Time: "Break a leg!"',
      format: 'idiom',
      level: 'B1',
      topic: 'Break a leg - good luck or best wishes',
      postBody: `🎭 Idiom Time: "Break a leg!" 🦵✨

Wait, WHAT?! Why would you tell someone to break their leg?! 😱

Here's the thing — this has NOTHING to do with breaking bones! 😅

"Break a leg" is one of the most fun English idioms! It actually means "GOOD LUCK!" 🍀 Especially before a performance, speech, or big event! 🎤

It comes from the theater world 🎭 — actors believe saying "good luck" is BAD luck! So they say the opposite! How funny is that?! 😄

✍️ Real Examples:
✅ "You have a job interview tomorrow? Break a leg!" 💼
✅ "Break a leg at your presentation today!" 🎤
✅ "My daughter's dance show is tonight!" — "Oh, tell her to break a leg!" 💃

🇮🇷 شرح فارسی:
Break a leg یعنی موفق باشی! 🍀
وقتی کسی کار مهمی داره مثل مصاحبه یا ارائه، بهش بگو: Break a leg!
✅ "فردا مصاحبه کاری داری؟ امیدوارم موفق بشی!"
✅ "امشب رقص دخترمه!" — "بهش بگو موفق باشه!"

⚠️ When NOT to use it:
Don't say "break a leg" when someone is actually going to the hospital! 😅🏥
Only use it for performances, tests, interviews, or big moments! 🌟

💡 Tip: You can also say "Knock 'em dead!" — same meaning! 💪🔥

🎯 Your turn: When was the LAST time someone wished YOU good luck? Tell us! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#EnglishIdioms', '#BreakALeg', '#B1English', '#DailyIdiom', '#GoodLuck'],
      quizzes: [
        {
          question: '❓ Your friend is about to perform on stage. What do you say?',
          options: ['Be careful with your legs!', 'Break a leg!', 'Don\'t break anything!', 'Good legs!'],
          correctIndex: 1,
          explanation: '"Break a leg" = Good luck! Perfect before a big performance! 🎭✨',
        },
        {
          question: '❓ "Break a leg" comes from which world?',
          options: ['Sports', 'Medicine', 'Theater', 'Cooking'],
          correctIndex: 2,
          explanation: 'Actors believe saying "good luck" is bad luck, so they say the opposite! 🎭',
        },
        {
          question: '❓ When should you NOT say "break a leg"?',
          options: ['Before a job interview', 'Before an exam', 'When someone is going to the hospital', 'Before a dance show'],
          correctIndex: 2,
          explanation: 'Don\'t say it when someone is actually hurt! 😅 Only for performances and big moments!',
        },
      ],
    },
  ];

  // FORMAT 4: Phrasal verb
  const phrasalLessons = [
    {
      title: '🔄 Phrasal Verb Power: "Look forward to"',
      format: 'phrasal-verb',
      level: 'B1',
      topic: 'Look forward to - be excited about something in the future',
      postBody: `🔄 Phrasal Verb Power: "Look forward to" 🎉

This is one of the MOST useful phrases in English! ✨ You'll use it in conversations, emails, texts — EVERYWHERE! 📱💬📧

"Look forward to" means you feel EXCITED and HAPPY about something in the future! 🤩

Here's what makes this phrase special — you use it when you REALLY want something to happen! Not just "okay fine" but "YES I CAN'T WAIT!" 🎊

✍️ Real Examples:
✅ "I'm looking forward to the weekend!" 🎉
✅ "She's looking forward to her vacation in Mexico!" 🏖️
✅ "We look forward to meeting you!" (SO common in emails!) 📧

⚠️ BUT HERE'S THE TRAP! The part that trips EVERYONE up! 😅
After "look forward to" → use -ING! NOT infinitive!

✅ "I look forward to SEEING you." ← CORRECT! ✓
❌ "I look forward to SEE you." ← WRONG! ✗

✅ "I'm looking forward to STARTING my new job." 💼
❌ "I'm looking forward to START my new job." 🚫

🇮🇷 شرح فارسی:
Look forward to یعنی مشتاقانه منتظرم! 🌟
✅ "مشتاقانه منتظر آخر هفته هستم!" 🎉
✅ "مشتاقانه منتظر دیدنتون هستیم!" (خیلی رایج در ایمیل!)

💡 Pro Tip: PERFECT for professional emails! End with:
"I look forward to hearing from you." 📧✨

🎯 What are YOU looking forward to this week? Tell us below! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#PhrasalVerbs', '#LookForwardTo', '#B1English', '#EnglishGrammar', '#DailyEnglish'],
      quizzes: [
        {
          question: '❓ "I look forward to _____ you at the party!"',
          options: ['see', 'seeing', 'saw', 'to see'],
          correctIndex: 1,
          explanation: 'After "look forward to" → always -ING! "Looking forward to SEEING!" ✨',
        },
        {
          question: '❓ What does "I\'m looking forward to the weekend" mean?',
          options: ['I\'m scared of the weekend', 'I\'m excited about the weekend!', 'I forgot about the weekend', 'I hate weekends'],
          correctIndex: 1,
          explanation: '"Looking forward to" = excited and happy! You CAN\'T WAIT! 🎉',
        },
        {
          question: '❓ Which email ending is CORRECT?',
          options: ['I look forward to hear from you.', 'I look forward to hearing from you.', 'I look forward hear from you.', 'I looking forward to hear.'],
          correctIndex: 1,
          explanation: '"Look forward to HEARING" — remember, always -ING after "to"! 📧',
        },
      ],
    },
  ];

  // FORMAT 5: Expression
  const expressionLessons = [
    {
      title: '💬 Say This Like a Native: "It depends!"',
      format: 'expression',
      level: 'B1',
      topic: 'It depends - the answer changes based on the situation',
      postBody: `💬 Say This Like a Native: "It depends!" 🤔

Have you ever been asked a question and thought "Well... it's not that simple!" 😅

THAT'S when you say "It depends!" ✨

This is one of those magical phrases that makes you sound SO natural in English! 🌟 Native speakers use it ALL the time! 🗣️

It means: the answer CHANGES based on the situation! There's no simple yes or no! 🤷

✍️ Real Examples:
✅ "Do you like cooking?" — "It depends! If I have time, yes!" 🍳
✅ "Is English hard?" — "It depends on how much you practice!" 📚
✅ "Should I take the bus?" — "It depends on the traffic!" 🚌

📌 How to use it:
• "It depends." (by itself — short answer!) 
• "It depends ON + noun" → "It depends on the weather." ☀️🌧️
• "It depends ON + question word" → "It depends on how far it is." 🗺️

🇮🇷 شرح فارسی:
It depends یعنی "بستگی داره"! 🤔
✅ "آیا آشپزی دوست داری؟" — "بستگی داره! اگه وقت داشته باشم، آره!"
✅ "انگلیسی سخته؟" — "بستگی داره چقدر تمرین کنی!"

💡 Pro Tip: PERFECT for when people ask hard questions!
Instead of struggling to explain, just say "Well, it depends..." and then explain WHY! 😎

🎯 Answer this: "Do you prefer summer or winter?" Use "it depends" in your answer! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#EnglishExpressions', '#ItDepends', '#B1English', '#SpeakLikeANative'],
      quizzes: [
        {
          question: '❓ "Will you go to the party?" — "_____ on who\'s going."',
          options: ['It depends', 'It decides', 'It works', 'It changes'],
          correctIndex: 0,
          explanation: '"It depends on..." — the answer changes based on the situation! 🤔',
        },
        {
          question: '❓ When do we say "it depends"?',
          options: ['When we are 100% sure', 'When the answer is always the same', 'When the answer changes based on the situation', 'When we don\'t understand'],
          correctIndex: 2,
          explanation: '"It depends" = no simple yes or no! The situation matters! ✨',
        },
        {
          question: '❓ Which is CORRECT?',
          options: ['It depends of the price.', 'It depends on the price.', 'It depends for the price.', 'It depends at the price.'],
          correctIndex: 1,
          explanation: 'Always: "depends ON" — "It depends ON the price!" 💰',
        },
      ],
    },
  ];

  // FORMAT 6: Error Correction
  const errorLessons = [
    {
      title: '🔍 Spot the Mistake! Common Errors That Trip EVERYONE Up!',
      format: 'error-correction',
      level: 'B1',
      topic: 'Common mistakes with agree, enjoy, and suggest',
      postBody: `🔍 Spot the Mistake! Can You Fix These? 🧐

These 3 mistakes are SO common! Even advanced students make them! 😅
But once you learn the rules, you'll NEVER make them again! 💪✨

Mistake 1: 😱
❌ "I am agree with you."
✅ "I agree with you."
→ "Agree" is a VERB! You don't need "am"! Just say "I agree!" ✓

Mistake 2: 🤦
❌ "I enjoy to swim."
✅ "I enjoy swimming."
→ After "enjoy" → ALWAYS use -ING! No exceptions! 🏊

Mistake 3: 😅
❌ "She suggested me to go."
✅ "She suggested that I go." OR "She suggested going."
→ "Suggest" NEVER uses "me to..." pattern!

🇮🇷 شرح فارسی:
این ۳ اشتباه خیلی رایجه! 😅
❌ I am agree ← اشتباهه. فقط بگید: I agree! ✅
"من با تو موافقم!" = "I agree with you!"
❌ enjoy to ← اشتباهه. بعد از enjoy همیشه ing بذارید! ✅
"من از شنا کردن لذت میبرم!" = "I enjoy swimming!"

💡 Pro Tip: After these verbs, ALWAYS use -ING:
enjoy + doing ✅ | suggest + doing ✅ | avoid + doing ✅ | consider + doing ✅

These are called "gerund verbs" — memorize them and you'll sound SO much more natural! 🌟

🎯 Challenge: Write a sentence with "agree," "enjoy," or "suggest"! Let's see it! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#CommonMistakes', '#EnglishGrammar', '#B1English', '#FixYourEnglish', '#SpotTheMistake'],
      quizzes: [
        {
          question: '❓ Which sentence is CORRECT?',
          options: ['I am agree with this idea.', 'I agree with this idea.', 'I am agreed with this idea.', 'I agreeing with this idea.'],
          correctIndex: 1,
          explanation: '"Agree" is a verb — just say "I agree!" No "am" needed! 💪',
        },
        {
          question: '❓ "I really enjoy _____ to music!" 🎵',
          options: ['to listen', 'listen', 'listening', 'for listen'],
          correctIndex: 2,
          explanation: 'After "enjoy" → ALWAYS -ING: "enjoy listening!" 🎶',
        },
        {
          question: '❓ "She suggested _____ the restaurant near the park."',
          options: ['me to try', 'trying', 'me trying', 'I to try'],
          correctIndex: 1,
          explanation: '"Suggest" + -ING: "She suggested trying!" Or: "She suggested that I try!" ✅',
        },
      ],
    },
  ];

  // FORMAT 7: Pronunciation
  const pronunLessons = [
    {
      title: '🔊 CAN YOU SAY THIS? Most people can\'t! 🤯',
      format: 'pronunciation',
      level: 'B1',
      topic: 'Tricky English pronunciation',
      postBody: `🔊 CAN YOU SAY THIS? Most people can't! 🤯

English spelling is CRAZY! 😅 These words look SO different from how they sound!

Let's fix your pronunciation RIGHT NOW! 💪

1️⃣ Wednesday = "WENZ-day" ✅ (not Wed-NES-day ❌)
2️⃣ Comfortable = "KUMF-ter-bul" ✅ (not com-FOR-ta-ble ❌)
3️⃣ Vegetable = "VEJ-tuh-bul" ✅ (not veg-eh-TAY-ble ❌)
4️⃣ Interesting = "IN-tres-ting" ✅ (not in-ter-ES-ting ❌)
5️⃣ Restaurant = "RES-tront" ✅ (not res-taw-RANT ❌)

Wait, WHAT?! 😱 Only 3 syllables in "comfortable"?! YES! 🤯

Here's the SECRET: In English, we SKIP sounds in long words! 🤐
This is NOT lazy — it's how native speakers actually talk! 🗣️✨

🇮🇷 شرح فارسی:
در انگلیسی، بعضی کلمات اصلاً جوری که نوشته شدن تلفظ نمیشن! 🤯
Wednesday رو میگن "ونزدی" — نه "ودنزدی"!
Comfortable فقط ۳ بخش داره: "کامفتربل" — نه ۴ بخش!
این طبیعیه! حتی آدمای بومی هم همینجوری حرف میزنن! ✅

💡 Pro Tip: Say each word 5 times FAST! 🗣️
Your mouth will learn the shortcut automatically! Try it NOW! 💪

🎯 Which word surprised you the MOST? Tell us below! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#Pronunciation', '#SayItRight', '#B1English', '#EnglishSounds', '#CanYouSayThis'],
      quizzes: [
        {
          question: '❓ How do native speakers say "comfortable"?',
          options: ['com-FOR-ta-ble (4 syllables)', 'KUMF-ter-bul (3 syllables)', 'com-fort-ABLE', 'COMFY-table'],
          correctIndex: 1,
          explanation: 'Only 3 syllables! "KUMF-ter-bul" — we skip the "or" sound! 🤯',
        },
        {
          question: '❓ How do you say "Wednesday"?',
          options: ['Wed-NES-day', 'WENZ-day', 'Wed-IN-day', 'WED-nes-DAY'],
          correctIndex: 1,
          explanation: 'The "d" and second "e" are SILENT! Just "WENZ-day!" 📅',
        },
        {
          question: '❓ Why do native speakers "skip" sounds in words?',
          options: ['Because they are lazy', 'It\'s a natural part of how English works!', 'They don\'t know the right way', 'Only Americans do this'],
          correctIndex: 1,
          explanation: 'Skipping sounds in long words is NORMAL native English! Not laziness! 🗣️✨',
        },
      ],
    },
  ];

  // FORMAT 8: Comparison
  const compLessons = [
    {
      title: '⚖️ Make vs Do — FINALLY understand the difference! 🎯',
      format: 'comparison',
      level: 'B1',
      topic: 'Make vs Do - when to use each one',
      postBody: `⚖️ Make vs Do — FINALLY understand the difference! 🎯

This is one of the MOST confusing things in English! 😅
But I promise — after this post, you'll NEVER mix them up again! 💪✨

Here's the simple SECRET: 🤫

📌 DO = for tasks, work, and activities (the boring stuff! 😅)
• do homework / do the dishes / do exercise
• do a favour / do your best / do business

📌 MAKE = for creating or producing something NEW! ✨
• make food / make a mistake / make a decision
• make money / make a plan / make friends

🔑 Memory trick that WORKS:
DO = routine stuff you HAVE to do 😴
MAKE = something you CREATE! 🎨✨

Now look at these — can you spot the mistakes? 👀

❌ "I need to make my homework." ← WRONG!
✅ "I need to do my homework." ← RIGHT! ✓

❌ "I did a mistake." ← WRONG!
✅ "I made a mistake." ← RIGHT! ✓

🇮🇷 شرح فارسی:
Do بیشتر برای کارها و وظایفه: do homework, do the dishes 📋
"من باید تکالیفم رو انجام بدم!" = "I need to do my homework!"
Make بیشتر برای ساختن چیز جدیده: make food, make a plan 🎨
"من اشتباه کردم!" = "I made a mistake!"

💡 Pro Tip: When you're not sure, ask yourself:
"Am I CREATING something?" → MAKE ✨
"Am I DOING a task?" → DO ✓

🎯 Challenge: Write one sentence with MAKE and one with DO! Let's see! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#MakeVsDo', '#EnglishGrammar', '#B1English', '#ConfusingWords', '#LearnEnglish'],
      quizzes: [
        {
          question: '❓ "Can you _____ me a favour?" 🤝',
          options: ['make', 'do', 'have', 'take'],
          correctIndex: 1,
          explanation: '"Do a favour" — it\'s a task, not creating something! ✅',
        },
        {
          question: '❓ "She _____ a big mistake at work." 😅',
          options: ['did', 'made', 'done', 'does'],
          correctIndex: 1,
          explanation: 'We say "MAKE a mistake" — not "do a mistake!" 💡',
        },
        {
          question: '❓ Which pair is CORRECT?',
          options: ['make homework, do a cake', 'do homework, make a cake', 'make the dishes, do money', 'do a decision, make exercise'],
          correctIndex: 1,
          explanation: 'DO homework (task! 📋) + MAKE a cake (creating! 🎂) = CORRECT! ✅',
        },
      ],
    },
  ];

  // FORMAT 9: Dialogue / Real Life
  const storyLessons = [
    {
      title: '🎬 Real Conversation: At a Coffee Shop! ☕',
      format: 'dialogue',
      level: 'B1',
      topic: 'Ordering at a coffee shop - useful phrases',
      postBody: `🎬 Real Conversation: At a Coffee Shop! ☕

You're in Canada 🇨🇦 and you walk into Tim Hortons! ☕ What do you say?! 😅

Don't worry — here's EXACTLY how the conversation goes! 💪✨

👤 Barista: "Hi! What can I get for you?" 😊
🙋 You: "Can I have a medium latte, please?" ☕
👤 Barista: "Sure! Would you like that hot or iced?" 🧊
🙋 You: "Iced, please!" ✨
👤 Barista: "Do you want any flavour? Vanilla? Caramel?" 🍦
🙋 You: "Vanilla sounds good!" 😄
👤 Barista: "For here or to go?" 📦
🙋 You: "To go, please!"
👤 Barista: "That'll be $5.75." 💰
🙋 You: "Here you go. Thanks!" 🤗
👤 Barista: "Thank you! Have a great day!" ☀️

📌 KEY PHRASES to remember:
• "Can I have a..." = THE polite way to order! 🙏
• "For here or to go?" = eat here or take it? 📦
• "That'll be..." = here's the price! 💰
• "Here you go" = when you hand money/card! 💳

🇮🇷 شرح فارسی:
Can I have a... = میتونم ... داشته باشم؟ 🙏
"میتونم یه لاته متوسط داشته باشم لطفاً؟" ☕
For here or to go? = اینجا میخورید یا میبرید؟ 📦
That'll be = قیمتش میشه... 💰

💡 Pro Tip: In Canada, you can say "double-double" for coffee with 2 creams + 2 sugars! 🇨🇦☕

🎯 Next time you order coffee, try using "Can I have a..." — you'll sound SO natural! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#RealEnglish', '#CoffeeShop', '#B1Speaking', '#DailyConversation', '#CanadianEnglish'],
      quizzes: [
        {
          question: '❓ How do you politely order in English? ☕',
          options: ['Give me a coffee!', 'Can I have a coffee, please?', 'I want coffee now!', 'Hey, coffee!'],
          correctIndex: 1,
          explanation: '"Can I have a... please?" — THE polite way to order! 🙏✨',
        },
        {
          question: '❓ "For here or to go?" — What does this mean?',
          options: ['Hot or cold?', 'Eat here or take it with you?', 'Big or small?', 'Cash or card?'],
          correctIndex: 1,
          explanation: '"For here" = eat in the shop! "To go" = take it with you! 📦',
        },
        {
          question: '❓ What is a "double-double" in Canada? 🇨🇦',
          options: ['Two coffees', 'Coffee with 2 creams and 2 sugars', 'Double-size coffee', 'Two donuts'],
          correctIndex: 1,
          explanation: 'A double-double = 2 creams + 2 sugars! A classic Canadian order! ☕🇨🇦',
        },
      ],
    },
  ];

  // FORMAT 10: Canadian Culture
  const culturalLessons = [
    {
      title: '🇨🇦 Canadian English: Things People ACTUALLY Say!',
      format: 'cultural',
      level: 'B1',
      topic: 'Common Canadian expressions and small talk',
      postBody: `🇨🇦 Canadian English: Things People ACTUALLY Say!

If you live in Canada, you NEED to know these! 🤩 They'll help you sound like a LOCAL! 💪✨

1️⃣ "Sorry!" 🙏
Canadians say sorry ALL the time! Even when it's NOT their fault! 😅
→ Someone bumps into YOU and says: "Oh, sorry!" 🤷‍♂️

2️⃣ "Double-double" ☕
Coffee with 2 creams + 2 sugars! A Tim Hortons classic! 🍩
→ "I'll have a double-double, please!" 

3️⃣ "How's it going?" 👋
THIS IS A TRAP! 😅 It's NOT a real question! It's just a greeting!
→ Answer: "Good, thanks! You?" (Don't tell your whole life story! 😂)

4️⃣ "No worries!" 😊
Means "it's okay!" or "you're welcome!" SO useful!
→ "Thanks for the ride!" — "No worries!" 🚗✨

5️⃣ "Toque" (say it like "took") 🧢
A warm winter hat! VERY important November to March! 🥶❄️
→ "Don't forget your toque — it's minus 20 today!" 

🇮🇷 شرح فارسی:
کانادایی‌ها خیلی "sorry" میگن — حتی وقتی تقصیر خودشون نیست! 😅
Double-double یعنی قهوه با ۲ خامه و ۲ شکر! ☕
How's it going فقط یه سلامه — جواب کوتاه بدید! 👋
"خوبم ممنون! تو چطوری؟" = "Good, thanks! You?"

💡 Pro Tip: If someone says "How's it going?" just say "Good, thanks!" Don't overthink it! 😎

🎯 Have you noticed any of these Canadian habits? Which one surprised you? Tell us! 👇

🤖 Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#CanadianEnglish', '#LifeInCanada', '#B1English', '#CulturalTips', '#CanadianSlang'],
      quizzes: [
        {
          question: '❓ Someone says "How\'s it going?" What\'s the best answer? 👋',
          options: ['Well, this morning I woke up at 7...', 'Good, thanks! You?', 'Going where?', 'I don\'t know.'],
          correctIndex: 1,
          explanation: 'It\'s just a GREETING! Keep it short: "Good, thanks!" 😊✨',
        },
        {
          question: '❓ You order a "double-double" at Tim Hortons. What do you get? ☕',
          options: ['Two coffees', 'Coffee with 2 creams and 2 sugars', 'Double-size coffee', 'Two donuts'],
          correctIndex: 1,
          explanation: 'Double-double = 2 creams + 2 sugars! NOW you know! 🇨🇦☕',
        },
        {
          question: '❓ What is a "toque" in Canadian English? 🧢',
          options: ['A type of cake', 'A warm winter hat', 'A greeting', 'A type of coffee'],
          correctIndex: 1,
          explanation: 'A toque is a warm hat! ESSENTIAL for Canadian winters! 🥶❄️🧢',
        },
      ],
    },
  ];

  // ALL FORMATS IN ONE POOL
  const allFormats = [
    ...vocabLessons,
    ...grammarLessons,
    ...idiomLessons,
    ...phrasalLessons,
    ...expressionLessons,
    ...errorLessons,
    ...pronunLessons,
    ...compLessons,
    ...storyLessons,
    ...culturalLessons,
  ];

  const selectedLesson = allFormats[Math.floor(Math.random() * allFormats.length)];

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

  await telegramRequest('sendMessage', {
    chat_id: chatId,
    text: buildPostMessage(content),
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

  console.log(`[ok] Posted content and ${content.quizzes.length} quiz polls for topic: ${content.topic}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
