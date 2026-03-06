#!/usr/bin/env node

/**
 * Post a variety of format samples to test which style works best
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadEnvFiles() {
  const envPath = join(__dirname, '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    // .env optional
  }
}

function resolveChatId(chatId, channelUrl) {
  if (chatId?.trim()) return chatId.trim();
  if (!channelUrl?.trim()) return '';
  const normalized = channelUrl.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) return '';
  return slug.startsWith('@') ? slug : `@${slug}`;
}

async function telegramRequest(botToken, method, payload) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  return data.result;
}

async function postContent(botToken, chatId, content) {
  console.log(`\n[posting] ${content.title}...`);
  
  const contentResult = await telegramRequest(botToken, 'sendMessage', {
    chat_id: chatId,
    text: content.postBody,
    parse_mode: 'HTML',
  });

  if (content.quiz) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await telegramRequest(botToken, 'sendPoll', {
      chat_id: chatId,
      question: content.quiz.question,
      options: content.quiz.options,
      type: 'quiz',
      correct_option_id: content.quiz.correctIndex,
      explanation: content.quiz.explanation,
      is_anonymous: true,
    });
  }

  console.log(`✅ Posted: ${content.title}`);
  return contentResult;
}

// FORMAT SAMPLES - Each with distinct structure/feel
const formatSamples = [
  // 1. MINI STORY FORMAT (narrative-based)
  {
    title: '📖 Mini Story: The Job Interview Surprise',
    format: 'story',
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
    quiz: {
      question: '❓ What does "out of breath" mean?',
      options: [
        'Very angry',
        'Breathing hard after running',
        'Holding your breath',
        'Speaking quietly'
      ],
      correctIndex: 1,
      explanation: '"Out of breath" = نفس نفس زدن! After running or exercise! 🏃‍♀️💨',
    },
  },

  // 2. VISUAL COMPARISON FORMAT (side-by-side)
  {
    title: '⚡ Quick Fix: Stop Saying "Very"!',
    format: 'comparison',
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
    quiz: {
      question: '❓ "I\'m not just tired, I\'m _____!" (Super tired)',
      options: ['very tired', 'exhausted', 'sleeping', 'boring'],
      correctIndex: 1,
      explanation: '"Exhausted" = خسته مرده! Much stronger than "very tired!" 💪',
    },
  },

  // 3. ULTRA-SHORT TIP FORMAT
  {
    title: '💬 Say It Right: "I\'m good" vs "I\'m well"',
    format: 'quick-tip',
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
    quiz: null,
  },

  // 4. COMMON MISTAKE DEEP DIVE
  {
    title: '🔍 One Mistake Everyone Makes: "Bored" vs "Boring"',
    format: 'mistake-focus',
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
    quiz: {
      question: '❓ "That class was so _____. I almost fell asleep!" 😴',
      options: ['bored', 'boring', 'bore', 'to bore'],
      correctIndex: 1,
      explanation: 'The CLASS causes boredom → "boring"! YOU feel bored! 💤',
    },
  },

  // 5. IDIOM WITH STORY/ORIGIN
  {
    title: '🎭 Idiom Story: "Piece of cake!"',
    format: 'idiom-origin',
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
    quiz: {
      question: '❓ "Don\'t worry, this exam is a piece of ___!"',
      options: ['bread', 'cake', 'candy', 'cookie'],
      correctIndex: 1,
      explanation: '"Piece of CAKE" = super easy! خیلی آسون! 🍰✨',
    },
  },

  // 6. CANADIAN CONTEXT / REAL-LIFE
  {
    title: '🇨🇦 Real Canada: What to Say at Tim Hortons',
    format: 'cultural-practical',
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
    quiz: {
      question: '❓ What does "for here or to go?" mean?',
      options: [
        'Hot or cold?',
        'Eat inside or take with you?',
        'Large or small?',
        'With sugar or no sugar?'
      ],
      correctIndex: 1,
      explanation: '"For here" = inside! "To go" = take it! 📦☕',
    },
  },

  // 7. PRONUNCIATION CHALLENGE
  {
    title: '🔊 Pronunciation Challenge: "Literally"',
    format: 'pronunciation',
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
    quiz: {
      question: '❓ How many syllables do native speakers use for "literally"?',
      options: ['4 syllables', '3 syllables', '2 syllables', '1 syllable'],
      correctIndex: 2,
      explanation: 'Only 2 syllables! "LIT-r\'lly" — we skip the middle! 🗣️✨',
    },
  },
];

async function main() {
  await loadEnvFiles();

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL ?? '';
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);

  if (!botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }

  if (!chatId) {
    throw new Error('Missing target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL)');
  }

  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('🏃 DRY-RUN MODE\n');
    formatSamples.forEach((sample, i) => {
      console.log(`${i + 1}. ${sample.format.toUpperCase()}: ${sample.title}`);
    });
    console.log('\n✅ Remove --dry-run to post all samples');
    return;
  }

  console.log(`🚀 Posting ${formatSamples.length} format samples to ${chatId}\n`);
  console.log('⏱️  Posting one every 10 seconds to avoid rate limits...\n');

  for (let i = 0; i < formatSamples.length; i++) {
    const sample = formatSamples[i];
    
    try {
      await postContent(botToken, chatId, sample);
      
      // Wait 10 seconds between posts (except after the last one)
      if (i < formatSamples.length - 1) {
        console.log('⏳ Waiting 10 seconds before next post...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`❌ Failed to post ${sample.title}: ${error.message}`);
    }
  }

  console.log('\n✅ All samples posted! Check your channel! 🎉');
  console.log('\n📋 Format Summary:');
  formatSamples.forEach((sample, i) => {
    console.log(`   ${i + 1}. ${sample.format} - ${sample.title}`);
  });
  console.log('\n💬 Tell me which format(s) you like best! 👍');
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
