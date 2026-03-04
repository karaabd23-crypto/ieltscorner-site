#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';

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
  const index = Math.floor(Math.random() * STORY_TOPICS.length);
  return STORY_TOPICS[index];
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
      content: `🎯 Idiom of the Day: "Hit the nail on the head"

Let's explore this powerful expression! 💛✨🔨

You know that amazing feeling when someone says EXACTLY what you were thinking? 🤯 When they nail it on the first try and you're like "YES, EXACTLY! That's it!" 🎉 When they identify the REAL problem that nobody else saw? That's what this idiom is all about! 🏆

It's one of those phrases that native speakers use constantly in conversations, meetings, negotiations – EVERYWHERE! 💬 And when YOU say it correctly at the right moment, you instantly sound smarter! 😄 Your friends will be like "Wow, did she just use that phrase correctly?" 🌟

Here's the beauty of this idiom: it's visual! 🔨 You can picture a hammer hitting a nail perfectly straight – BAM! It goes right where it's supposed to go! That's exactly what it means when someone "hits the nail on the head!" ✨

📌 Meaning:
✅ To say something that is exactly right or correct  
✅ To identify the main problem/issue perfectly 🎯
✅ To make an accurate observation that nobody else made
✅ To find the solution that was hiding in plain sight! 💡
(فارسی): دقیقاً درست بودن، حق گفتن، صحیح دریافتن، دقیق تشخیص دادن

✍️ Real Examples from Work/Life:
"Your analysis really hit the nail on the head! You understood our main problem perfectly!" 🏆
"تجزیه‌تحلیل تو کاملاً صحیح بود! مشکل اصلی رو کاملاً فهمیدی!"

"When she said the project would fail because we didn't have enough budget, she really hit the nail on the head – it did fail for exactly that reason!" 😅📉
"وقتی گفت پروژه شکست می‌خورد چون بودجه‌مون کافی نیست، تماماً حق گفت!"

"The teacher hit the nail on the head when she said most students didn't understand the concept because they missed the fundamentals!" 🎓✨

"He hit the nail on the head with his observation about why customers are leaving – it's our customer service!" 📞💔

💡 Practical Tip:
Use this when someone makes an insightful observation or solves a mystery! 🔍 It's a GREAT compliment in professional settings AND casual conversations. Teachers LOVE when students use it correctly! Your boss will notice! 👉✨ It shows you appreciate accuracy and smart thinking! 🧠

Try it today in a meeting or conversation! 🚀😊💪`,
      quiz: {
        question: '❓ Complete: "When she predicted the company would struggle with growth, she really ___ because that\'s exactly what happened."',
        options: [
          'hit the nail on the head',
          'broke the ice',
          'let the cat out of the bag'
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
          'OFF-en (silent T) – like "Austin" without "Aus"',
          'OFF-ten (clear T sound) – definitely wrong!',
          'O-FEN (one syllable) – nope!'
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
          'Your presentation was outstanding – the research was thorough, the visuals were compelling, and your delivery was exceptional',
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
          'Your report demonstrates meticulous research, innovative thinking, and comprehensive analysis – truly exceptional work',
          'Your report was nice'
        ],
        correctOptionId: 1
      }
    },

    'quick-quiz': {
      content: `🧠 Test Your Knowledge: Past Tenses (The Tricky Timing!)

Let's test what you've learned! 🎯✨🎓

Timing is EVERYTHING in English! ⏰ One tiny word can change EVERYTHING! 😅 This is why ESL students love to trip up on past tenses – the rules seem simple until reality hits! 💥 But if you understand the REASON behind the rule, you'll never make the mistake again! 🎓 You'll be a grammar master! 👑

This is seriously important because native speakers can TELL immediately when someone uses the wrong tense! 👂 They notice! It's like nails on a chalkboard for them! 😬 But don't worry – once you get this, you'll understand SO much more English!

Here's the thing: Timing words are KEY! 🔑 Specific time = Simple Past. Open-ended time = Present Perfect. That's it! That's the whole rule! Simple, right? 🎯

📌 The Golden Rule (Write this down!):
With specific past time → Use Simple Past 🕐
With open-ended/ongoing → Use Present Perfect ⏳
(فارسی): با زمان‌های مشخص گذشته از Simple Past استفاده کن
با زمان‌های نامشخص یا ادامه‌دار از Present Perfect استفاده کن

❌ WRONG: "I have been to Paris last year" (NOPE! 🙅 Last year = finished!)
✅ RIGHT: "I went to Paris last year" (YES! ✓ Specific time = Simple Past!)

Why? Because "last year" = a finished time period! It's done! ✅ Completed! Finished! Kaput! 🏁 Over and done with! The year passed! So use Simple Past!

✍️ More Real Examples (Starting to make sense?):
❌ "I have visited Japan last summer" – NO! Summer is over! Finished! 🙅
✅ "I visited Japan last summer" – YES! Specific time = Simple Past! ✓ 🌞

❌ "She has written the email yesterday" – WRONG! Yesterday is specific!
✅ "She wrote the email yesterday" – RIGHT! Yesterday = finished day! ✓

❌ "I have lived here in 2020" – Wrong timing!
✅ "I lived here in 2020" – Right! Specific year! ✓

✅ BUT: "I have lived here SINCE 2020" – YES! Still living there! Ongoing! ⏳

✅ AND: "I have lived here FOR 6 years" – YES! Still happening! ⏳

💡 The Key Difference (This is important!):
"I visited Paris" vs "I've been to Paris" 🤔
- "I visited" = Specific past (when? sometime, somewhere)
- "I've been" = Anytime in my life! General experience! 🌍

Same destination, TOTALLY DIFFERENT emphasis! 📍

Other examples:
"I saw that movie yesterday" ✓ (specific day)
"I've seen that movie" ✓ (sometime, not sure when)

"They ate lunch at noon" ✓ (specific time)
"They've eaten lunch already" ✓ (finished, but not sure when)

Pro tip: Listen to how natives talk – you'll hear "I went to..." WAY more than "I have been to..." when talking about specific past events! 🎧✨ Just LISTEN to native speakers and your brain will start picking up the pattern!

You've got this! Time to test yourself! 🚀💪🎯`,
      quiz: {
        question: '❓ Which sentence uses the CORRECT past tense?',
        options: [
          'I have visited the Eiffel Tower last week (WRONG – last week is finished!)',
          'I visited the Eiffel Tower last week (RIGHT – specific time!)',
          'I have visited the Eiffel Tower since last week (WRONG – doesn\'t make sense!)'
        ],
        correctOptionId: 1
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

async function postStory(botToken, chatId, story) {
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

async function main() {
  await loadEnvFiles();

  const options = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const chatId = process.env.TELEGRAM_CHAT_ID ?? '';

  if (!options.dryRun && !options.preview && !botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }

  if (!options.dryRun && !options.preview && !chatId) {
    throw new Error('Missing TELEGRAM_CHAT_ID');
  }

  const topicObj = pickStoryTopic();
  console.log(`[topic] ${topicObj.type}: ${topicObj.topic}`);

  const story = await generateStoryWithOpenAI(topicObj, apiKey, options.model);

  if (options.preview) {
    console.log('\n' + '='.repeat(70));
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

  await postStory(botToken, chatId, story);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
