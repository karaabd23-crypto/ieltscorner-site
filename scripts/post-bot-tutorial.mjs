#!/usr/bin/env node

/**
 * Post weekly bot tutorial/features guide to Telegram channel
 * Runs every Monday to remind subscribers how to use the bot
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

// Weekly bot tutorial posts - rotate through different aspects
const botTutorials = [
  // Week 1: Overview
  {
    title: '🤖 Meet Your English Learning Bot! (How to Use)',
    postBody: `🤖 Meet Your English Learning Bot! 

Did you know you can chat with me DIRECTLY?! 😊💬

I'm here to help you learn English EVERY DAY — and it's super easy! Let me show you! 👇

📍 HOW TO START:

1️⃣ Click this link: @Ewithkpaybot 🤖
(Or search "Ewithkpaybot" in Telegram)

2️⃣ Tap "START" 

3️⃣ Choose what you want to learn! ✨

✨ WHAT I CAN DO FOR YOU:

📚 **Daily Vocabulary** - Get new words with examples
🧠 **Grammar Tips** - Quick, simple rules
🎭 **Idioms** - Sound like a native speaker!
🔥 **Study Streak** - Track daily progress
🎁 **Referrals** - Earn rewards for sharing!
💬 **Ask Questions** - I'll help you learn!

🇮🇷 شرح فارسی:
میتونید مستقیم با ربات چت کنید! 🤖
• کلمات روزانه بگیرید 📚
• قواعد گرامر یاد بگیرید 🧠
• روزهای مطالعه رو ردیابی کنید 🔥
• با معرفی دوستان جایزه بگیرید! 🎁

💡 PRO TIP:
Send "studied" to the bot EVERY DAY to build your streak! 🔥
7 days = 🟢 Starter
30 days = 🟡 Builder  
365 days = 🏆 Champion

🎯 TRY IT NOW: Click @Ewithkpaybot and send /start! 

Then come back and tell us what you think! 👇

🌈✨ Kay's English Corner
Your Gateway to English Success in Canada 🇨🇦
🔗 Join us: t.me/kaysenglishcorner`,
    quiz: {
      question: '❓ How do you build your study streak?',
      options: [
        'Send "studied" to the bot daily',
        'Post in the channel',
        'Like every post',
        'Just read messages'
      ],
      correctIndex: 0,
      explanation: 'Send "studied" to the bot every day to build your streak! 🔥💪',
    },
  },

  // Week 2: Vocabulary & Grammar Features
  {
    title: '📚 Bot Feature: Get Daily Vocabulary & Grammar!',
    postBody: `📚 Bot Feature: Get Daily Vocabulary & Grammar!

Want personalized English lessons? The bot has you covered! 💪✨

Here's what you can get INSTANTLY:

🔹 **Vocabulary Builder** 📚
→ Send "vocab" or "vocabulary" to the bot
→ Get today's word with:
   • Clear definition
   • Real-life examples
   • Farsi translation
   • Usage tips

Example: "serendipity" = finding good things by chance! 🍀

🔹 **Grammar Tips** 🧠  
→ Send "grammar" to the bot
→ Get quick explanations like:
   • Used to vs Would
   • Present Perfect rules
   • Common mistakes
   • Clear examples

🇮🇷 فارسی:
به ربات بگید "vocab" یا "grammar" و یاد بگیرید! 📚🧠
• کلمات روزانه با مثال
• قواعد گرامر ساده
• اشتباهات رایج
• همه چیز به فارسی هم توضیح داده میشه!

💡 QUICK COMMANDS:
• "vocab" → Today's word
• "grammar" → Grammar tip
• "idioms" → Learn expressions
• "streak" → Check progress

⚡ TRY IT NOW:
1. Open @Ewithkpaybot
2. Send "vocab"
3. Learn a new word RIGHT NOW! 💪

🎯 Which feature will YOU try first? Tell us! 👇

🌈✨ Kay's English Corner
Your Gateway to English Success in Canada 🇨🇦
🔗 Join us: t.me/kaysenglishcorner`,
    quiz: {
      question: '❓ What do you send to the bot to get today\'s vocabulary word?',
      options: [
        'word',
        'vocab',
        'dictionary',
        'learn'
      ],
      correctIndex: 1,
      explanation: 'Send "vocab" to get today\'s vocabulary word instantly! 📚✨',
    },
  },

  // Week 3: Study Streak & Motivation
  {
    title: '🔥 Build Your Study Streak & Stay Motivated!',
    postBody: `🔥 Build Your Study Streak & Stay Motivated!

Consistency is THE SECRET to learning English! 💪

The bot tracks your daily progress — and it's SO simple! 😊

📍 HOW IT WORKS:

1️⃣ Open @Ewithkpaybot 
2️⃣ Send "studied" EVERY DAY 
3️⃣ Watch your streak grow! 🔥

✨ STREAK LEVELS:

🟢 **7 Days** = Starter (You're building a habit!)
🟡 **30 Days** = Builder (You're committed!)
🟠 **90 Days** = Advanced (Unstoppable!)
🏆 **365 Days** = Champion (You're a LEGEND!)

💡 WHY IT MATTERS:
• Builds discipline 💪
• Keeps you accountable 📊
• Makes learning a HABIT, not a task! 🎯
• You see progress EVERY day! 📈

🇮🇷 فارسی:
هر روز به ربات بگید "studied" و پیشرفتتون رو ببینید! 🔥
• ۷ روز = شروع کننده 🟢
• ۳۰ روز = سازنده 🟡
• ۳۶۵ روز = قهرمان! 🏆

⚠️ IMPORTANT:
Even if you just study 5 minutes — send "studied"! 
Small steps = big results! 🌟

🎯 PRO TIP:
Set a phone alarm for 8pm every day:
"Send 'studied' to Kay's bot!" ⏰

📱 ACTION STEP:
Right now, open @Ewithkpaybot and send:
• "streak" to check your current streak
• "studied" to start building it TODAY!

💬 What's YOUR current streak? Share below! 👇

🌈✨ Kay's English Corner
Your Gateway to English Success in Canada 🇨🇦
🔗 Join us: t.me/kaysenglishcorner`,
    quiz: {
      question: '❓ How many days for the "Champion" streak level?',
      options: [
        '30 days',
        '90 days',
        '180 days',
        '365 days'
      ],
      correctIndex: 3,
      explanation: '365 days = Champion level! One full year of consistency! 🏆🔥',
    },
  },

  // Week 4: Referral System
  {
    title: '🎁 Earn Rewards: Refer Friends & Get Free Lessons!',
    postBody: `🎁 Earn Rewards: Refer Friends & Get Free Lessons!

Learning English is BETTER with friends! And you can earn rewards! 🎉

Here's how the referral system works: 👇

📍 GET YOUR REFERRAL LINK:

1️⃣ Open @Ewithkpaybot 
2️⃣ Send "refer" 
3️⃣ Get YOUR unique link! 🔗

✨ WHAT YOU EARN:

🎯 **5 Referrals** = FREE webinar access ($50 value!)
🎯 **10 Referrals** = 1 FREE hour of tutoring ($80 value!)
🎯 **20 Referrals** = 1 month PREMIUM features! 🌟

💡 HOW TO SHARE:

• Post your link on Instagram/Facebook 📱
• Share in WhatsApp groups 💬
• Tell your classmates 🎓
• Post in Farsi community groups 🇮🇷

🇮🇷 فارسی:
با معرفی دوستان جایزه بگیرید! 🎁
• ۵ نفر = وبینار رایگان 
• ۱۰ نفر = یک ساعت کلاس خصوصی رایگان!
• ۲۰ نفر = یک ماه ویژگی‌های ویژه!

به ربات بگید "refer" و لینک خودتون رو بگیرید! 🔗

💬 SAMPLE MESSAGE TO SHARE:

"Hey! I'm using this amazing English learning bot for free! 
Check it out: [your link] 
Daily lessons, grammar tips, vocabulary, and more! 🚀"

📊 Track Your Referrals:
Send "refer" anytime to see:
• Your referral link
• How many people joined
• What you've earned!

🎯 ACTION STEP:
1. Get your link: @Ewithkpaybot → send "refer"
2. Share it with 3 friends TODAY
3. Start earning! 💪

Who will YOU refer first? 👇

🌈✨ Kay's English Corner
Your Gateway to English Success in Canada 🇨🇦
🔗 Join us: t.me/kaysenglishcorner`,
    quiz: {
      question: '❓ What do you get for 5 successful referrals?',
      options: [
        'A free book',
        'A free webinar',
        '1 hour tutoring',
        'Premium features'
      ],
      correctIndex: 1,
      explanation: '5 referrals = FREE webinar access! Worth $50! 🎉🎁',
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

  // Rotate through tutorials based on week number of the year
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  const tutorialIndex = (weekNumber - 1) % botTutorials.length;
  const tutorial = botTutorials[tutorialIndex];

  if (dryRun) {
    console.log('🏃 DRY-RUN MODE\n');
    console.log(`Week #${weekNumber} → Tutorial ${tutorialIndex + 1}/${botTutorials.length}\n`);
    console.log(`Title: ${tutorial.title}\n`);
    console.log('Post body preview:');
    console.log(tutorial.postBody.substring(0, 500) + '...\n');
    console.log('✅ Remove --dry-run to post');
    return;
  }

  console.log(`📅 Week #${weekNumber} - Posting tutorial ${tutorialIndex + 1}/${botTutorials.length}`);
  console.log(`📝 ${tutorial.title}\n`);

  // Post main content
  console.log('[posting] Main content...');
  const contentResult = await telegramRequest(botToken, 'sendMessage', {
    chat_id: chatId,
    text: tutorial.postBody,
    parse_mode: 'HTML',
  });
  console.log('✅ Posted content');

  // Post quiz if available
  if (tutorial.quiz) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('[posting] Quiz...');
    await telegramRequest(botToken, 'sendPoll', {
      chat_id: chatId,
      question: tutorial.quiz.question,
      options: tutorial.quiz.options,
      type: 'quiz',
      correct_option_id: tutorial.quiz.correctIndex,
      explanation: tutorial.quiz.explanation,
      is_anonymous: true,
    });
    console.log('✅ Posted quiz');
  }

  console.log(`\n🎉 Weekly bot tutorial posted successfully!`);
  console.log(`📊 Next tutorial in 7 days: "${botTutorials[(tutorialIndex + 1) % botTutorials.length].title}"`);
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
