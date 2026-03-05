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
  // 10 format types with curated quality content - rotates through pedagogically diverse formats
  
  // FORMAT 1: Story-Based Learning
  const storyFormatLessons = [
    {
      title: '🎭 Story-Based Learning: The Job Interview',
      format: 'story-based',
      level: 'B1',
      topic: 'Context-based vocabulary in real scenarios',
      postBody: `🎭 LEARNING THROUGH STORIES: "The Big Interview"

Sarah was nervous. She hadn't slept well the night before because she was anxious about her upcoming job interview. She put on her best outfit and arrived early—better late than never, right? Wrong! Being early showed responsibility. 

The interviewer asked, "Tell me about a time you felt serendipity in your career." Sarah thought for a moment. "Well, meeting my mentor was pure serendipity. I wasn't looking for mentorship, but her guidance changed my trajectory!" The interviewer smiled. She had used a sophisticated word naturally.

🇮🇷

سارا عصبی بود. او شب قبل خوب نخوابید چون درباره مصاحبه‌ی شغلی‌اش نگران بود. بهترین لباس‌اش را پوشید و زودتر رفت. استخدام‌کننده از او پرسید: "آیا کلمه‌ی sophisticated را می‌شانی؟" (آیا درک می‌کنی که معنی این کلمات پیشرفته چیست؟)

💡 LESSON: Advanced vocabulary is most memorable when learned through natural stories!
کلمات پیشرفته زمانی یادگیری می‌شوند که در داستان‌های واقعی قرار بگیرند!`,
      hashtags: ['#StorytimeEnglish', '#VocabularyInContext', '#RealWorldEnglish'],
      quizzes: [
        {
          question: '❓ Why was Sarah nervous before the interview?',
          options: ['She didn\'t sleep well and was anxious', 'She was late for the interview', 'The interviewer was rude'],
          correctIndex: 0,
          explanation: 'The story explicitly states she was anxious and didn\'t sleep well.',
        },
        {
          question: '❓ What does "serendipity" mean in the story?',
          options: ['Bad luck or misfortune', 'Finding good things by pure chance', 'Hard work paying off'],
          correctIndex: 1,
          explanation: 'Serendipity = finding something good unexpectedly, like meeting the mentor!',
        },
        {
          question: '❓ What did Sarah\'s answer demonstrate?',
          options: ['She was nervous', 'She could use sophisticated vocabulary naturally', 'She didn\'t understand the question'],
          correctIndex: 1,
          explanation: 'Native speakers use advanced vocabulary naturally—Sarah showed this skill!',
        },
      ],
    },
  ];

  // FORMAT 2: Error Analysis Challenge
  const errorAnalysisLessons = [
    {
      title: '🔍 Error Analysis: 4 Mistakes in One Paragraph',
      format: 'error-analysis',
      level: 'B2',
      topic: 'Common learner mistakes',
      postBody: `🔍 SPOT THE MISTAKES: Can you find all 4 errors?

❌ LEARNER VERSION:
"I have went to Paris last year. I have spend two weeks there. The city are very beautiful. I seen the Eiffel Tower and it were amazing."

This paragraph has FOUR major errors:
1. "have went" → Should be "went" (Simple Past, not Present Perfect)
2. "have spend" → Should be "spent" (wrong auxiliary verb form)
3. "city are" → Should be "city is" (subject-verb agreement)
4. "it were" → Should be "it was" (wrong past tense form)

✅ CORRECTED VERSION:
"I went to Paris last year. I spent two weeks there. The city is very beautiful. I saw the Eiffel Tower and it was amazing."

🇮🇷

این چهار اشتباه عام‌ترین مشکلات یادگیرندگان زبان انگلیسی است:
• زمان فعل نادرست ❌
• توافق حروف فاعل و فعل ❌
• فرم‌های نادرست فعل ❌

💡 KEY LESSON: Pay attention to verb forms AND subject-verb agreement!
معنی: به فرم فعل ها و توافق حروف فاعل و فعل توجه کنید!`,
      hashtags: ['#ErrorCorrection', '#EnglishGrammar', '#LearnFromMistakes'],
      quizzes: [
        {
          question: '❓ What is WRONG with "I have went to Paris"?',
          options: ['Nothing, it\'s correct', '"Have went" is wrong; should be "went" for Simple Past', 'Should use "has" instead of "have"'],
          correctIndex: 1,
          explanation: 'With a specific time (last year), use Simple Past "went", not Present Perfect!',
        },
        {
          question: '❓ Fix this: "The city are very beautiful."',
          options: ['The city is very beautiful', 'The city were very beautiful', 'The cities are very beautiful'],
          correctIndex: 0,
          explanation: '"City" is singular, so needs "is". This is subject-verb agreement!',
        },
        {
          question: '❓ Which sentence is CORRECT?',
          options: ['I have spend two weeks in Paris', 'I spent two weeks in Paris', 'I have spended two weeks'],
          correctIndex: 1,
          explanation: 'With "two weeks" (completed time), use Simple Past "spent". Correct!',
        },
      ],
    },
  ];

  // FORMAT 3: Progressive Difficulty Tower
  const progressiveLessons = [
    {
      title: '🏗️ Difficulty Tower: "Go" at 3 Levels',
      format: 'progressive-difficulty',
      level: 'A2-B2',
      topic: 'Phrasal verbs with "go" at different levels',
      postBody: `🏗️ ONE WORD, THREE DIFFICULTY LEVELS

LEVEL 1️⃣ (Beginner A2):
"Go to the store" = Visit a place
✓ She goes to the gym every morning.
✓ We're going to a concert tonight!

LEVEL 2️⃣ (Intermediate B1):
"Go on" = Continue doing something
✓ She went on talking despite the noise. (= kept talking)
✓ "Tell me more!" "Okay, I'll go on." (= I'll continue)

LEVEL 3️⃣ (Advanced B2):
"Go through with" = Complete something difficult/unpleasant
✓ He didn't go through with the surgery. (backed out)
✓ I finally went through with it! (completed it despite fear)

BONUS: "Go for" = Choose or attempt
✓ I'm going for the blue shirt. (choosing it)
✓ Go for it! (try your hardest!)

🇮🇷

سه معنی برای "go":
• A2: رفتن به مکان
• B1: ادامه دادن
• B2: انجام دادن چیز سخت

💡 Pro Tip: Context tells you which meaning! سیاق کمک می‌کند!`,
      hashtags: ['#PhrasalVerbs', '#DifficultyProgression', '#EnglishMastery'],
      quizzes: [
        {
          question: '❓ "She\'s been going on about her vacation for an hour!" means:',
          options: ['She\'s leaving for vacation', 'She keeps talking about her vacation', 'She\'s planning a trip'],
          correctIndex: 1,
          explanation: '"Go on" = keep talking/continue. She keeps discussing it!',
        },
        {
          question: '❓ "He didn\'t go through with the job offer" means:',
          options: ['He successfully completed the job', 'He changed his mind and didn\'t accept it', 'He went to the job interview'],
          correctIndex: 1,
          explanation: '"Go through with" = complete something despite doubts. He backed out!',
        },
        {
          question: '❓ Which is MOST ADVANCED usage?',
          options: ['Go to school', 'Go on a trip', 'Go through with a difficult decision'],
          correctIndex: 2,
          explanation: 'B2 advanced = complete despite difficulty. A2/B1 are simpler concepts!',
        },
      ],
    },
  ];

  // FORMAT 4: Comparison Battle
  const comparisonLessons = [
    {
      title: '⚖️ Comparison Battle: "Unlike" vs "Different from"',
      format: 'comparison',
      level: 'B2',
      topic: 'Similar expressions with subtle differences',
      postBody: `⚖️ BATTLE: Which one should YOU use?

CONTEXT 1: You're comparing two things
❌ "Unlike my brother, I like coffee." (Awkward as opening!)
✅ "My brother doesn't like coffee, UNLIKE me." (Flows better; emphasizes contrast)
✅ "My brother is DIFFERENT FROM me in taste." (Also works; more formal)

CONTEXT 2: In writing (descriptive)
❌ "Different from his sister, John is quiet." (Too repetitive)
✅ "Unlike his sister, John is quiet." (More natural, smoother flow)
✅ "John is different from his sister—he's quiet." (Also fine; more emphatic)

THE RULE:
• "Unlike" = usually at sentence start + emphasizes contrast + sounds more literary
• "Different from" = anywhere in sentence + more formal/academic + emphasizes distinction

NATIVE SPEAKER TIP:
In casual speech: "He's nothing like me!" (Most common!)
In formal writing: "Unlike previous research..." (Very academic/professional)

🇮🇷

• Unlike = شروع جمله، تاکید تفاوت
• Different from = هر جای جمله، رسمی‌تر

مثال ساده: "This is different from what I expected" یا "Unlike last time, this is good"

💡 Pro Tip: "Unlike" sounds more sophisticated! Impress your readers!`,
      hashtags: ['#VocabularyNuance', '#WritingTips', '#EnglishStyle'],
      quizzes: [
        {
          question: '❓ Which sounds MOST natural in formal academic writing?',
          options: [
            'Different from previous studies, this research shows new results',
            'Unlike previous studies, this research shows new results',
            'This is different from what I thought'
          ],
          correctIndex: 1,
          explanation: '"Unlike" at sentence start sounds more academic and sophisticated!',
        },
        {
          question: '❓ Complete naturally: "Sarah\'s approach is _____ Tom\'s."',
          options: ['different from', 'unlike', 'both work equally well'],
          correctIndex: 2,
          explanation: 'Both work, but "different from" is more direct for simple comparisons.',
        },
        {
          question: '❓ Which is BETTER for storytelling?',
          options: [
            'My hometown is different from the city',
            'Unlike the city, my hometown is peaceful',
            'Both equally good'
          ],
          correctIndex: 1,
          explanation: '"Unlike" creates more impact and flows better in narrative contexts!',
        },
      ],
    },
  ];

  // FORMAT 5: Native Speaker Authenticity (Mini-dialogue)
  const nativeSpeakerLessons = [
    {
      title: '🎬 Native Speaker Dialogue: Coffee Shop Eavesdropping',
      format: 'native-speaker',
      level: 'A2-B1',
      topic: 'Authentic conversational patterns',
      postBody: `🎬 REAL DIALOGUE: What natives ACTUALLY say (not textbook!)

SCENARIO: Two friends at a coffee shop ☕

A: "Hey! How've you been?"
B: "Oh, you know, same old, same old. Work's been crazy!"
A: "Tell me about it. I've been pulling all-nighters."
B: "Ugh, no way! That's rough."
A: "Tell me about it! I'm dying for a vacation."
B: "You and me both, friend."

🇮🇷 تفسیر:

• "How've you been?" = How have you been (informal contraction—natives do this!)
• "Same old, same old" = Nothing new; life is routine
• "Tell me about it!" = I totally agree! (expression of sympathy)
• "Pulling all-nighters" = Staying up all night working
• "That's rough" = That's difficult/unfortunate
• "I'm dying for" = I really want something badly
• "You and me both" = I agree completely; same situation!

NOTICE: Look how they use CONTRACTIONS and CASUAL IDIOMS! That's real English! 🎯

💡 KEY: Native speakers compress words (how've, don't, isn't) and use repetition for rhythm!`,
      hashtags: ['#AuthenticEnglish', '#ConversationSkills', '#NativeSpeaker'],
      quizzes: [
        {
          question: '❓ What does "Tell me about it!" mean in context?',
          options: ['Ask me to tell you details', 'I completely agree; same problem!', 'I don\'t know this situation'],
          correctIndex: 1,
          explanation: '"Tell me about it" = mutual agreement/sympathy, NOT asking for a story!',
        },
        {
          question: '❓ "I\'m dying for a vacation" means:',
          options: ['I might die without a vacation', 'I really want a vacation badly', 'I\'m tired from vacations'],
          correctIndex: 1,
          explanation: '"Dying for" = want something very much. Common idiom!',
        },
        {
          question: '❓ Which is LEAST native-sounding?',
          options: [
            'I have been pulling all-nighters',
            'I\'ve been pulling all-nighters',
            'Tell me about your job'
          ],
          correctIndex: 0,
          explanation: 'Natives say "I\'ve been" not "I have been"—they contract! Also "Tell me about it" is mutual sympathy, not a request!',
        },
      ],
    },
  ];

  // FORMAT 6: Pronunciation + Spelling
  const pronunciationLessons = [
    {
      title: '🔊 Pronunciation Mystery: "Worcestershire" Sauce',
      format: 'pronunciation',
      level: 'A2-B1',
      topic: 'Tricky pronunciation and spelling',
      postBody: `🔊 CAN YOU SAY THIS? Most people can't! 🤯

THE WORD: Worcestershire (as in Worcestershire sauce 🍅)

NORMAL SPELLING: W-O-R-C-E-S-T-E-R-S-H-I-R-E (9 letters, very long!)

HOW TO PRONOUNCE:
❌ WRONG: "Wor-ces-ter-shire" (what most people try!)
✅ RIGHT: "WOOSTER-shir" (or "WOOSTER-sher")
        = WOO-ster-shur (just 3 syllables!)

The trick? The "CEL" sound doesn't exist! You skip it! 🤐

SIMILAR TRICKY WORDS:
🏴󐁧󐁢󐁳󐁣󐁴󐁿 "Scottish" = SCOT-ish (not "Scot-TISH")
🏰 "Leicester" = LESS-ter (not "Lie-ces-ter")
😄 "Gloucester" = GLOS-ter (not "Glow-cess-ter")

THE PATTERN: British place names often HIDE syllables!

🇮🇷

انگلیسی برای تلفظ دقیق نیاز دارد توجه به الگو‌های خفی:
• برخی حروف خاموش هستند
• برخی هجاها پنهان شده‌اند

😅 حتی بومی‌انگلیسی‌زبان‌ها گاهی اشتباه می‌کنند!

💡 Pro Tip: Listen to British people say these words on YouTubeتو can hear the rhythm!`,
      hashtags: ['#Pronunciation', '#BritishEnglish', '#LanguageTricks'],
      quizzes: [
        {
          question: '❓ How many syllables does "Worcestershire" have?',
          options: ['9 syllables (like the spelling)', '3 syllables (WOO-ster-shur)', '6 syllables'],
          correctIndex: 1,
          explanation: 'Only 3! The spelling is deceiving. Pronunciation is WOOSTER-shur!',
        },
        {
          question: '❓ What does "Leicester" sound like?',
          options: ['Lie-SES-ter', 'LESS-ter', 'Lie-chesters'],
          correctIndex: 1,
          explanation: '"Leicester" = LESS-ter. British place names hide syllables!',
        },
        {
          question: '❓ Why do these words sound shorter than spelled?',
          options: [
            'British people are lazy with pronunciation',
            'Many syllables/letters are silent or compressed in British place names',
            'These are old French words'
          ],
          correctIndex: 1,
          explanation: 'Historical pronunciation + spelling changes = compression of sound!',
        },
      ],
    },
  ];

  // FORMAT 7: Cultural Context Master
  const culturalLessons = [
    {
      title: '🌍 Culture Blast: "Break a Leg" Around the World',
      format: 'cultural-context',
      level: 'B1',
      topic: 'Cross-cultural expressions and idioms',
      postBody: `🌍 SAME EXPRESSION, DIFFERENT WORLDS

THE IDIOM: "Break a leg!" 💔🦵

What it REALLY means: "Good luck!" (especially for performers)

WHY THIS WEIRD PHRASE?
📖 Origin: Ancient Roman theater actors would say "May you NOT break a leg"—reverse psychology! The opposite wish meant good luck!

HOW DIFFERENT ENGLISH-SPEAKING COUNTRIES SAY IT:

🇺🇸 USA/Canada: "Break a leg!" (Theater, movies, public speaking)
🇬🇧 UK: "Toi toi toi!" OR "Break a leg!" (Borrowed from German stage tradition!)
🇦🇺 Australia: "All the best, mate!" (More casual/friendly)
🇮🇪 Ireland: "The very best of luck!" (More formal/warm)
🏴󐁧󐁢󐁳󐁣󐁴󐁿 Scotland: "Haste ye back!" (unique to them!)

WHEN DO YOU USE IT?
✓ Before a performance (concert, play, speech)
✓ Before a competition
✓ Before a big test/exam
✓ Before anything important where you want to wish someone luck!

✗ NOT before:
- A surgery (way too dark!)
- A casual dinner
- Regular conversations

🇮🇷

بیان‌ها متفاوت اما معنی یکسان:
• امریکا: Break a leg!
• انگلیس: Toi toi toi!
• استرالیا: All the best!

هدیه: اگر بریتانیایی دوست دارید، این بیان استفاده کنید!

💡 PRO TIP: Using the correct phrase for their accent = MASSIVE respect points!`,
      hashtags: ['#CulturalEnglish', '#IdiomsAroundWorld', '#CrossCultural'],
      quizzes: [
        {
          question: '❓ Where did "Break a leg" originally come from?',
          options: [
            'Medieval times when actors actually fought',
            'Ancient Rome where reverse psychology was used for good luck',
            'From circus performers in 1900s USA'
          ],
          correctIndex: 1,
          explanation: 'Ancient Romans said "may you NOT break a leg" as reverse good wishes!',
        },
        {
          question: '❓ What do British people sometimes say instead?',
          options: ['Good on ya!', 'Toi toi toi! (borrowed from German)', 'You\'ll do great!'],
          correctIndex: 1,
          explanation: '"Toi toi toi" is a British theatrical phrase borrowed from German tradition!',
        },
        {
          question: '❓ It\'s OKAY to say "Break a leg" before:',
          options: [
            'A surgery appointment',
            'A piano recital',
            'A dinner date'
          ],
          correctIndex: 1,
          explanation: 'Only for performances/competitions! Surgery = wrong and dark. Casual = unnecessary!',
        },
      ],
    },
  ];

  // FORMAT 8: Common Collocations Puzzle
  const collocationLessons = [
    {
      title: '🧩 Collocation Puzzle: "MAKE" vs "DO"',
      format: 'collocations',
      level: 'B1-B2',
      topic: 'High-frequency collocations with make and do',
      postBody: `🧩 ONE LETTER DIFFERENCE, HUGE IMPACT!

"MAKE" vs "DO" - Learners mix these up CONSTANTLY! 😅

THE RULE ISN'T SIMPLE, but here's what works:

DO = Actions/activities/responsibilities:
✓ Do homework | Do chores | Do exercise | Do research
✓ What do you do for work? (job)
✓ How much work must I do?
✓ Do me a favor!

MAKE = Create/produce/cause:
✓ Make a decision | Make a plan | Make progress
✓ Make money | Make a difference | Make friends
✓ Can you make noise? (cause a sound)
✓ She made a mistake (created/caused error)
✓ Make breakfast (prepare food)

COLLOCATIONS (What natives actually say):
DO: ✓ Do a good job ✓ Do the dishes ✓ Do your best
MAKE: ✓ Make a living ✓ Make time ✓ Make sense

TRICK: Listen to what comes AFTER:
• DO + concrete actions = Do homework, do laundry, do research
• MAKE + results/outcomes = Make money, make progress, make happen

🇮🇷

Make = ایجاد کردن، تولید کردن (نتایج)
Do = انجام دادن (فعالیت‌ها)

مثال:
"I make a decision" (تصمیم می‌گیرم - نتیجه)
"I do research" (تحقیق می‌کنم - فعالیت)

💡 MEMORY TIP: MAKE = produces something DONE = performs action!`,
      hashtags: ['#Collocations', '#CommonMistakes', '#FluentEnglish'],
      quizzes: [
        {
          question: '❓ Which is CORRECT?',
          options: [
            'Make the dishes',
            'Do the dishes',
            'Both are equally correct'
          ],
          correctIndex: 1,
          explanation: '"Do the dishes" = perform the activity. "Make" would be wrong here!',
        },
        {
          question: '❓ Complete: "She needs to _____ a decision about college."',
          options: ['do a decision', 'make a decision', 'make decision'],
          correctIndex: 1,
          explanation: '"Make a decision" = create/produce a decision (result). This is the collocation!',
        },
        {
          question: '❓ "I want to _____ a difference in the world."',
          options: ['do a difference', 'make a difference', 'do difference'],
          correctIndex: 1,
          explanation: '"Make a difference" = cause/produce an effect! Common, important phrase!',
        },
      ],
    },
  ];

  // FORMAT 9: Paragraph Rescue Challenge
  const paragraphRescueLessons = [
    {
      title: '🆘 Paragraph Rescue: Fix This Student Essay',
      format: 'paragraph-rescue',
      level: 'B2',
      topic: 'Real writing improvement and editing',
      postBody: `🆘 THIS IS REAL STUDENT WRITING - Can you fix it?

❌ ORIGINAL (with 5+ errors):
"Environmental issues is becoming more serious. The governments not doing enough to protect the nature. People should reduce they use of plastic and try harder for the planet. In my opinion, is very important that everyone participate in protecting our environment because the future generations depends on our actions right now."

💡 WHAT'S WRONG?
1. "issues is" → "issues ARE" (plural!)
2. "governments not doing" → "governments are NOT doing" (missing verb)
3. "protect the nature" → "protect nature" (no "the" with general nouns)
4. "reduce they use" → "reduce THEIR use" (possessive, not pronoun)
5. "try harder for the planet" → "try harder FOR THE planet" OR "work for planetary protection"
6. "In my opinion, is very" → "In my opinion, IT IS very" (missing subject!)
7. "depends on" → "DEPEND on" (plural!)

✅ CORRECTED VERSION:
"Environmental issues ARE becoming more serious. Governments ARE NOT doing enough to protect the environment. People should reduce THEIR use of plastic and work harder to help the planet. In my opinion, IT IS very important that everyone participates in protecting our environment because FUTURE generations DEPEND on our actions right now."

🇮🇷

اشتباهات عام:
❌ توافق حروف فاعل و فعل (subject-verb agreement)
❌ تکرار یا حذف فعل کمکی (auxiliary verbs)
❌ مقولات گرامری اشتباه
✅ توجه! این اشتباهات درجه‌ای را پایین می‌آورند!

💡 EDITING TIP: Read aloud! Your ear catches mistakes your eyes miss!`,
      hashtags: ['#WritingTips', '#EssayEdit', '#EnglishMastery'],
      quizzes: [
        {
          question: '❓ What\'s wrong with "Environmental issues is becoming..."?',
          options: [
            'Nothing; "issues" is singular',
            '"Issues" is plural, so use "ARE", not "is"',
            'Should use "has" instead'
          ],
          correctIndex: 1,
          explanation: 'Subject-verb agreement! "Issues" (plural) → "ARE becoming"',
        },
        {
          question: '❓ Fix: "People should reduce they use of plastic."',
          options: [
            'People should reduce they use of plastic',
            'People should reduce their use of plastic',
            'People should reduce the use of plastic'
          ],
          correctIndex: 1,
          explanation: 'Possessive "their" not pronoun "they"! Common mistake!',
        },
        {
          question: '❓ Why is this error serious? "In my opinion, is very important..."',
          options: [
            'Wrong starting phrase',
            'Missing subject! Should be "In my opinion, IT IS very..."',
            'Too informal'
          ],
          correctIndex: 1,
          explanation: 'Every sentence needs a subject + verb! "IT IS" required here!',
        },
      ],
    },
  ];

  // FORMAT 10: Multiple Choice + Variants
  const multipleChoiceLessons = [
    {
      title: '📝 Test Your Skills: Present Perfect with "Just"',
      format: 'multiple-choice',
      level: 'B1',
      topic: 'Present Perfect with time markers',
      postBody: `📝 MINI-LESSON CHALLENGE: Three question types, ONE grammar point

GRAMMAR FOCUS: Present Perfect + "Just"
"Just" = very recently (moments ago)
✓ "I\'ve just finished my coffee." = I finished it seconds ago!
✓ "She\'s just arrived." = She got here moments ago.
✓ "We\'ve just started the class." = We began it right now!

🇮🇷

Just = همین الآن، تازه
معنی: اتفاقی که بسیار اخیراً رخ داده است

مثال: "من تازه قهوه نوشیدم" = "I\'ve just drunk coffee"

💡 WHY PRESENT PERFECT?
Because "just" connects the recent past to the present moment!
The action finished but has PRESENT importance!

NOW ANSWER THESE THREE QUESTION TYPES:`,
      hashtags: ['#GrammarFocus', '#PresentPerfect', '#TimeMarkers'],
      quizzes: [
        {
          question: '❓ MULTIPLE CHOICE: "I\'ve just ___ my homework."',
          options: [
            'finished',
            'finish',
            'have finished'
          ],
          correctIndex: 0,
          explanation: 'Past participle "finished" completes the Present Perfect!',
        },
        {
          question: '❓ FILL-IN-THE-BLANK: "She has _____ arrived at the station."',
          options: [
            'just-ly',
            'just',
            'justly'
          ],
          correctIndex: 1,
          explanation: '"Just" is an adverb placed AFTER "has" in Present Perfect + just!',
        },
        {
          question: '❓ TRUE/FALSE: "They have just left 30 minutes ago" is CORRECT.',
          options: [
            'True - it\'s perfect!',
            'False - "just" means very recent (seconds ago, not 30min ago)',
            'True - time is flexible'
          ],
          correctIndex: 1,
          explanation: '"Just" = seconds/moments ago, NOT 30 minutes! You\'d say "They left 30 minutes ago" instead!',
        },
      ],
    },
  ];

  // ALL FORMATS IN ONE POOL - SELECT RANDOMLY
  const allFormats = [
    ...storyFormatLessons,
    ...errorAnalysisLessons,
    ...progressiveLessons,
    ...comparisonLessons,
    ...nativeSpeakerLessons,
    ...pronunciationLessons,
    ...culturalLessons,
    ...collocationLessons,
    ...paragraphRescueLessons,
    ...multipleChoiceLessons,
  ];

  // Pick a random format from all 10 types
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
    quizzes: selectedLesson.quizzes || [selectedLesson.quiz], // Support both array and single quiz
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
