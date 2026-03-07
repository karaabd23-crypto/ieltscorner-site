#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_HISTORY_FILE = '.cache/telegram-post-history.json';
const HISTORY_MAX_ITEMS = 5000;

const STORY_TOPICS = [
  { type: 'vocab-tip', emoji: '💡', topic: 'One powerful word to sound more professional' },
  { type: 'grammar-hack', emoji: '✨', topic: 'Fix this common mistake in 10 seconds' },
  { type: 'idiom-quick', emoji: '🎯', topic: 'Today\'s idiom - use it in conversation' },
  { type: 'pronunciation', emoji: '🗣️', topic: 'How to say this tricky word correctly' },
  { type: 'expression', emoji: '💬', topic: 'React like a native speaker' },
  { type: 'vocab-pair', emoji: '🔄', topic: 'Two words people always confuse' },
  { type: 'phrase-boost', emoji: '⬆️', topic: 'Say this instead of common words' },
  { type: 'quick-quiz', emoji: '❓', topic: 'Test your English knowledge' },
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
    preview: false,
    model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--preview') {
      options.preview = true;
    } else if (arg === '--model') {
      options.model = String(argv[index + 1] ?? DEFAULT_MODEL);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function pickStoryTopic() {
  const index = pickDeterministicIndex(STORY_TOPICS.length, 19);
  return STORY_TOPICS[index];
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

function fallbackStory(topicObj) {
  const { type, emoji } = topicObj;

  const examples = {
    'vocab-tip': {
      content: `${emoji} Word Power: "Serendipity"

Let's explore this wonderful word together! 💛✨

You know that magical feeling when something amazing happens by pure chance? 🌟 When the universe lines up perfectly without you even planning it? That's exactly what "serendipity" captures! It's not just luck – it's that special, fortunate kind of luck that feels like the universe is winking at you. 😉 But wait – here's the thing that makes it so special: it's not just ANY accident. It's a HAPPY accident! A joyful, life-changing one! 🎉

Think about all those amazing stories of chance meetings, unexpected discoveries, or fortunate timing. That's serendipity in action! ✨ It's the reason people believe in fate and destiny. It's the moment when your life changes for the better without you even trying! 🌈

📌 Meaning:
✅ A happy accident; finding something good by pure chance
✅ That delightful moment when fortune smiles unexpectedly  
✅ Luck combined with happiness and surprise! 🤩
(فارسی): اتفاق خوش، یافتن چیزی خوب به طور تصادفی - یعنی بدون برنامه ریزی اتفاق و خوشبختی!

✍️ Real Examples from Life:
"Meeting you here was pure serendipity! I wasn't even planning to come to this café today." ☕✨
"دیدار با تو اینجا اتفاق خوش محسوب میشه! حتی برنامه‌ای برای اومدن نداشتم"

"My best friend discovered her favorite author completely by serendipity when she picked up a random book at the library and it changed her life!" 📚💫
"بهترین دوستم نویسنده مورد علاقه‌اش رو اتفاقی کشف کرد و این کتاب زندگیش رو تغییر داد!"

"I got this job through pure serendipity – the manager was my friend's cousin, and they randomly met at a wedding!" 🎊💼

💡 Practical Tip: 
Use this word whenever something wonderful happens by accident! 🌈 It's perfect for those jaw-dropping moments when life surprises you in the best way possible. It makes your story sound more magical and sophisticated! ✨ Native speakers LOVE this word! 🗣️

Try using it today in your conversations! 💪😊🎯`,
      quiz: {
        question: '❓ Complete the story: "Finding my lost passport right before my flight was pure ___." Which word fits best?',
        options: [
          'serendipity (lucky chance)',
          'mistake (error)',
          'coincidence (random event)'
        ],
        correctOptionId: 0
      }
    },

    'grammar-hack': {
      content: `${emoji} Grammar Fix: Present Perfect (The Time Confusion!)

Let's clear up this SUPER common mistake! 🎯💡

This is probably one of the most confusing grammar topics ever, right? 😅 Students mess this up ALL the time, and honestly, it's the tense that makes even native speakers pause sometimes! But don't worry – once you understand the simple rule, you'll NEVER mess it up again. 🧠✨ Let me break it down for you in a way that actually makes sense!

Here's the problem: Most students confuse Simple Present with Present Perfect because they both talk about "now" somehow, but they're SO different! 🤯 One is about habits, the other is about duration! One is finished, the other is ongoing! It's like comparing apples to... well, still apples, but apples from DIFFERENT trees! 🍎🍎

Let me show you exactly WHY this matters and when to use each one. Once you get this, you'll understand SO much more English! 📚✨

📌 The Golden Rule:
❌ WRONG: "I live here for 5 years" (This sounds like you just arrived!)
✅ RIGHT: "I've lived here for 5 years" (This means you're STILL here!)
(فارسی): برای مدت طولانی از Present Perfect استفاده کن، نه Simple Present!

Here's WHY: "for 5 years" means an ongoing situation (شروع شده و ادامه داره) – so you need Present Perfect! ⏰ It's like the action started 5 years ago and is STILL happening now! 

✍️ Real Examples from Your Life:
"She's been a doctor for 10 years" = کار پزشکی رو ۱۰ سال کرده (و تا الان ادامه می‌ده!)
❌ NOT: "She works as a doctor for 10 years" 
❌ NOT: "She doesn't work as a doctor for 10 years" 🚫

"They've lived in Paris since 2020" = از ۲۰۲۰ تا الان اونجا زندگی می‌کنند
❌ NOT: "They are living in Paris since 2020" (This doesn't make sense!)
❌ NOT: "They live in Paris since 2020" (Also wrong!) 🙅‍♀️

"I've known him for ages" = او رو سال‌ها می‌شناسم
"I've worked here for 2 years" = ۲ سال اینجا کار می‌کنم

💡 Pro Tip:
Simple Present = Habits/Facts: "I drink coffee every day" ☕
Present Perfect = Duration: "I've drunk 50 cups this month!" 😂☕☕

Or think of it this way:
Present Perfect = Started in the past, still happening NOW ⏳
Simple Past = Finished and done! Completely over! 🏁

Master this now and you'll sound SO much better! 🎯✨`,
      quiz: {
        question: '❓ Choose the CORRECT sentence:',
        options: [
          'I have studied English for 3 years',
          'I study English for 3 years',
          'I studied English for 3 years'
        ],
        correctOptionId: 0
      }
    },

    'idiom-quick': {
      content: `🎯 Idiom of the Day: "Spill the beans"

Let's explore this fun and tasty-sounding expression! 💛✨🫘

You know that moment when a friend finally tells you the secret everyone's been keeping? 🤫 Or when someone accidentally reveals something that was supposed to be kept quiet? 😂 Or maybe you're dying to know gossip and you keep asking "Come on, spill the beans!" 🗣️💬 That's EXACTLY what this idiom means! It's one of those phrases that's so colorful, you can almost imagine someone literally SPILLING BEANS all over the place! 🫘💥

This idiom is EVERYWHERE in casual conversation, movies, TV shows, friend groups – basically anywhere people are talking about secrets! 🎬👯 Native speakers use it constantly when someone reveals a secret or tells someone something confidential! It's playful, friendly, and totally informal! 😄

Here's the funny part: nobody really knows why it's about BEANS! 🤔 Some people think it comes from ancient Greece where people used beans to vote! Others think it's just a funny comparison! But honestly? It SOUNDS funny, which is why people love it! 🎉

📌 Meaning:
✅ To reveal a secret or confidential information  
✅ To tell someone something that was supposed to stay private 🤐
✅ To accidentally or intentionally reveal "the news"
✅ To confess or admit something you were hiding! 🗣️
(فارسی): راز رو فاش کردن، راز خیلی کسی رو بیرون کشیدن، چیزی رو که باید مخفی می‌ماند فاش کردن!

✍️ Real Examples from Everyday Life:
"Okay, I can't hold it anymore – let me spill the beans! I'm getting married!" 💍😍
"دیگه نمی‌تونم پنهان کنم! میخوام بگم که ازدواج می‌کنم!"

"She finally spilled the beans about where the party is going to be." 🎉🗺️
"در آخر فاش کرد کجا مهمونی برگزار می‌شه!"

"Don't spill the beans about the surprise party! It's supposed to be a secret!" 🤫🎁
"لطفاً راز پارتی سورپرایز رو فاش نکن! باید مخفی بمونه!"

Friend 1: "Come on, spill the beans! Who did you go out with last weekend?" 👀
Friend 2: "Okay okay, but you can't tell anyone! I went out with..." 😊

Parents: "If you spill the beans about the vacation, you're grounded!" ✈️😬

💡 Practical Tips:
Use this when someone's keeping a secret and you want them to tell you! 👉 "Spill the beans!" is super casual and friendly! Use it with friends, family, classmates – ANYONE! 😄 It's NOT rude or aggressive – it's playful! 🎉 Teachers even use it with students! "Okay, who's going to spill the beans about what happened in the class yesterday?" 😄

Bonus Usage: You can also say "I'm going to spill the beans" when YOU'RE about to reveal a secret! It's like announcing "I'm about to tell you something juicy!" 📢✨

Start using it with your friends TODAY! They'll think you sound SO natural! 🚀💪`,
      quiz: {
        question: '❓ Complete: "Don\'t ___ about the surprise birthday party! It\'s supposed to be a secret!"',
        options: [
          'spill the beans (reveal the secret)',
          'break the ice (start a conversation)',
          'hit the target (aim correctly)'
        ],
        correctOptionId: 0
      }
    },

    'pronunciation': {
      content: `🗣️ Pronunciation Guide: "Often" (The Secret Silent Letter!)

Let's say this word correctly once and for all! 🎧💡

Oh man, this one trips people up SO much! 😅 Even advanced learners sometimes pronounce this wrong. Even some NATIVE speakers get confused! The funny thing? There's a sneaky SILENT letter hiding in there! 🤫 Let me show you the secret that'll make you sound like a total native speaker! 🌟 You'll be the pronunciation expert among your friends! 🏆

Word history time: English has SO many silent letters because of its weird history with French and Latin! 😄 But that's a lesson for another day!

📌 The Secret (Pay attention!):
✅ Say: OFF-en (The T is SILENT!) 🤐 Like "Austin" without the "Aus"
❌ NOT: OFF-ten (clear T sound – sounds wrong!) 🚫
❌ NOT: O-FEE-ten (definitely NOT – sounds very wrong!) 😂
(فارسی): تلفظ "آفِن" است، نه "آفتِن"! حرف T خاموش است! سلام تا تو!

Here's the cool part: Even though we WRITE the T right there in the word, we DON'T pronounce it! 📝🔇 It's like the letter is just taking a long vacation! 😴✈️ This is SUPER common in English! Many words are like this!

✍️ Example in a real sentence:
"I often go to that coffee shop on weekends with my friends" ☕👯‍♀️
"من اغلب آخر هفته‌ به آن کافه می‌روم"
Listen carefully: OFF-en (not OFF-ten with a clear T!) 👂

Other similar words with SILENT T (you're welcome for this lesson!):
🏰 "Castle" = KASS-ul (not CAST-ul) 🏰
👂 "Listen" = LISS-en (not LIST-en) 👂
⛪ "Glisten" = GLISS-en (not GLIST-en) ✨
💪 "Soften" = SOFT-en (this one has a silent T too!) 🤯
🌆 "Fasten" = FASS-en (not FAST-en!) ⚡

💡 Pro Tip:
Say all these words together: "Often, listen, castle, fasten" and you'll hear the PATTERN! 🎵✨ The T just disappears! Practice now! 🎧😊

Another secret: Many British English speakers actually pronounce the T a little bit sometimes! But Americans typically make it completely silent! So you'll sound great either way! 🌍

Master this and your pronunciation will improve SO much! 🎯😊💪`,
      quiz: {
        question: '❓ Which pronunciation is CORRECT for "often"?',
        options: [
          'OFF-en (silent T like "Austin" without "Aus") 🗣️',
          'OFF-ten (with clear T sound) ❌',
          'O-FEN (one syllable only) ❌'
        ],
        correctOptionId: 0
      }
    },

    'expression': {
      content: `💬 Expression Upgrade: React Like a Native! 🌟✨

Let's sound more natural and impressive! 💯🎉

Here's the thing that nobody tells you – native speakers NEVER say "very good" in normal conversation. 🙅‍♂️ They think it sounds bland, boring, and super basic! 😴 But the minute you upgrade your vocabulary, people think "Wow, this person REALLY knows English!" 🤩 It's like the difference between a regular coffee and a specialty espresso with extra shots! ☕✨ Same concept, TOTALLY different impression! 💪

The crazy part? This is so easy to do! Just a few word replacements and you sound like you studied English for YEARS! 🎓 This is literally a life hack for sounding smarter! 🧠💡

In professional settings, casual conversations, social media, emails – EVERYWHERE – stronger expressions just hit differently! 👀 Your boss will notice! Your teachers will be impressed! Your friends will ask "When did you get so eloquent?" 😄

📌 The Upgrade List (Change Your Life!):
Instead of "very good" → Say "Brilliant!" 🌟
Instead of "nice work" → Say "Fantastic!" 🎉
Instead of "ok" → Say "Outstanding!" 🏆
Instead of "good idea" → Say "Clever approach!" 🧠
Instead of "good job" → Say "Exceptional effort!" 💪
(فارسی): از این لغات قوی‌تر و جالب‌تر استفاده کن! بسیار تاثیرگذار است!

✍️ Real Conversation Examples:
❌ Regular/Boring: "Your presentation was very good"
✅ Native/Impressive: "Your presentation was outstanding! The data visualization was brilliant and your delivery was exceptional!" 🎨✨💬

❌ Meh: "That's a nice plan"
✅ Better: "That's a fantastic plan! Really innovative thinking! I love how you approached this problem!" 🚀💭

❌ Casual: "That outfit is nice"
✅ Much better: "That outfit? Absolutely stunning! You look absolutely amazing! That color suits you perfectly!" 💃✨🎉

❌ Work email (meh): "Good work on the report"
✅ Work email (impressive): "Your report demonstrates exceptional attention to detail and comprehensive analysis. Outstanding work!" 📊🌟

Fun fact: Different English-speaking countries have their FAVORITES! 🌍
🇬🇧🇦🇺 Australians and Brits use "brilliant" for EVERYTHING! They say it constantly! 😄
🇺🇸 Americans love "awesome" and "fantastic!" They use these all day!
🇨🇦 Canadians go for "amazing!" It's their go-to word!
🇮🇪 Irish speakers use "grand" for pretty much everything! 😄

💡 Pro Tip:
Watch your favorite English shows and notice HOW they praise things – you'll spot these words constantly! 📺✨ Your vocabulary will level up automatically! 🎯 Netflix is basically a free English school! 🎬

Start using these TODAY and watch how people react! They'll be impressed! 💪🎉`,
      quiz: {
        question: '❓ Which response sounds most NATIVE from a professional in a formal meeting?',
        options: [
          'Your presentation was very good',
          'Outstanding! The research was thorough, visuals compelling, delivery exceptional! 🌟',
          'Your presentation was nice'
        ],
        correctOptionId: 1
      }
    },

    'vocab-pair': {
      content: `🔄 Confusing Pair: Affect vs. Effect (The A-E Battle!)

Let me solve this FOREVER! 💡🎯✨

Oh boy, this one haunts English learners like a ghost in a spooky mansion! 👻 Even people who use English every single day sometimes pause and think "Wait... is it A or E?" 🤔 Even NATIVE speakers hesitate! But here's the good news – there's a SUPER easy trick to remember! ✨ A memory device that's so simple, you'll never forget it again! 🧠

Here's why people get confused: The words sound ALMOST the same! 😄 They're spelled almost identically! The only difference is ONE letter! So your brain gets confused and randomly picks one! 🎲 But we're about to fix that forever!

I'm going to teach you a trick that's SO simple, you'll never mess this up again. Ready? 🎯

📌 The Simple Trick (SO EASY!):
AFFECT = Verb = Action (A=Action!) 🎬 ← Remember: A for Action!
EFFECT = Noun = End result (E=End!) 🎯 ← Remember: E for End!
(فارسی): Affect = فعل (تاثیر گذاشتن) / Effect = اسم (نتیجه، اثر)

Memory device: A-ffect = A-ction (both start with A!) 🔤
E-ffect = E-nd result (both start with E!) 🔤

It's that simple! This is the only thing you need to remember! 🎉

✍️ REAL Examples (You'll see these every day):
"The rain AFFECTS my mood" (rain = does the action) ☔→😞
The verb "affects" shows that rain is DOING something to your mood!

"The effect was DRAMATIC" (we're talking about the end result) 🎭
The noun "effect" = the result of what happened!

"How does stress affect your health?" ❌ is WRONG? NO! It's right! ✅
(stress = doing the action = verb)

"Stress has a HUGE negative EFFECT on our concentration" ✅ (end result = noun) 🧠

"Bad weather can affect the soccer game tomorrow" ⚽ (action verb)
"Weather effects can appear suddenly" - NO! It's "Weather's EFFECTS can appear suddenly" ✅ (noun!)

Pro Examples that confuse EVERYONE:
❌ "This medicine effects are amazing" (WRONG – effects is not a verb here!)
✅ "This medicine affects me positively" (RIGHT – affects = action verb) 💊
✅ "The effects of this medicine are amazing" (RIGHT – effects = end results) 🏥

❌ "The new policy will effect our sales" (Most people get this wrong!)
✅ "The new policy will affect our sales" (This is correct!) 📈

💡 Bonus Trick (Make it stick!):
Say this rhyme out loud: "AFFECT the action, EFFECT is the end! This pair won't confuse you again!" 🎵✨
Write it on a sticky note! 📝 Put it on your mirror! 🪞 Tell your friends! 👯 Make it a meme in your head! 😄

One more thing: "Effect" has a RARE verb form: "to effect change" (meaning to MAKE change happen) 👉 But 99% of the time, you'll use "affect" for the verb!

Master this TODAY and you'll never mess up again! 🎉💪`,
      quiz: {
        question: '❓ Fill the blank correctly: "Lack of sleep can seriously _____ your grades and test performance."',
        options: [
          'affect (verb – doing something)',
          'effect (noun – end result)',
          'afect (neither – just wrong!)'
        ],
        correctOptionId: 0
      }
    },

    'phrase-boost': {
      content: `📈 Professional Language: Level Up Your Career! 💼✨🚀

Sound like a boss and actually become one! 👔🌟💪

You know that moment in a meeting when your colleague says something and EVERYONE nods like "Wow, that person is SMART!"? 🤓 "Wow, I want to listen to them!" 👂 Guess what? They probably just used better vocabulary! 😄 It's literally that simple! In business environments, your word choice matters MORE than you think! 📊 Using strong, professional language can literally help you get promoted! 🚀 It's not magic – it's just smart communication! 💬

Think about it this way: Would you be more impressed by someone who says "good idea" or someone who says "That's an innovative solution that demonstrates strategic thinking"? 🧠✨ Same idea, but the second person sounds like a LEADER! 👑

This is your secret weapon for standing out in meetings, emails, presentations, and conversations! 💥

📌 The Replacements (Game Changers!):
❌ "Very good" → ✅ "Exceptional" (5 stars!) ⭐⭐⭐⭐⭐
❌ "Nice work" → ✅ "Impressive effort" 💪
❌ "Good idea" → ✅ "Innovative approach" 🧠💡
❌ "Worked hard" → ✅ "Demonstrated remarkable dedication" 🏆
❌ "Good result" → ✅ "Excellent outcome" 🎯
❌ "Understood" → ✅ "Grasped the concept" 📚
(فارسی): از واژگان حرفه‌ای‌تر استفاده کن! تاثیر بسیاری دارد!

✍️ Before & After Examples (See the DIFFERENCE!):

BEFORE: "That was very good work"  
AFTER: "Your analysis demonstrates exceptional attention to detail and shows strong strategic thinking!" 📊✨

BEFORE: "Nice presentation"  
AFTER: "Your presentation was articulate, well-researched, and engaged the audience brilliantly! The visual aids were compelling!" 🎤🎨🌟

BEFORE: "Good job on the project"  
AFTER: "This project showcases your technical acumen, creative problem-solving skills, and ability to deliver under pressure!" 🔧🎯💼

BEFORE: "You're good at your job"
AFTER: "Your professional expertise and consistent contribution to the team's success have not gone unnoticed!" 👑✨

Real workplace scenarios where this MATTERS:
💼 In emails: "Your contribution was exceptional" > "Your contribution was good"
📞 In calls: "That's an innovative solution" > "That's a nice solution"
🤝 In meetings: "Outstanding progress on the timeline" > "Good progress"
📄 In reports: "Demonstrates significant improvement" > "Much better than before"
🎯 In interviews: "I bring strategic thinking and measurable results" > "I'm good at what I do"

The CRAZY part: Native speakers in professional settings use these words CONSTANTLY! 💬 The more you use them, the more natural they sound! Your boss will notice! Your colleagues will be impressed! Your salary review might even be affected! 💰 This is literally a career hack! 🎯

💡 Pro Tip:
Listen to TED Talks, podcasts, business news – these speakers use these words ALL the time! 🎧 Absorb them! Use them! Make them part of your vocabulary! Your brain will start using them automatically! 🧠✨

Start implementing TODAY and watch your career transformation! 📈💪🚀`,
      quiz: {
        question: '❓ Which sounds most professional in a work email?',
        options: [
          'Your report was very good',
          'Exceptional work! Meticulous research, innovative thinking, comprehensive analysis! 🌟',
          'Your report was nice'
        ],
        correctOptionId: 1
      }
    },

    'quick-quiz': {
      content: `🧠 Grammar Guide: "Used to" vs "Would" (Past Habits Explained!)

This one confuses SO many students! Let's fix it forever! 🎯✨🧠

Okay, here's the frustrating part: "used to" and "would" BOTH talk about past habits! 😅 They sound similar, they mean similar things... but there are sneaky differences! 🤔 Native speakers use them differently in specific situations, and when you use the wrong one, it sounds off! 👂 But don't worry – the rule is actually SO simple once you understand it! 💡

Here's what trips people up: Both phrases describe repeated actions in the past! ⏰ Both feel like "something I did a lot back then!" Both are used in storytelling! So your brain gets confused! 🤯 But here's the SECRET: they're NOT exactly interchangeable! There are specific moments where you HAVE to use one or the other!

The crazy part? Most learners don't even realize there's a difference! 😄 But native speakers are VERY particular about which one they use! Once you learn this, you'll notice native speakers using these correctly ALL the time!

📌 The Key Difference (Write this down!):
"USED TO" = A past habit that NO LONGER happens (it stopped!) 🛑
"WOULD" = A past habit you SOMETIMES did for entertainment/pleasure 😄
(فارسی): Used to = عادتی که دیگه انجام نمی‌دی / Would = عادتی که گاهی انجام می‌دادی

❌ WRONG: "When I was young, I would live in Paris" (NO! This is weird!)
✅ RIGHT: "When I was young, I used to live in Paris" (YES! ✓ Finished habit!)

Why? Because LIVING somewhere is a STATE (not an action you CHOSE to do), so you use "used to," not "would"! 

"WOULD" is for things you DID by choice repeatedly:
✅ "When I was 10, I would play basketball every day after school" ⚽ (your choice!)
✅ "She would always visit her grandmother on weekends" 👵 (repeated action)
❌ NOT: "She would live with her grandmother" (living = state, not chosen action)

✍️ Real Examples (Listen to the difference!):
"I used to be frustrated with grammar, but now I understand!" 😊
"من قبلاً با گرامر خیلی ناامید بودم، ولی حالا می‌فهمم!"
(This habit completely changed – use "used to")

"When I was in university, I would study at the library every night." 📚
"وقتی دانشجو بودم، هر شب تو کتابخانه درس می‌خوندم."
(A repeated action you chose to do regularly – use "would")

"I would often take a walk in that park" ✓ (repeated leisure activity)
"من معمولاً در آن پارک قدم می‌زدم"
vs.
"I used to live near that park" ✓ (permanent situation that changed)
"من قبلاً نزدیک آن پارک زندگی می‌کردم"

Pro tip: Think of it this way:
✅ "USED TO" = something was TRUE about your past life (the state/situation)
✅ "WOULD" = something you REPEATEDLY CHOSE to do (the action)

Other examples:
"I used to have curly hair" ✓ (state that changed – use "used to")
"I used to work at a coffee shop" ✓ (job that changed – use "used to")
"I would go to the beach every summer" ✓ (action you chose repeatedly – use "would")

💡 Pro Tip:
If you can say "I DON'T anymore" – use "USED TO"! 🛑
If you can say "I DID THIS repeatedly for fun" – use "WOULD"! 😄

Master this and you'll sound like a NATIVE speaker! 🎯💪✨`,
      quiz: {
        question: '❓ Which is CORRECT? "When I was young, I _____ play video games every day."',
        options: [
          'would play (repeated action you chose) ✓',
          'used to play (permanent states only)',
          'Both are exactly the same'
        ],
        correctOptionId: 0
      }
    },
  };

  const storyData = examples[type] || {
    content: `${emoji} English Tip of the Day

Let's learn something new together! 💡✨🎓

📌 Today's Focus:
Master one concept at a time! Each tip makes you smarter! 🧠📚 You're building your English skills brick by brick! Each lesson is a stepping stone to fluency! 🌉

We're building your English skills one word at a time! 💪 Every little tip counts! 🎯 Every concept you learn brings you closer to fluency! You're doing AMAZING! 🌟

Stay tuned for more incredible tips! 🚀😊💫`,
    quiz: {
      question: '❓ Are you enjoying these daily English tips?',
      options: ['Yes! I love them! 🎉', 'Very much! Keep them coming! 💪', 'Extremely helpful! Amazing! 🌟'],
      correctOptionId: 0
    }
  };

  return storyData;
}

async function generateStoryWithOpenAI(topicObj, apiKey, model) {
  if (!apiKey) {
    console.log('[info] No OPENAI_API_KEY, using fallback story');
    return fallbackStory(topicObj);
  }

  const { type, emoji, topic } = topicObj;

  const prompt = `You are an engaging, funny, and knowledgeable English language coach creating LONG-FORM Telegram stories with personality!

Topic: ${topic}
Type: ${type}
Emoji to start with: ${emoji}

IMPORTANT: Create responses 4+ times longer than before with detailed paragraphs, fun/funny emojis sprinkled throughout, and conversational depth!

Create a response as VALID JSON:
{
  "content": "long, detailed story with multiple paragraphs",
  "quiz": {
    "question": "quiz question",
    "options": ["option1", "option2", "option3"],
    "correctOptionId": 0
  }
}

CONTENT GUIDELINES (NOW MUCH LONGER AND FUNNIER):
1. Start with emoji and engaging hook with personality
2. Add 2-3 introductory paragraphs explaining WHY this matters, common mistakes people make, fun facts
3. Include "Meaning:" section with English + Persian translation
4. Include detailed "Example:" section with multiple realistic scenarios
5. Add tips/tricks section with personality and humor
6. Add context about how natives use this
7. Sprinkle LOTS of fun/funny emojis throughout (🤪😂🎉😅😄👏🔥💫🌟⭐✨🎊🎈)
8. Use humor naturally ("like comparing apples to... still apples" style)
9. Include relatable scenarios and personal touches
10. Total: 500-700 words minimum
11. Conversational, warm, encouraging tone
12. Make paragraphs substantial (3-4 sentences each)

QUIZ GUIDELINES (CONTEXTUAL):
1. Embed the word/phrase in realistic situations
2. Fill-in-the-blank format when possible
3. 3 plausible options that teach
4. correctOptionId = array index (0, 1, or 2)

Return ONLY valid JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You create long-form, engaging, funny, conversational English learning content with Persian. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1400,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[openai-error]', JSON.stringify(data, null, 2));
      return fallbackStory(topicObj);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return fallbackStory(topicObj);
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed.content && parsed.quiz) {
        return parsed;
      }
    } catch {
      // Fallback if not JSON
    }

    return fallbackStory(topicObj);
  } catch (error) {
    console.error('[fetch-error]', error.message);
    return fallbackStory(topicObj);
  }
}

async function telegramRequest(botToken, method, payload) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }

  return data;
}

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function resolveStoryActivePeriod(rawValue) {
  const allowed = new Set([21600, 43200, 86400, 172800]);
  const fallback = 86400;
  const parsed = Number.parseInt(String(rawValue ?? fallback), 10);
  if (!Number.isFinite(parsed) || !allowed.has(parsed)) {
    return fallback;
  }
  return parsed;
}

function truncateByCodePoints(value, maxLength) {
  const chars = Array.from(String(value ?? ''));
  if (chars.length <= maxLength) {
    return chars.join('');
  }
  return `${chars.slice(0, maxLength - 1).join('')}…`;
}

function toStoryCaption(htmlText) {
  const normalized = normalizeForDedupe(String(htmlText ?? ''));
  return truncateByCodePoints(normalized, 2048);
}

function resolveStoryMedia() {
  const storyPhotoUrl = (process.env.TELEGRAM_STORY_PHOTO_URL ?? '').trim();
  const storyVideoUrl = (process.env.TELEGRAM_STORY_VIDEO_URL ?? '').trim();

  if (storyPhotoUrl) {
    return { type: 'photo', photo: storyPhotoUrl };
  }

  if (storyVideoUrl) {
    return { type: 'video', video: storyVideoUrl };
  }

  return null;
}

async function postBusinessStory(botToken, story) {
  const businessConnectionId = (process.env.TELEGRAM_BUSINESS_CONNECTION_ID ?? '').trim();
  const media = resolveStoryMedia();

  if (!businessConnectionId || !media) {
    return { skipped: true };
  }

  const activePeriod = resolveStoryActivePeriod(process.env.TELEGRAM_STORY_ACTIVE_PERIOD);
  const postToChatPage = parseBooleanEnv(process.env.TELEGRAM_STORY_POST_TO_CHAT_PAGE, true);
  const protectContent = parseBooleanEnv(process.env.TELEGRAM_STORY_PROTECT_CONTENT, false);
  const caption = toStoryCaption(story.content);

  console.log('[posting] Telegram Business story...');
  const storyResult = await telegramRequest(botToken, 'postStory', {
    business_connection_id: businessConnectionId,
    content: media,
    active_period: activePeriod,
    caption,
    parse_mode: 'HTML',
    post_to_chat_page: postToChatPage,
    protect_content: protectContent,
  });

  console.log('[success] Story posted: story ID', storyResult.result?.id);
  return { storyResult };
}

async function postStoryAsChannelPost(botToken, chatId, story) {
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL ?? '';
  const publicSlug = resolvePublicChannelSlug(channelUrl, chatId);
  const existingTexts = await fetchRecentChannelTexts(publicSlug);
  const normalizedContent = normalizeForDedupe(story.content);

  if (existingTexts.includes(normalizedContent)) {
    console.log('[skip] Duplicate story detected in recent channel posts. Skipping publish.');
    return { skipped: true };
  }

  console.log('[posting] Main content to Telegram...');
  const contentResult = await telegramRequest(botToken, 'sendMessage', {
    chat_id: chatId,
    text: story.content,
    disable_web_page_preview: true,
    parse_mode: 'HTML',
  });
  console.log('[success] Content posted: message ID', contentResult.result?.message_id);

  console.log('[posting] Quiz poll to Telegram...');
  const quizResult = await telegramRequest(botToken, 'sendPoll', {
    chat_id: chatId,
    question: story.quiz.question,
    options: story.quiz.options,
    is_quiz: true,
    correct_option_id: story.quiz.correctOptionId,
    allows_multiple_answers: false,
  });
  console.log('[success] Quiz posted: message ID', quizResult.result?.message_id);

  return { contentResult, quizResult };
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
    kind: 'story',
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

async function main() {
  await loadEnvFiles();

  const options = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const fallbackToChannelPost = parseBooleanEnv(process.env.TELEGRAM_STORY_FALLBACK_TO_POST, false);
  const businessConnectionId = (process.env.TELEGRAM_BUSINESS_CONNECTION_ID ?? '').trim();
  const hasStoryMedia = Boolean(resolveStoryMedia());
  const canPostTrueStory = Boolean(businessConnectionId && hasStoryMedia);
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL ?? '';
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);

  if (!options.dryRun && !options.preview && !botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }

  if (!options.dryRun && !options.preview && fallbackToChannelPost && !chatId) {
    throw new Error('Missing target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL) for fallback channel posting');
  }

  const topicObj = pickStoryTopic();
  console.log(`[topic] ${topicObj.type}: ${topicObj.topic}`);

  const story = await generateStoryWithOpenAI(topicObj, apiKey, options.model);

  if (options.preview) {
    const mode = canPostTrueStory ? 'telegram-business-story' : (fallbackToChannelPost ? 'channel-post-fallback' : 'disabled-no-story-config');
    console.log('\n' + '='.repeat(70));
    console.log(`MODE: ${mode}`);
    console.log('STORY PREVIEW - CONTENT');
    console.log('='.repeat(70));
    console.log(story.content);
    console.log('\n' + '='.repeat(70));
    console.log('STORY PREVIEW - QUIZ');
    console.log('='.repeat(70));
    console.log(`Question: ${story.quiz.question}`);
    story.quiz.options.forEach((opt, idx) => {
      const marker = idx === story.quiz.correctOptionId ? '✅' : '  ';
      console.log(`  ${marker} ${String.fromCharCode(65 + idx)}) ${opt}`);
    });
    console.log('='.repeat(70) + '\n');
    return;
  }

  if (options.dryRun) {
    const mode = canPostTrueStory ? 'telegram-business-story' : (fallbackToChannelPost ? 'channel-post-fallback' : 'disabled-no-story-config');
    console.log(`[dry-run] Mode: ${mode}`);
    console.log('[dry-run] Would post story:');
    console.log('\nCONTENT:');
    console.log(story.content);
    console.log('\nQUIZ:');
    console.log(`Question: ${story.quiz.question}`);
    story.quiz.options.forEach((opt, idx) => {
      console.log(`  ${String.fromCharCode(65 + idx)}) ${opt}`);
    });
    return;
  }

  const historyFilePath = resolveHistoryFilePath();
  const history = await loadPostHistory(historyFilePath);
  const storyFingerprint = createContentFingerprint(story.content);
  console.log(`[dedup] Story fingerprint: ${storyFingerprint.slice(0, 12)}... | History size: ${history.items?.length ?? 0} items`);
  if (hasFingerprint(history, storyFingerprint)) {
    console.log('[skip] Duplicate story found in persistent history. Skipping publish.');
    return;
  }
  console.log('[post] Story is unique. Proceeding with post.');

  if (!canPostTrueStory && !fallbackToChannelPost) {
    console.log('[skip] Story scheduler is configured to avoid channel posts and true story settings are missing.');
    console.log('[hint] Set TELEGRAM_BUSINESS_CONNECTION_ID + TELEGRAM_STORY_PHOTO_URL (or TELEGRAM_STORY_VIDEO_URL) to publish true Telegram Stories.');
    console.log('[hint] Or set TELEGRAM_STORY_FALLBACK_TO_POST=true to keep old channel post behavior.');
    return;
  }

  const result = canPostTrueStory
    ? await postBusinessStory(botToken, story)
    : await postStoryAsChannelPost(botToken, chatId, story);

  if (result?.skipped) {
    console.log('[skip] Story settings are incomplete for true Telegram Stories.');
    console.log('[hint] Set TELEGRAM_BUSINESS_CONNECTION_ID + TELEGRAM_STORY_PHOTO_URL (or TELEGRAM_STORY_VIDEO_URL).');
    return;
  }

  rememberFingerprint(history, storyFingerprint, { topic: topicObj.topic });
  await savePostHistory(historyFilePath, history);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
