#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  claimPostOwnership,
  createContentFingerprint,
  fetchRecentChannelTexts,
  hasFingerprint,
  hasRecentTopic,
  htmlToPlainText,
  loadPostHistory,
  rememberFingerprint,
  releasePostOwnershipClaim,
  resolveHistoryFilePath,
  resolvePublicChannelSlug,
  savePostHistory,
  toCanonicalPostText,
} from './lib/telegram-dedupe.mjs';
import {
  appendTelegramSignature,
  formatTelegramSignatureLine,
} from './lib/telegram-signature.mjs';

const SITE_URL = 'https://ieltscorner.ca';
const CHANNEL_URL = 'https://t.me/kaysenglishcorner';
const BOT_DIRECT_URL = 'https://t.me/Ewithkpaybot';

const FOOTER_LINES = [
  '✨ Kay\'s English Corner 🇨🇦',
  'Your Gateway to English Success',
  '🌐 More lessons: https://ieltscorner.ca',
  '🧑‍🏫 Tutoring | ✍️ Writing feedback: https://ieltscorner.ca/tutoring | https://ieltscorner.ca/essay-correction',
];

const STANDARD_FOOTER_LINES = [
  '✨ Kay\'s English Corner',
  '🌐 More lessons: https://ieltscorner.ca',
  '✍️ Feedback + tutoring: https://ieltscorner.ca/essay-correction | https://ieltscorner.ca/tutoring',
];

const UPDATED_STANDARD_FOOTER_LINES = [
  '🌈 Kay’s English Corner 🇨🇦',
  '📅 Book your free consultation: 👉 https://calendar.app.google/nzoni849GjBUfEac6',
  '📲 WhatsApp (direct support): 👉 https://wa.me/17789942315',
  `🤖 Ask the robot anything: grammar, vocabulary, sentence fixes, and quick study help 👉 ${BOT_DIRECT_URL}`,
  '🌐 https://celpipcorner.ca',
  '📢 Channel: https://whatsapp.com/channel/0029VbBlsh87tkjFAkYchn19',
  '📸 IG: https://instagram.com/ieltscorner.ca',
];

const UPDATED_SIGNATURE_HEADER = "➖➖➖🇨🇦 K A Y ' S    E N G L I S H    C O R N E R 🇨🇦➖➖➖";
const UPDATED_SIGNATURE_LINKS = [
  {
    text: '📅   Book your free consultation',
    href: 'https://calendar.app.google/nzoni849GjBUfEac6',
  },
  {
    text: '📲   Question? Ask us on WhatsApp',
    href: 'https://wa.me/17789942315',
  },
  {
    text: '🤖   Use the Channel Robot',
    href: BOT_DIRECT_URL,
  },
  {
    text: '🌐   Website: https://celpipcorner.ca',
    href: 'https://ieltscorner.ca',
  },
  {
    text: '📢   Follow our WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029VbBlsh87tkjFAkYchn19',
  },
  {
    text: '📸   Instagram',
    href: 'https://instagram.com/ieltscorner.ca',
  },
];
const UPDATED_SIGNATURE_LINES = [
  UPDATED_SIGNATURE_HEADER,
  ...UPDATED_SIGNATURE_LINKS.map((item) => item.text),
];

const TELEGRAM_LIMITS = {
  messageCharsHard: 4096,
  messageCharsSoftLesson: 1500,
  messageCharsSoftMini: 900,
  pollQuestionChars: 300,
  pollOptionChars: 100,
  maxPollOptions: 10,
};

const TELEGRAM_EXAM_TOPIC_SHARE = 0.7;
const TELEGRAM_STYLE_RULES = {
  maxHashtags: 2,
};

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

