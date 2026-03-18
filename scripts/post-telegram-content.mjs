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

const SITE_URL = 'https://ieltscorner.ca';
const CHANNEL_URL = 'https://t.me/kaysenglishcorner';

const FOOTER_LINES = [
  '🌈✨ Kay\'s English Corner 🇨🇦',
  'Your Gateway to English Success',
  '🌐 More lessons: https://ieltscorner.ca',
  '🧑‍🏫 Tutoring | ✍️ Writing feedback: https://ieltscorner.ca/tutoring | https://ieltscorner.ca/essay-correction',
];

const CHANNEL_TOPICS = [
  {
    id: 'both-either-neither',
    lessonSlugs: ['both-either-neither-b2'],
    hashtags: ['#Grammar', '#CELPIP', '#B2English'],
    lesson: {
      title: '🔎 Grammar Fix: both, either, neither',
      lines: [
        'When your sentence is about 2 people or 2 choices, these 3 words do different jobs 👇',
        '',
        'Example situation:',
        'You are talking about two job options, two people, or two answers.',
        '',
        '✅ both = هر دو',
        '👉 either = یکی از دوتا',
        '🚫 neither = هیچ‌کدوم از دوتا',
        '',
        '❌ Both the teacher and the students was ready on time.',
        '✅ Both the teacher and the students were ready on time.',
        '',
        '💡 Quick rule:',
        'After both A and B, the verb is usually plural.',
        '',
        '✅ Both my brother and my sister live in Calgary.',
        '✅ Either answer is fine.',
        '✅ Neither option works for me.',
        '',
        '📌 Where this helps:',
        'very common in speaking, email writing, and opinion sentences with 2 options.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'both یعنی "هر دو". either یعنی "یکی از دوتا". neither یعنی "هیچ‌کدوم".',
        'توی both A and B معمولا فعل جمع میاد.',
        '',
        '🎯 Your turn:',
        'Write one sentence with both and one with neither.',
      ],
      quiz: {
        question: 'Which sentence is correct?',
        options: [
          'Both the teacher and the students was ready.',
          'Both the teacher and the students were ready.',
          'Neither options are good.',
        ],
        correctIndex: 1,
        explanation: 'With both A and B, the verb is usually plural.',
      },
    },
    mini: {
      title: '⚡ Quick Grammar: both / either / neither',
      lines: [
        'Two choices? Two people? Start here 👇',
        '',
        '👀 Mini scene:',
        'Either day is fine for me, but neither time works.',
        '',
        '✅ Easy map:',
        'both = هر دو',
        'either = یکی از دوتا',
        'neither = هیچ‌کدوم',
        '',
        '🇮🇷 فارسی کوتاه:',
        'وقتی دو تا گزینه داری، اول معنی جمله رو مشخص کن.',
        'ببین منظورت هر دو تاست، یکی از دوتاست، یا هیچ‌کدوم.',
        '',
        '🎯 Mini challenge:',
        'Make a sentence with either.',
      ],
      quiz: {
        question: 'What does neither mean?',
        options: ['Both of them', 'One of the two', 'Not this one and not that one'],
        correctIndex: 2,
        explanation: 'Neither means not one and not the other.',
      },
    },
  },
  {
    id: 'few-a-few-little-a-little',
    lessonSlugs: ['few-a-few-little-a-little'],
    hashtags: ['#Grammar', '#LearnEnglish', '#B1English'],
    lesson: {
      title: '🔎 Grammar Fix: few / a few / little / a little',
      lines: [
        'When you talk about small quantities, this tiny difference changes the whole feeling 👇',
        '',
        'This comes up a lot with time, money, friends, and chances.',
        '',
        'a few = some, enough',
        'few = almost none',
        'a little = some, enough',
        'little = almost none',
        '',
        '✅ I have a few friends here, so I feel okay.',
        '❌ I have few friends here. (This sounds negative.)',
        '',
        '✅ I have a little time before class.',
        '❌ I have little time today. (Almost no time.)',
        '',
        '📌 Where this helps:',
        'IELTS and CELPIP writing often needs careful quantity words.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'a few / a little یعنی "یه مقدار هست".',
        'few / little یعنی "خیلی کمه، تقریبا هیچی".',
        'اون a کوچیک، حس جمله رو عوض می‌کنه.',
        '',
        '🎯 Your turn:',
        'Write one sentence with a few and one with little.',
      ],
      quiz: {
        question: 'Which one sounds more positive?',
        options: ['few friends', 'a few friends', 'little time'],
        correctIndex: 1,
        explanation: 'a few sounds positive because it means some, enough.',
      },
    },
    mini: {
      title: '⚡ Quick Grammar: the tiny a matters',
      lines: [
        'This is for quantity words like time, money, and friends 👇',
        '',
        '👀 Look at this:',
        'a few friends = some friends',
        'few friends = almost no friends',
        '',
        '✅ Quick feeling:',
        'a few / a little = some',
        'few / little = almost none',
        '',
        '🇮🇷 فارسی کوتاه:',
        'اون a کوچیک خیلی مهمه.',
        'با a، حس جمله معمولا بهتره. بدون a، کمبود رو می‌رسونه.',
        '',
        '🎯 Mini challenge:',
        'Make a sentence with a little.',
      ],
      quiz: {
        question: 'Which means almost no time?',
        options: ['a little time', 'little time', 'a few time'],
        correctIndex: 1,
        explanation: 'little time means almost no time.',
      },
    },
  },
  {
    id: 'should-base-verb',
    lessonSlugs: ['should-for-advice'],
    hashtags: ['#Grammar', '#DailyEnglish', '#B1English'],
    lesson: {
      title: '🔎 Grammar Fix: should + base verb',
      lines: [
        'When you give advice in English, this is one of the most common mistakes 👇',
        '',
        'You hear this in daily English, emails, and speaking tests all the time.',
        '',
        '❌ You should to call them.',
        '✅ You should call them.',
        '',
        '💡 Rule:',
        'After should, use the base verb.',
        'should go / should wait / should ask',
        '',
        '✅ You should check the address first.',
        '✅ He should call the clinic before he goes.',
        '',
        '📌 Where this helps:',
        'advice, suggestions, and recommendations in speaking and writing.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'بعد از should، فعل ساده میاد.',
        'نه to می‌ذاریم، نه ing.',
        'مثلا: should study / should ask',
        '',
        '🎯 Your turn:',
        'Write one sentence with should about tomorrow.',
      ],
      quiz: {
        question: 'Which one is correct?',
        options: ['You should to wait.', 'You should waiting.', 'You should wait.'],
        correctIndex: 2,
        explanation: 'After should, use the base verb.',
      },
    },
    mini: {
      title: '⚡ Quick Grammar: after should',
      lines: [
        'Giving advice? Keep this pattern in your head 👇',
        '',
        '✅ should call',
        '❌ should to call',
        '',
        '🇮🇷 فارسی کوتاه:',
        'بعد از should فقط فعل ساده میاد.',
        'مثلا should wait / should ask',
        '',
        '🎯 Mini challenge:',
        'Make one sentence with should.',
      ],
      quiz: {
        question: 'What comes after should?',
        options: ['to + verb', 'verb-ing', 'base verb'],
        correctIndex: 2,
        explanation: 'Use the base verb after should.',
      },
    },
  },
  {
    id: 'borrow-vs-lend',
    lessonSlugs: [],
    hashtags: ['#Vocabulary', '#LearnEnglish', '#DailyEnglish'],
    lesson: {
      title: '🔄 Useful English: borrow vs lend',
      lines: [
        'At school, work, or with friends, this pair comes up all the time 👇',
        '',
        'The situation is the same. The direction changes.',
        '',
        'borrow = take and use for a short time',
        'lend = give to someone for a short time',
        '',
        '✅ Can I borrow your charger?',
        '✅ I can lend you mine.',
        '❌ Can you borrow me your charger?',
        '',
        '📌 Easy way to remember it:',
        'If it comes to you, borrow.',
        'If it goes from you to another person, lend.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'اگه داری می‌گیری borrow.',
        'اگه داری می‌دی lend.',
        'یعنی جهت حرکت وسیله مهمه.',
        '',
        '🎯 Your turn:',
        'Write one question with borrow and one offer with lend.',
      ],
      quiz: {
        question: 'If I give you my book for a day, what do I do?',
        options: ['borrow', 'lend', 'rent'],
        correctIndex: 1,
        explanation: 'If you give it, you lend it.',
      },
    },
    mini: {
      title: '🔑 Word Power: borrow or lend?',
      lines: [
        'One person gives it. One person receives it. That is the whole difference 👇',
        '',
        'You receive it = borrow',
        'You give it = lend',
        '',
        '🇮🇷 فارسی کوتاه:',
        'گرفتن = borrow',
        'دادن = lend',
        'پس اول ببین وسیله داره به سمت تو میاد یا از تو می‌ره.',
        '',
        '🎯 Mini challenge:',
        'Make one sentence with borrow.',
      ],
      quiz: {
        question: 'Which means گرفتن؟',
        options: ['borrow', 'lend', 'return'],
        correctIndex: 0,
        explanation: 'borrow means گرفتن.',
      },
    },
  },
  {
    id: 'make-vs-do',
    lessonSlugs: [],
    hashtags: ['#Vocabulary', '#WorkEnglish', '#DailyEnglish'],
    lesson: {
      title: '🔄 Useful English: make vs do',
      lines: [
        'These two are everywhere in daily English, especially in common collocations 👇',
        '',
        'A lot of mistakes happen because learners translate directly from Persian.',
        '',
        'make = create a result',
        'do = an action, task, or job',
        '',
        '✅ make a plan',
        '✅ make a mistake',
        '✅ do homework',
        '✅ do your best',
        '',
        '❌ do a mistake',
        '✅ make a mistake',
        '',
        '📌 Where this helps:',
        'homework, work English, and everyday speaking.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'make بیشتر حس "ساختن / ایجاد نتیجه" می‌ده.',
        'do بیشتر با "کار / وظیفه / انجام دادن" میاد.',
        '',
        '🎯 Quick challenge:',
        'Write one sentence with make and one with do.',
      ],
      quiz: {
        question: 'Which one is correct?',
        options: ['do a mistake', 'make a mistake', 'make homework'],
        correctIndex: 1,
        explanation: 'We say make a mistake.',
      },
    },
    mini: {
      title: '🔑 Word Power: make or do?',
      lines: [
        'If homework / mistake / plan keeps confusing you, use this map 👇',
        '',
        'result = make',
        'task = do',
        '',
        '🇮🇷 فارسی کوتاه:',
        'نتیجه یا ساختن = make',
        'کار یا وظیفه = do',
        'ولی بهتره کل عبارت رو با هم یاد بگیری: do homework / make a mistake',
        '',
        '🎯 Mini challenge:',
        'Make a sentence with do homework.',
      ],
      quiz: {
        question: 'Which collocation is correct?',
        options: ['do a mistake', 'make a mistake', 'do a plan'],
        correctIndex: 1,
        explanation: 'We say make a mistake.',
      },
    },
  },
  {
    id: 'used-to-vs-be-used-to',
    lessonSlugs: ['used-to-for-past-habits'],
    hashtags: ['#Grammar', '#B1English', '#LearnEnglish'],
    lesson: {
      title: '🔎 Grammar Fix: used to vs be used to',
      lines: [
        'Use this when you compare your old habits with what feels normal now 👇',
        '',
        'This is very common when people talk about life changes, moving, work shifts, or Canada life.',
        '',
        'used to + verb = a past habit or past state',
        'be used to + noun / verb-ing = something feels normal now',
        '',
        '✅ I used to work nights.',
        '✅ I am used to working nights now.',
        '❌ I am used to work nights.',
        '',
        '📌 The core difference:',
        'used to = past only',
        'be used to = now it feels normal',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'used to یعنی قبلا این کار رو می‌کردم.',
        'be used to یعنی الان بهش عادت دارم.',
        'بعد از be used to معمولا noun یا verb-ing میاد.',
        '',
        '🎯 Your turn:',
        'Write one sentence with used to and one with be used to.',
      ],
      quiz: {
        question: 'Which one means الان بهش عادت دارم؟',
        options: ['I used to drive to work.', 'I am used to driving to work.', 'I use to drive to work.'],
        correctIndex: 1,
        explanation: 'be used to + ing means something feels normal now.',
      },
    },
    mini: {
      title: '⚡ Quick Grammar: used to / be used to',
      lines: [
        'Talking about before and now? Start here 👇',
        '',
        'used to = قبلا',
        'be used to = الان عادت دارم',
        '',
        '🇮🇷 فارسی کوتاه:',
        'used to = قبلا انجام می‌دادم',
        'be used to = الان برام عادیه',
        'بعد از be used to، فعل ساده نمیاد.',
        '',
        '🎯 Mini challenge:',
        'Make one sentence with used to.',
      ],
      quiz: {
        question: 'What comes after be used to?',
        options: ['base verb', 'noun or verb-ing', 'to + verb only'],
        correctIndex: 1,
        explanation: 'Use a noun or verb-ing after be used to.',
      },
    },
  },
  {
    id: 'articles-a-an-the',
    lessonSlugs: ['a-an-and-the'],
    hashtags: ['#Grammar', '#IELTS', '#B1English'],
    lesson: {
      title: '🔎 Grammar Fix: a / an / the',
      lines: [
        'Imagine you are telling a tiny story in English. First mention or specific thing? 👇',
        '',
        '👀 Look at this:',
        'I saw a dog outside.',
        'The dog was very friendly.',
        '',
        '✅ Easy feeling:',
        'a / an = one thing, not specific yet',
        'the = now we know exactly which one',
        '',
        '📌 Why this works:',
        'first time you mention it = a/an',
        'second time, when both people know which one = the',
        '',
        '🇮🇷 فارسی خودمونی:',
        'a / an یعنی "یکی، ولی هنوز مشخص نیست کدوم".',
        'the یعنی "همونی که الان مشخصه".',
        'اول می‌گی a dog. بعد که معلوم شد همون سگه، می‌گی the dog.',
        '',
        '🎯 Your turn:',
        'Make a 2-sentence mini story with a and then the.',
      ],
      quiz: {
        question: 'Which sentence works best?',
        options: ['I bought the book yesterday. It was just any book.', 'I bought a book yesterday. The book is on my desk now.', 'I bought an book yesterday.'],
        correctIndex: 1,
        explanation: 'Use a for first mention, then the for the specific book.',
      },
    },
    mini: {
      title: '⚡ Quick Grammar: first mention / second mention',
      lines: [
        'You mention something once, then mention the same thing again. That is where articles click 👇',
        '',
        '👀 Look at this:',
        'I saw a cat. The cat ran away.',
        '',
        '✅ Quick rule:',
        'first time = a / an',
        'second time = the',
        '',
        '🇮🇷 فارسی کوتاه:',
        'اول بار معرفی می‌کنی: a / an',
        'دوباره به همون اشاره می‌کنی: the',
        'پس فرق اصلیش مشخص بودن چیزیه که داری درباره‌ش حرف می‌زنی.',
        '',
        '🎯 Mini challenge:',
        'Write a 2-sentence example.',
      ],
      quiz: {
        question: 'Which comes first in a new story?',
        options: ['the', 'a/an', 'no article always'],
        correctIndex: 1,
        explanation: 'Use a or an when you mention something for the first time.',
      },
    },
  },
  {
    id: 'prepositions-in-context',
    lessonSlugs: ['prepositions-context-b1'],
    hashtags: ['#Vocabulary', '#IELTS', '#B1English'],
    lesson: {
      title: '🔄 Useful English: prepositions in context',
      lines: [
        'This matters when one English word always comes with a certain preposition 😵',
        '',
        'The trap is direct translation.',
        '',
        '❌ interested on',
        '✅ interested in',
        '',
        '❌ arrive to the station',
        '✅ arrive at the station',
        '',
        '💡 Better way to learn them:',
        'Do not memorize one word alone.',
        'Memorize the whole chunk.',
        '',
        '✅ interested in music',
        '✅ good at math',
        '✅ depend on your team',
        '',
        '📌 Where this helps:',
        'IELTS/CELPIP writing, because the wrong preposition sounds unnatural fast.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'حرف اضافه رو تنها حفظ نکن.',
        'کل عبارت رو با هم یاد بگیر.',
        'مثلا interested in / good at / depend on',
        '',
        '🎯 Your turn:',
        'Write one sentence with good at or interested in.',
      ],
      quiz: {
        question: 'Which chunk is correct?',
        options: ['interested on politics', 'interested in politics', 'interested at politics'],
        correctIndex: 1,
        explanation: 'We say interested in.',
      },
    },
    mini: {
      title: '🔑 Word Power: learn the whole chunk',
      lines: [
        'Word + preposition is one package. Learn it that way 👇',
        '',
        '✅ interested in',
        '✅ good at',
        '✅ depend on',
        '',
        '🇮🇷 فارسی کوتاه:',
        'حرف اضافه رو با خودِ عبارت حفظ کن، نه جدا.',
        'یعنی بگو interested in، نه فقط interested.',
        '',
        '🎯 Mini challenge:',
        'Make one sentence with good at.',
      ],
      quiz: {
        question: 'Which one is correct?',
        options: ['good in math', 'good at math', 'good on math'],
        correctIndex: 1,
        explanation: 'We say good at.',
      },
    },
  },
  {
    id: 'walk-in-clinic',
    lessonSlugs: [],
    hashtags: ['#RealCanada', '#CanadianEnglish', '#SpeakingEnglish'],
    lesson: {
      title: '🇨🇦 Real Canada: what to say at a walk-in clinic 🩺',
      lines: [
        'You feel sick... and suddenly you need English fast 😬',
        '',
        'In Canada, a walk-in clinic is a place you go when you need a doctor but do not have an appointment.',
        '',
        '👉 STEP 1: Start simply',
        '"Hi, I\'d like to see a doctor."',
        '',
        '👉 STEP 2: Say the problem',
        '"I have a fever."',
        '"I have a sore throat."',
        '"It started last night."',
        '',
        '👉 STEP 3: Ask one practical question',
        '"Do I need an appointment?"',
        '"Can I use my health card here?"',
        '',
        '💡 Best part:',
        'You do not need perfect English.',
        'You need short, clear English.',
        '',
        '🇮🇷 فارسیِ کاربردی:',
        'لازم نیست خیلی رسمی یا پیچیده حرف بزنی.',
        'کوتاه بگو مشکلت چیه و از کی شروع شده.',
        'بعدش یه سوال ساده بپرس.',
        '',
        '🎯 Say this once out loud:',
        '"Hi, I\'d like to see a doctor. I\'ve had a fever since yesterday."',
      ],
      quiz: {
        question: 'Which opening line sounds natural at a clinic?',
        options: ['I would like see doctor immediately now.', 'Hi, I\'d like to see a doctor.', 'Give me health card doctor.'],
        correctIndex: 1,
        explanation: 'Keep it short and clear.',
      },
    },
    mini: {
      title: '🇨🇦 Real Canada: clinic English in one line',
      lines: [
        'If you freeze at the front desk, start here 👇',
        '',
        '"Hi, I\'d like to see a doctor."',
        '',
        '🇮🇷 فارسی کوتاه:',
        'اگه استرس گرفتی، با همین یه جمله شروع کن.',
        'بعدش فقط علامت یا مشکلت رو اضافه کن.',
        '',
        '🎯 Mini challenge:',
        'Add one symptom after it.',
      ],
      quiz: {
        question: 'What is the safest first line?',
        options: ['I need all medicine now.', 'Hi, I\'d like to see a doctor.', 'Doctor where?'],
        correctIndex: 1,
        explanation: 'That is the clearest polite opening line.',
      },
    },
  },
  {
    id: 'celpip-cover-all-points',
    lessonSlugs: ['celpip-task1-covering-all-prompt-points-b2'],
    hashtags: ['#CELPIP', '#Writing', '#B2English'],
    lesson: {
      title: '✍️ CELPIP Writing Task 1: cover every prompt point',
      lines: [
        'In CELPIP Writing Task 1, the email prompt gives you jobs to do. Usually they are shown as bullet points 👇',
        '',
        '👀 Look at this kind of prompt:',
        'explain the problem',
        'apologize',
        'ask for a next step',
        '',
        'If your email sounds fluent but one of these jobs is missing, the response feels incomplete.',
        '',
        '✅ Before you write, ask:',
        '1) What do I need to do?',
        '2) What details must I include?',
        '3) Did I answer every bullet?',
        '',
        '💡 Strong habit:',
        'Underline each prompt point first.',
        'Then match one sentence group to each point.',
        '',
        '📌 Where this helps:',
        'Task Response in CELPIP Writing Task 1.',
        '',
        '🇮🇷 فارسی خودمونی:',
        'خیلی وقتا مشکل زبان نیست.',
        'مشکل اینه که یکی از bulletها جا می‌مونه.',
        'قبل از نوشتن، bulletها رو جدا کن.',
        'بعد مطمئن شو برای هر کدوم توی جوابت یه بخش داری.',
        '',
        '🎯 Your turn:',
        'Next time, count the prompt points before you start writing.',
      ],
      quiz: {
        question: 'What should you check before writing?',
        options: ['Only the greeting', 'Every prompt point', 'Only the last line'],
        correctIndex: 1,
        explanation: 'You need to cover every prompt point.',
      },
    },
    mini: {
      title: '✍️ CELPIP Writing Task 1: do not miss a bullet',
      lines: [
        'You open the email prompt and see 3 bullet points. That means the task has 3 jobs, not 1 👇',
        '',
        'If you miss one bullet, you lose easy marks.',
        '',
        '👀 Example prompt jobs:',
        'explain the issue',
        'apologize',
        'ask for a next step',
        '',
        'If one of these is missing, your answer sounds incomplete.',
        '',
        '🇮🇷 فارسی کوتاه:',
        'توی Task 1 ایمیل، اول bulletها رو بشمار.',
        'بعد مطمئن شو برای هر bullet یه تیک توی برنامه‌ات داری.',
        'جواب خوب ولی ناقص، نمره کامل نمی‌گیره.',
        '',
        '🎯 Mini challenge:',
        'Underline each bullet in your next CELPIP email prompt.',
      ],
      quiz: {
        question: 'What causes easy score loss?',
        options: ['Covering all bullets', 'Missing one prompt point', 'Using a clear plan'],
        correctIndex: 1,
        explanation: 'Missing even one prompt point can hurt the score.',
      },
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
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(line.slice(separatorIndex + 1));
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

async function loadEnvFiles() {
  await loadEnvFile(path.join(process.cwd(), '.env'));
  await loadEnvFile(path.join(process.cwd(), '.env.local'));
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    mode: 'lesson',
    topic: '',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--mode') {
      options.mode = String(argv[index + 1] ?? 'lesson').toLowerCase();
      index += 1;
    } else if (arg === '--topic') {
      options.topic = String(argv[index + 1] ?? '').trim();
      index += 1;
    } else if (arg === '--exam') {
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!new Set(['lesson', 'mini-tip']).has(options.mode)) {
    throw new Error('--mode must be one of: lesson, mini-tip');
  }

  return options;
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

function resolveLessonUrl(lessonSlugs) {
  if (!Array.isArray(lessonSlugs) || lessonSlugs.length === 0) return '';

  const slug = lessonSlugs[0];
  const categoryMap = [
    ['both-either-neither', 'grammar'],
    ['few-a-few-little-a-little', 'grammar'],
    ['should', 'grammar'],
    ['used-to', 'grammar'],
    ['article', 'grammar'],
    ['a-an-and-the', 'grammar'],
    ['prepositions-context', 'vocabulary'],
    ['borrow-vs-lend', 'vocabulary'],
    ['make-vs-do', 'vocabulary'],
    ['celpip-task1', 'writing'],
  ];

  const category = categoryMap.find(([needle]) => slug.includes(needle))?.[1];
  if (!category) return SITE_URL;
  return `${SITE_URL}/lessons/${category}/${slug}/`;
}

function appendFooter(message, lessonSlugs = []) {
  const lessonUrl = resolveLessonUrl(lessonSlugs);
  const footer = [...FOOTER_LINES];
  if (lessonUrl) {
    footer.splice(2, 0, `📘 Full lesson: ${lessonUrl}`);
  }
  return `${message.trim()}\n\n${footer.join('\n')}`;
}

function buildMessage(topic, mode) {
  const variant = mode === 'mini-tip' ? topic.mini : topic.lesson;
  const text = appendFooter(variant.lines.join('\n'), topic.lessonSlugs);
  return {
    topicId: topic.id,
    title: variant.title,
    postBody: `${variant.title}\n\n${text}`,
    hashtags: topic.hashtags ?? [],
    quiz: variant.quiz ?? null,
  };
}

function normalizeSearch(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findTopicByQuery(query) {
  const needle = normalizeSearch(query);
  if (!needle) return null;

  return CHANNEL_TOPICS.find((topic) => {
    const haystacks = [
      topic.id,
      ...(topic.lessonSlugs ?? []),
      topic.lesson?.title,
      topic.mini?.title,
      ...(topic.hashtags ?? []),
    ].map(normalizeSearch);

    return haystacks.some((haystack) => haystack.includes(needle));
  }) ?? null;
}

function pickDeterministicIndex(length, salt = 0) {
  if (!Number.isInteger(length) || length <= 0) return 0;

  const runNumber = Number.parseInt(process.env.GITHUB_RUN_NUMBER ?? '', 10);
  const runAttempt = Number.parseInt(process.env.GITHUB_RUN_ATTEMPT ?? '1', 10);
  if (Number.isFinite(runNumber) && runNumber > 0) {
    const attempt = Number.isFinite(runAttempt) && runAttempt > 0 ? runAttempt : 1;
    return ((runNumber * 97) + (attempt * 13) + salt) % length;
  }

  const daySeed = Number.parseInt(new Date().toISOString().slice(8, 10), 10) || 1;
  return (daySeed + salt) % length;
}

function pickTopic(options, history, topicDedupeDays) {
  if (options.topic) {
    return findTopicByQuery(options.topic);
  }

  const startIndex = pickDeterministicIndex(CHANNEL_TOPICS.length, options.mode === 'mini-tip' ? 29 : 11);
  for (let offset = 0; offset < CHANNEL_TOPICS.length; offset += 1) {
    const candidate = CHANNEL_TOPICS[(startIndex + offset) % CHANNEL_TOPICS.length];
    if (!hasRecentTopic(history, candidate.id, { kind: 'content', maxAgeDays: topicDedupeDays })) {
      return candidate;
    }
  }

  return CHANNEL_TOPICS[startIndex] ?? null;
}

function buildPostMessage(content) {
  const hashLine = content.hashtags.length ? `\n\n${content.hashtags.join(' ')}` : '';
  return `${content.postBody}${hashLine}`;
}

async function telegramRequest(method, payload, token) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL?.trim() ?? '';
  const historyFilePath = resolveHistoryFilePath();
  const history = await loadPostHistory(historyFilePath);
  const topicDedupeDays = Math.max(30, Number.parseInt(process.env.TELEGRAM_TOPIC_DEDUPE_DAYS ?? '120', 10) || 120);

  const pickedTopic = pickTopic(options, history, topicDedupeDays);
  if (!pickedTopic) {
    throw new Error('No curated Telegram topic is available.');
  }

  const content = buildMessage(pickedTopic, options.mode);

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: 'dry-run', pickedTopic: pickedTopic.id, content }, null, 2));
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);
  if (!botToken || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and/or target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL).');
  }

  const messageText = buildPostMessage(content);
  const fingerprint = createContentFingerprint(messageText, { stripSignature: false });

  if (hasFingerprint(history, fingerprint)) {
    console.log('[skip] Duplicate content found in persistent history. Skipping publish.');
    return;
  }

  if (hasRecentTopic(history, content.topicId, { kind: 'content', maxAgeDays: topicDedupeDays })) {
    console.log(`[skip] Topic already posted in the last ${topicDedupeDays} days. Skipping publish.`);
    return;
  }

  const claim = await claimPostOwnership({
    kind: 'content',
    fingerprint,
    topic: content.topicId,
  });

  if (!claim.claimed) {
    console.log('[skip] Another Telegram content run already owns this topic or fingerprint. Skipping publish.');
    return;
  }

  try {
    const publicSlug = resolvePublicChannelSlug(channelUrl, chatId);
    const existingTexts = await fetchRecentChannelTexts(publicSlug, { stripSignature: false });
    const normalizedMessage = toCanonicalPostText(messageText, { stripSignature: false });
    if (existingTexts.includes(normalizedMessage)) {
      console.log('[skip] Duplicate content detected in recent channel posts. Skipping publish.');
      return;
    }

    const messageResult = await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: messageText,
      disable_web_page_preview: true,
    }, botToken);

    const quizMessageIds = [];
    if (content.quiz && Array.isArray(content.quiz.options) && content.quiz.options.length >= 2) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const quizResult = await telegramRequest('sendPoll', {
        chat_id: chatId,
        question: content.quiz.question,
        options: content.quiz.options,
        type: 'quiz',
        correct_option_id: content.quiz.correctIndex,
        explanation: content.quiz.explanation,
        is_anonymous: true,
      }, botToken);

      if (quizResult?.result?.message_id) {
        quizMessageIds.push(quizResult.result.message_id);
      }
    }

    rememberFingerprint(history, fingerprint, {
      kind: 'content',
      topic: content.topicId,
      title: content.title,
      messageId: messageResult?.result?.message_id ?? null,
      quizMessageIds,
      mode: options.mode,
    });
    await savePostHistory(historyFilePath, history);

    console.log(`[ok] Posted Telegram ${options.mode} content for topic: ${content.topicId}`);
  } finally {
    await releasePostOwnershipClaim(claim);
  }
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