const EXAM_CHANNEL_TOPICS = [
  {
    id: 'ielts-task2-clear-position',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#Writing', '#Band7'],
    lesson: {
      title: '🧭 IELTS Task 2: make your position obvious early',
      lines: [
        'A lot of Band 6 essays are not weak because the grammar is terrible. They are weak because the examiner cannot see the writer\'s position fast enough 👇',
        '',
        'Common problem:',
        'The introduction repeats the topic, but the opinion stays vague.',
        '',
        '❌ This essay will discuss both views and provide reasons.',
        '✅ While both sides have merit, I believe public transport investment should come before highway expansion.',
        '',
        'Why this matters:',
        'In Task Response, your opinion should be easy to find and consistent from start to finish.',
        '',
        'Better pattern:',
        '1) paraphrase the issue',
        '2) state your position clearly',
        '3) keep body paragraphs aligned with that position',
        '',
        '🎯 Exam move:',
        'After writing your intro, ask: can a tired examiner tell my answer in 5 seconds?',
      ],
      quiz: {
        question: 'Which thesis is clearer for IELTS Task 2?',
        options: [
          'This essay will discuss the topic in detail.',
          'Although both views exist, I believe stricter traffic laws are the more effective solution.',
          'There are many opinions about this issue nowadays.',
        ],
        correctIndex: 1,
        explanation: 'A clear IELTS thesis shows your position, not just the topic.',
      },
    },
    mini: {
      title: '⚡ IELTS Writing: do not hide your opinion',
      lines: [
        'In IELTS Task 2, a vague intro can quietly cap your score 👇',
        '',
        '❌ This essay will discuss both sides.',
        '✅ I believe online learning should supplement, not replace, classroom teaching.',
        '',
        'Quick rule:',
        'If the examiner cannot find your position fast, Task Response suffers.',
        '',
        '🎯 Mini challenge:',
        'Write one clear opinion sentence on any education topic.',
      ],
      quiz: {
        question: 'What must a strong IELTS intro include?',
        options: ['Only background', 'A clear position', 'Three body examples'],
        correctIndex: 1,
        explanation: 'Your position should be visible early in the response.',
      },
    },
  },
  {
    id: 'ielts-task1-overview-first',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#AcademicWriting', '#Task1'],
    lesson: {
      title: '📊 IELTS Task 1: write the overview before details',
      lines: [
        'Many Task 1 answers lose marks because students jump into numbers without telling the big story first 👇',
        '',
        'The overview is not optional.',
        'It shows the major trend, comparison, or contrast across the chart.',
        '',
        '❌ In 2000, sales were 20%, then 24%, then 19%...',
        '✅ Overall, online sales rose steadily, while store sales declined after a brief peak.',
        '',
        'Why this matters:',
        'Without a clear overview, Task Achievement usually stays limited.',
        '',
        'Good overview questions:',
        'What went up?',
        'What went down?',
        'What stayed highest or lowest?',
        '',
        '🎯 Exam move:',
        'Write the overview sentence before the body so your detail paragraphs stay controlled.',
      ],
      quiz: {
        question: 'What belongs in an IELTS Task 1 overview?',
        options: ['Every number from the chart', 'The main trends and comparisons', 'Your opinion about the data'],
        correctIndex: 1,
        explanation: 'The overview summarizes the big picture, not every figure.',
      },
    },
    mini: {
      title: '⚡ IELTS Task 1: overview first, numbers second',
      lines: [
        'If your Task 1 starts with random data, stop and do this instead 👇',
        '',
        'First write one sentence with the main trend.',
        'Then add the numbers that prove it.',
        '',
        '✅ Overall, X rose while Y fell.',
        '',
        '🎯 Mini challenge:',
        'Describe one chart trend in a single overview sentence.',
      ],
      quiz: {
        question: 'What should usually come before detail figures?',
        options: ['Overview', 'Conclusion opinion', 'Extra example'],
        correctIndex: 0,
        explanation: 'The overview gives structure to the rest of the answer.',
      },
    },
  },
  {
    id: 'ielts-reading-tfng-logic',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#Reading', '#Band7'],
    lesson: {
      title: '🔍 IELTS Reading: true / false / not given logic',
      lines: [
        'Students often lose easy IELTS reading marks because they treat Not Given like False 👇',
        '',
        'Use this logic:',
        'True = the statement matches the text.',
        'False = the text clearly contradicts it.',
        'Not Given = the text does not tell you enough.',
        '',
        '🎯 Exam move:',
        'Always point to one exact line before choosing True or False. If you cannot, Not Given becomes more likely.',
      ],
      quiz: {
        question: 'When should you choose Not Given?',
        options: ['When the statement is negative', 'When the text does not give enough information', 'When the statement seems unusual'],
        correctIndex: 1,
        explanation: 'Not Given means there is not enough evidence in the passage.',
      },
    },
    mini: {
      title: '⚡ IELTS Reading: Not Given is not False',
      lines: [
        'One quick IELTS trap fix 👇',
        '',
        'False = the text says the opposite.',
        'Not Given = the text does not say enough.',
        '',
        '🎯 Mini challenge:',
        'Before answering, ask: do I see contradiction, or just missing information?',
      ],
      quiz: {
        question: 'What is the difference?',
        options: ['They are the same', 'False is contradiction; Not Given is missing information', 'Not Given is stronger than True'],
        correctIndex: 1,
        explanation: 'That distinction is the core of this question type.',
      },
    },
  },
  {
    id: 'ielts-listening-distractor-fix',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#Listening', '#ExamStrategy'],
    lesson: {
      title: '🎧 IELTS Listening: catch the distractor before it catches you',
      lines: [
        'In IELTS Listening, the first answer you hear is often the trap, not the final answer 👇',
        '',
        'Example audio pattern:',
        '"It was on Tuesday... sorry, no, they moved it to Thursday."',
        '',
        'Better habit:',
        'Expect correction words like: sorry, actually, no, rather, instead, changed to.',
        '',
        '🎯 Exam move:',
        'When you hear an answer, keep listening for 2-3 more seconds before locking it in.',
      ],
      quiz: {
        question: 'Which word often signals a listening distractor?',
        options: ['because', 'actually', 'therefore'],
        correctIndex: 1,
        explanation: 'Correction markers like actually often signal the real answer is coming next.',
      },
    },
    mini: {
      title: '⚡ IELTS Listening: do not trust the first number',
      lines: [
        'A fast listening rule for exam day 👇',
        '',
        'First answer heard does not always mean final answer.',
        'Stay alert for: sorry, actually, no, changed to.',
        '',
        '🎯 Mini challenge:',
        'Train yourself to wait for the correction marker.',
      ],
      quiz: {
        question: 'What should you expect after a distractor?',
        options: ['Silence', 'A correction', 'A new topic only'],
        correctIndex: 1,
        explanation: 'The speaker often corrects or replaces the first detail.',
      },
    },
  },
  {
    id: 'ielts-speaking-part3-depth',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#Speaking', '#Band7'],
    lesson: {
      title: '🗣️ IELTS Speaking Part 3: add depth, not just length',
      lines: [
        'Long answers do not automatically score high in IELTS Speaking Part 3. Depth matters more than rambling 👇',
        '',
        'Better pattern:',
        'state an idea -> explain why -> give an example -> compare or qualify it',
        '',
        '🎯 Exam move:',
        'If your answer feels short, add one reason and one real-world example before stopping.',
      ],
      quiz: {
        question: 'What usually makes a Part 3 answer stronger?',
        options: ['Speaking faster', 'Adding explanation and example', 'Using only advanced words'],
        correctIndex: 1,
        explanation: 'Depth comes from development, not speed or decoration.',
      },
    },
    mini: {
      title: '⚡ IELTS Speaking Part 3: answer + why + example',
      lines: [
        'A simple Band 7 speaking frame 👇',
        '',
        '1) answer the question',
        '2) say why',
        '3) add one example',
        '',
        '🎯 Mini challenge:',
        'Try this frame on one Part 3 question today.',
      ],
      quiz: {
        question: 'Which structure helps development most?',
        options: ['Answer only', 'Answer + why + example', 'Three synonyms'],
        correctIndex: 1,
        explanation: 'That structure adds useful depth without overcomplicating the answer.',
      },
    },
  },
  {
    id: 'ielts-writing-idea-support',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#Writing', '#Task2'],
    lesson: {
      title: '✍️ IELTS Task 2: one clear idea beats three weak ones',
      lines: [
        'Students often try to sound smart by adding too many ideas in one paragraph. The result is usually thin support and weak logic 👇',
        '',
        'Strong pattern:',
        'topic sentence -> explanation -> concrete example -> link back to question',
        '',
        '🎯 Exam move:',
        'Before writing each paragraph, ask: what is this paragraph trying to prove?',
      ],
      quiz: {
        question: 'What usually makes a Task 2 body paragraph stronger?',
        options: ['Many undeveloped ideas', 'One main idea with support', 'A memorized quote'],
        correctIndex: 1,
        explanation: 'Depth and clarity beat idea overload.',
      },
    },
    mini: {
      title: '⚡ IELTS Writing: do less, support more',
      lines: [
        'A quick paragraph rule for Task 2 👇',
        '',
        'Do not pack 3 weak reasons into one paragraph.',
        'Use 1 clear reason and support it properly.',
        '',
        '🎯 Mini challenge:',
        'Write one topic sentence and one example that proves it.',
      ],
      quiz: {
        question: 'What should one body paragraph usually contain?',
        options: ['One main idea', 'Five unrelated points', 'Only a conclusion'],
        correctIndex: 0,
        explanation: 'A clear paragraph normally develops one main idea.',
      },
    },
  },
  {
    id: 'celpip-task1-tone-and-purpose',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#CELPIP', '#Writing', '#CLB9'],
    lesson: {
      title: '📧 CELPIP Task 1: match the tone to the situation',
      lines: [
        'A surprising number of CELPIP Task 1 emails lose marks because the tone does not match the purpose 👇',
        '',
        '❌ Hey, I want you to fix this problem now.',
        '✅ I am writing to report an issue and request a prompt solution.',
        '',
        '🎯 Exam move:',
        'Underline the relationship first: friend, company, manager, school, community group.',
      ],
      quiz: {
        question: 'Which line suits a formal complaint email better?',
        options: ['Fix this now.', 'I am writing to express concern about the recent service issue.', 'What is going on here?'],
        correctIndex: 1,
        explanation: 'Formal complaint emails need controlled, appropriate tone.',
      },
    },
    mini: {
      title: '⚡ CELPIP Task 1: tone first, sentences second',
      lines: [
        'Before you write a CELPIP email, identify the relationship 👇',
        '',
        'Manager or company = formal',
        'Friend or close contact = less formal',
        '',
        '🎯 Mini challenge:',
        'Rewrite one rude request as a professional email sentence.',
      ],
      quiz: {
        question: 'What should you check first in Task 1?',
        options: ['Font style', 'Relationship and tone', 'Essay conclusion'],
        correctIndex: 1,
        explanation: 'Tone depends on who you are writing to and why.',
      },
    },
  },
  {
    id: 'celpip-task2-pick-a-side',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#CELPIP', '#Writing', '#Task2'],
    lesson: {
      title: '🧱 CELPIP Task 2: choose a side and stay there',
      lines: [
        'Many CELPIP Task 2 responses sound weak because the writer keeps switching position in the middle of the answer 👇',
        '',
        '❌ Online classes are good, but in-person classes are also good, and both have benefits.',
        '✅ Although both formats help learners, in-person classes are usually more effective because students receive immediate feedback and stronger accountability.',
        '',
        '🎯 Exam move:',
        'If you mention the other side, do it briefly. Most of the paragraph should support your chosen option.',
      ],
      quiz: {
        question: 'What usually helps a CELPIP Task 2 response most?',
        options: ['Switching sides repeatedly', 'A clear choice with support', 'Using four unrelated examples'],
        correctIndex: 1,
        explanation: 'A clear, supported position creates stronger organization.',
      },
    },
    mini: {
      title: '⚡ CELPIP Task 2: stop wobbling between both sides',
      lines: [
        'One direct CELPIP fix 👇',
        '',
        'Choose one side.',
        'Support it with reasons.',
        'Do not keep changing your answer mid-response.',
        '',
        '🎯 Mini challenge:',
        'Write one sentence that clearly chooses option A or B.',
      ],
      quiz: {
        question: 'What weakens Task 2 organization?',
        options: ['Clear decision', 'Switching position repeatedly', 'One main reason'],
        correctIndex: 1,
        explanation: 'Frequent position changes make the response unstable.',
      },
    },
  },
  {
    id: 'celpip-speaking-task5-framework',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#CELPIP', '#Speaking', '#CLB9'],
    lesson: {
      title: '🎙️ CELPIP Speaking Task 5: compare, choose, justify',
      lines: [
        'Task 5 gets easier when you stop describing both options equally and start making a decision clearly 👇',
        '',
        'Good structure:',
        '1) compare both options briefly',
        '2) choose one',
        '3) justify it with 2 practical reasons',
        '',
        '🎯 Exam move:',
        'Use recommendation language early: I would choose, I would recommend, the better option is.',
      ],
      quiz: {
        question: 'What is the key job in CELPIP Speaking Task 5?',
        options: ['Only describe both options', 'Choose and justify one option', 'Tell a personal story only'],
        correctIndex: 1,
        explanation: 'Task 5 is not just comparison; it is comparison plus recommendation.',
      },
    },
    mini: {
      title: '⚡ CELPIP Speaking Task 5: do not end with “both are good”',
      lines: [
        'A fast fix for Task 5 👇',
        '',
        'Compare briefly.',
        'Choose clearly.',
        'Give 2 reasons.',
        '',
        '🎯 Mini challenge:',
        'Recommend one of two phones in one sentence.',
      ],
      quiz: {
        question: 'What should appear in a strong Task 5 answer?',
        options: ['A recommendation', 'No clear choice', 'Only description'],
        correctIndex: 0,
        explanation: 'The task expects a choice and justification.',
      },
    },
  },
  {
    id: 'celpip-reading-proof-not-keywords',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#CELPIP', '#Reading', '#CLB8'],
    lesson: {
      title: '📖 CELPIP Reading: proof beats keyword matching',
      lines: [
        'A common CELPIP reading problem is choosing the option that repeats a keyword, even when the meaning is wrong 👇',
        '',
        'Keyword match is only the start.',
        'Meaning match is the real check.',
        '',
        '🎯 Exam move:',
        'After finding the keyword, read one sentence before and one sentence after. Then ask: does this option match the meaning exactly?',
      ],
      quiz: {
        question: 'What should decide your answer in CELPIP reading?',
        options: ['Shared keywords only', 'Exact meaning and proof', 'Longest option'],
        correctIndex: 1,
        explanation: 'Shared vocabulary is not enough without meaning match.',
      },
    },
    mini: {
      title: '⚡ CELPIP Reading: matching words is not enough',
      lines: [
        'One reading rule that saves marks 👇',
        '',
        'Do not choose an answer only because it repeats a word from the passage.',
        'Check whether it matches the idea exactly.',
        '',
        '🎯 Mini challenge:',
        'For your next reading set, justify each answer with one proof line.',
      ],
      quiz: {
        question: 'What is more important than keyword overlap?',
        options: ['Exact meaning', 'Fast guessing', 'Option length'],
        correctIndex: 0,
        explanation: 'Meaning and proof determine the correct answer.',
      },
    },
  },
  {
    id: 'celpip-listening-speaker-attitude',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#CELPIP', '#Listening', '#CLB9'],
    lesson: {
      title: '🎧 CELPIP Listening: hear the speaker attitude, not just the words',
      lines: [
        'Some CELPIP listening answers depend more on attitude and intention than on direct facts 👇',
        '',
        'Listen for:',
        'tone changes',
        'stress on key words',
        'phrases like “I guess”, “fortunately”, “to be honest”, “that is disappointing”',
        '',
        '🎯 Exam move:',
        'When you hear emotional language, pause mentally and label the feeling in one word.',
      ],
      quiz: {
        question: 'What helps most with speaker attitude questions?',
        options: ['Listening only for numbers', 'Tracking tone and intention', 'Ignoring stressed words'],
        correctIndex: 1,
        explanation: 'These questions often depend on tone, not just facts.',
      },
    },
    mini: {
      title: '⚡ CELPIP Listening: tone carries meaning too',
      lines: [
        'A fast listening reminder 👇',
        '',
        'Do not only hear the words.',
        'Hear the attitude behind them: annoyed, relieved, excited, unsure.',
        '',
        '🎯 Mini challenge:',
        'Label the speaker feeling in one word during your next practice audio.',
      ],
      quiz: {
        question: 'What do attitude questions test?',
        options: ['Tone and intention', 'Spelling only', 'Grammar rules'],
        correctIndex: 0,
        explanation: 'They test whether you can interpret the speaker’s tone and purpose.',
      },
    },
  },
  {
    id: 'celpip-task1-bullets-plan',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#CELPIP', '#Writing', '#Task1'],
    lesson: {
      title: '📝 CELPIP Task 1: turn bullet points into paragraph jobs',
      lines: [
        'Students know they must cover all Task 1 bullets, but many still miss one because they never convert the bullets into a writing plan 👇',
        '',
        'Better method:',
        'Bullet 1 = paragraph job 1',
        'Bullet 2 = paragraph job 2',
        'Bullet 3 = paragraph job 3',
        '',
        '🎯 Exam move:',
        'Before writing, jot 3 tiny notes beside the bullets so no job disappears under time pressure.',
      ],
      quiz: {
        question: 'What is a safer planning method for Task 1?',
        options: ['Ignore the bullets after reading them', 'Convert each bullet into a job in your answer', 'Memorize one generic email'],
        correctIndex: 1,
        explanation: 'Turning bullets into clear jobs helps prevent missing content.',
      },
    },
    mini: {
      title: '⚡ CELPIP Task 1: each bullet needs visible language',
      lines: [
        'Quick Task 1 planning rule 👇',
        '',
        'Do not just read the bullets.',
        'Turn them into writing jobs before you start.',
        '',
        '🎯 Mini challenge:',
        'Take one Task 1 prompt and write a 3-point plan from the bullets.',
      ],
      quiz: {
        question: 'What helps you avoid missing a prompt point?',
        options: ['A bullet-to-job plan', 'Writing immediately with no plan', 'Only checking grammar'],
        correctIndex: 0,
        explanation: 'Planning from the bullets helps you cover all required points.',
      },
    },
  },
  {
    id: 'ielts-task2-example-quality',
    examFocus: true,
    lessonSlugs: [],
    hashtags: ['#IELTS', '#Writing', '#Band7'],
    lesson: {
      title: '💡 IELTS Task 2: one specific example is better than a vague generality',
      lines: [
        'Many IELTS essays sound reasonable until the example arrives. Then the support becomes generic and weak 👇',
        '',
        'Weak support:',
        'For example, this is helpful for society in many ways.',
        '',
        'Stronger support:',
        'For example, when cities expand bus routes to industrial areas, workers without private cars can reach jobs more reliably and at lower cost.',
        '',
        '🎯 Exam move:',
        'After each example, ask: could this happen in a real place with real people? If not, make it more concrete.',
      ],
      quiz: {
        question: 'What kind of example usually helps more in IELTS Task 2?',
        options: ['A vague general statement', 'A concrete and relevant example', 'No example at all'],
        correctIndex: 1,
        explanation: 'Specific, relevant examples strengthen argument quality.',
      },
    },
    mini: {
      title: '⚡ IELTS Task 2: make your example real',
      lines: [
        'A fast writing quality check 👇',
        '',
        'If your example could apply to anything, it is too vague.',
        'Add a place, group, situation, or clear result.',
        '',
        '🎯 Mini challenge:',
        'Rewrite one vague example so it sounds real and testable.',
      ],
      quiz: {
        question: 'What improves example quality most?',
        options: ['Specific detail', 'Longer sentence length', 'More memorized phrases'],
        correctIndex: 0,
        explanation: 'Specific detail makes the example more credible and useful.',
      },
    },
  },
];

const TOPIC_POOL = [...EXAM_CHANNEL_TOPICS, ...CHANNEL_TOPICS];

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

function legacyAppendFooter(message, lessonSlugs = []) {
  const lessonUrl = resolveLessonUrl(lessonSlugs);
  const footer = [...UPDATED_STANDARD_FOOTER_LINES];
  if (lessonUrl) {
    footer.splice(2, 0, `📘 Full lesson: ${lessonUrl}`);
  }
  return `${message.trim()}\n\n${footer.join('\n')}`;
}

function escapeTelegramHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeTelegramLine(text = '') {
  return String(text ?? '');
}

function legacyFormatTelegramLine(line, lineIndex) {
  const trimmed = normalizeTelegramLine(String(line ?? '').trim());
  if (!trimmed) return '';

  if (lineIndex === 0) {
    return `<b>${trimmed}</b>`;
  }
  if (/^(📅|📲|📘|🤖|🌐|📢|📸)/u.test(trimmed)) {
    return `<u>${escapeTelegramHtml(trimmed)}</u>`;
  }

  if (/^✨\s*Kay's English Corner$/i.test(trimmed)) {
    return `<i>${escapeTelegramHtml(trimmed)}</i>`;
  }

  if (/^(More lessons|Full lesson|Feedback \+ tutoring)/i.test(trimmed.replace(/^[^A-Za-z]+/, ''))) {
    return `<u>${escapeTelegramHtml(trimmed)}</u>`;
  }

  if (/^[^.!?]{1,70}:$/.test(trimmed)) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  if (/^#/.test(trimmed)) {
    return escapeTelegramHtml(trimmed);
  }

  return escapeTelegramHtml(trimmed);
}

function formatTelegramPost(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((line, index) => formatTelegramLine(line, index))
    .join('\n');
}

function appendFooter(message, lessonSlugs = [], mode = 'lesson') {
  return appendTelegramSignature(message, {
    compact: mode === 'mini-tip',
  });
}

function formatTelegramLine(line, lineIndex) {
  const trimmed = normalizeTelegramLine(String(line ?? '').trim());
  if (!trimmed) return '';

  if (lineIndex === 0) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  const formattedSignatureLine = formatTelegramSignatureLine(trimmed, escapeTelegramHtml);
  if (formattedSignatureLine) {
    return formattedSignatureLine;
  }

  if (/^[^.!?]{1,70}:$/.test(trimmed)) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  if (/^#/.test(trimmed)) {
    return escapeTelegramHtml(trimmed);
  }

  return escapeTelegramHtml(trimmed);
}

function compactTelegramText(text = '') {
  return String(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validateTelegramPayload(content, messageText, mode) {
  const warnings = [];
  const plainText = htmlToPlainText(messageText);
  const softLimit = mode === 'mini-tip'
    ? TELEGRAM_LIMITS.messageCharsSoftMini
    : TELEGRAM_LIMITS.messageCharsSoftLesson;

  if (messageText.length > TELEGRAM_LIMITS.messageCharsHard) {
    throw new Error(`Telegram message too long: ${messageText.length} chars (max ${TELEGRAM_LIMITS.messageCharsHard}).`);
  }

  if (plainText.length > softLimit) {
    warnings.push(`message is ${plainText.length} chars; target for ${mode} is <= ${softLimit}`);
  }

  if (content.quiz) {
    if (String(content.quiz.question ?? '').length > TELEGRAM_LIMITS.pollQuestionChars) {
      throw new Error(`Telegram poll question too long: ${String(content.quiz.question).length} chars.`);
    }

    if (!Array.isArray(content.quiz.options) || content.quiz.options.length < 2) {
      throw new Error('Telegram quiz must have at least 2 options.');
    }

    if (content.quiz.options.length > TELEGRAM_LIMITS.maxPollOptions) {
      throw new Error(`Telegram quiz has too many options: ${content.quiz.options.length}.`);
    }

    for (const option of content.quiz.options) {
      if (String(option ?? '').length > TELEGRAM_LIMITS.pollOptionChars) {
        throw new Error(`Telegram poll option too long: ${String(option).length} chars.`);
      }
    }
  }

  return {
    htmlChars: messageText.length,
    plainChars: plainText.length,
    warnings,
  };
}

function buildMessage(topic, mode) {
  const variant = mode === 'mini-tip' ? topic.mini : topic.lesson;
  const text = appendFooter(variant.lines.join('\n'), topic.lessonSlugs, mode);
  const selectedHashtags = (topic.hashtags ?? []).slice(0, TELEGRAM_STYLE_RULES.maxHashtags);
  return {
    topicId: topic.id,
    title: variant.title,
    postBody: `${variant.title}\n\n${text}`,
    hashtags: selectedHashtags,
    quiz: variant.quiz ?? null,
  };
}

function normalizeSearch(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findTopicByQuery(query) {
  const needle = normalizeSearch(query);
  if (!needle) return null;

  return TOPIC_POOL.find((topic) => {
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

  const postKind = options.mode === 'mini-tip' ? 'mini-tip' : 'lesson';
  const eligibleTopics = TOPIC_POOL.filter(
    (candidate) => !hasRecentTopic(history, candidate.id, { kind: postKind, maxAgeDays: topicDedupeDays })
  );

  if (eligibleTopics.length === 0) {
    console.log(`[skip] All ${TOPIC_POOL.length} topics were already posted as ${postKind} in the last ${topicDedupeDays} days.`);
    return null;
  }

  const examFocusedTopics = eligibleTopics.filter((candidate) => candidate.examFocus === true);
  const languageSupportTopics = eligibleTopics.filter((candidate) => candidate.examFocus !== true);
  const ratioBucket = pickDeterministicIndex(10, options.mode === 'mini-tip' ? 41 : 17);
  const shouldPreferExamFocus = ratioBucket < Math.round(TELEGRAM_EXAM_TOPIC_SHARE * 10);

  let selectionPool = eligibleTopics;
  if (examFocusedTopics.length > 0 && languageSupportTopics.length > 0) {
    selectionPool = shouldPreferExamFocus ? examFocusedTopics : languageSupportTopics;
  } else if (examFocusedTopics.length > 0) {
    selectionPool = examFocusedTopics;
  } else if (languageSupportTopics.length > 0) {
    selectionPool = languageSupportTopics;
  }

  const startIndex = pickDeterministicIndex(selectionPool.length, options.mode === 'mini-tip' ? 29 : 11);
  return selectionPool[startIndex] ?? null;
}

function buildPostMessage(content, mode) {
  const hashLine = content.hashtags.length ? `\n\n${content.hashtags.join(' ')}` : '';
  const formatted = compactTelegramText(`${formatTelegramPost(content.postBody)}${hashLine}`);
  return {
    messageText: formatted,
    compatibility: validateTelegramPayload(content, formatted, mode),
  };
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
  // Use a longer dedupe window to avoid repetitive channel experience.
  // Can be overridden via TELEGRAM_TOPIC_DEDUPE_DAYS.
  const topicDedupeDays = Math.max(14, Number.parseInt(process.env.TELEGRAM_TOPIC_DEDUPE_DAYS ?? '30', 10) || 30);

  const pickedTopic = pickTopic(options, history, topicDedupeDays);
  if (!pickedTopic) {
    console.log('[done] No new topic available. Exiting without posting.');
    return;
  }

  const postKind = options.mode === 'mini-tip' ? 'mini-tip' : 'lesson';
  const content = buildMessage(pickedTopic, options.mode);
  const { messageText, compatibility } = buildPostMessage(content, options.mode);

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: 'dry-run', pickedTopic: pickedTopic.id, content, compatibility, messageText }, null, 2));
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);
  if (!botToken || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and/or target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL).');
  }

  const fingerprint = createContentFingerprint(messageText, { stripSignature: false });

  for (const warning of compatibility.warnings) {
    console.warn(`[warn] Telegram compatibility: ${warning}`);
  }

  if (hasFingerprint(history, fingerprint)) {
    console.log('[skip] Duplicate content found in persistent history. Skipping publish.');
    return;
  }

  if (hasRecentTopic(history, content.topicId, { kind: postKind, maxAgeDays: topicDedupeDays })) {
    console.log(`[skip] Topic "${content.topicId}" already posted as ${postKind} in the last ${topicDedupeDays} days. Skipping publish.`);
    return;
  }

  const claim = await claimPostOwnership({
    kind: postKind,
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
    // Strip HTML from the formatted message so it matches the plain-text scraped posts
    const normalizedMessage = toCanonicalPostText(htmlToPlainText(messageText), { stripSignature: false });
    if (existingTexts.includes(normalizedMessage)) {
      console.log('[skip] Duplicate content detected in recent channel posts. Skipping publish.');
      return;
    }

    // Also check if the topic title already appears in recent channel posts
    const variant = options.mode === 'mini-tip' ? pickedTopic.mini : pickedTopic.lesson;
    const normalizedTitle = toCanonicalPostText(variant.title, { stripSignature: false }).toLowerCase();
    const titleAlreadyPosted = existingTexts.some(
      (text) => text.toLowerCase().includes(normalizedTitle)
    );
    if (titleAlreadyPosted) {
      console.log(`[skip] Topic title "${variant.title}" found in recent channel posts. Skipping publish.`);
      return;
    }

    const messageResult = await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'HTML',
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
      kind: postKind,
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
