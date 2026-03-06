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
  // 10 B1-level format types â€” simple, friendly, practical

  // FORMAT 1: Vocabulary (everyday word)
  const vocabLessons = [
    {
      title: 'ðŸ“š Word of the Day: "Convenient"',
      format: 'vocabulary',
      level: 'B1',
      topic: 'Convenient - easy to use or good for your situation',
      postBody: `ðŸ“š WORD OF THE DAY: Convenient

ðŸ”¤ What does it mean?
"Convenient" means something is easy for you. It saves you time or effort.

âœ… Examples:
â€¢ "The store is very convenient â€” it's right next to my house."
â€¢ "Is 3 PM a convenient time to meet?"
â€¢ "Online shopping is so convenient. You don't even have to leave home!"

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Convenient ÛŒØ¹Ù†ÛŒ Ø±Ø§Ø­Øª ÛŒØ§ Ù…Ù†Ø§Ø³Ø¨. Ù…Ø«Ù„Ø§Ù‹ ÙˆÙ‚ØªÛŒ ÛŒÙ‡ Ù…ØºØ§Ø²Ù‡ Ù†Ø²Ø¯ÛŒÚ© Ø®ÙˆÙ†ØªÙˆÙ†Ù‡ØŒ Ù…ÛŒÚ¯ÛŒØ¯ it's convenient.

ðŸ’¡ Tip: The opposite is "inconvenient" â€” when something makes your life harder.
âŒ "The bus schedule is really inconvenient â€” I have to wait an hour!"

ðŸŽ¯ Try this TODAY: Write a sentence about something convenient in your life!
Share it in the comments! ðŸ‘‡

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#LearnEnglish', '#Vocabulary', '#B1English', '#DailyEnglish'],
      quizzes: [
        {
          question: 'â“ "The new metro station is very _____ for people who work downtown."',
          options: ['convenient', 'nervous', 'difficult', 'expensive'],
          correctIndex: 0,
          explanation: '"Convenient" means it makes their life easier â€” the station is close and saves time!',
        },
        {
          question: 'â“ Which situation is "inconvenient"?',
          options: ['A store open 24 hours', 'A bus that comes every 5 minutes', 'A doctor only available at 6 AM', 'Free parking at work'],
          correctIndex: 2,
          explanation: '6 AM is too early for most people â€” that is inconvenient!',
        },
        {
          question: 'â“ "Is tomorrow _____ for you?" â€” What are we asking?',
          options: ['Is tomorrow fun?', 'Is tomorrow a good time?', 'Is tomorrow free?', 'Is tomorrow sunny?'],
          correctIndex: 1,
          explanation: 'We ask "Is it convenient?" to check if the time works well for someone.',
        },
      ],
    },
  ];

  // FORMAT 2: Grammar (common patterns)
  const grammarLessons = [
    {
      title: 'âœï¸ Grammar Check: Present Perfect vs Simple Past',
      format: 'grammar',
      level: 'B1',
      topic: 'When to use "I have done" vs "I did"',
      postBody: `âœï¸ GRAMMAR: Present Perfect vs Simple Past

Many learners mix these up. Let's make it simple! ðŸ˜Š

ðŸ“Œ Simple Past = finished action, we know WHEN
â€¢ "I visited Vancouver last summer." âœ…
â€¢ "She called me yesterday." âœ…

ðŸ“Œ Present Perfect = experience or result NOW
â€¢ "I have visited Vancouver." (= at some point in my life)
â€¢ "She has already called me." (= it's done, I know about it)

ðŸ”‘ Easy Rule:
â†’ If you say WHEN (yesterday, last week, in 2020) â†’ use Simple Past
â†’ If you say EVER, NEVER, ALREADY, YET, JUST â†’ use Present Perfect

âŒ Common mistake:
"I have visited Vancouver last summer." â† WRONG!
"I visited Vancouver last summer." â† RIGHT! âœ…

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Simple Past Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ù‡Ø§ÛŒ ØªÙ…ÙˆÙ… Ø´Ø¯Ù‡ Ø¨Ø§ Ø²Ù…Ø§Ù† Ù…Ø´Ø®Øµ.
Present Perfect Ø¨Ø±Ø§ÛŒ ØªØ¬Ø±Ø¨Ù‡â€ŒÙ‡Ø§ ÛŒØ§ Ù†ØªÛŒØ¬Ù‡ Ø§Ù„Ø§Ù†.

ðŸŽ¯ Try this: Write TWO sentences â€” one with Simple Past and one with Present Perfect!

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#EnglishGrammar', '#PresentPerfect', '#B1Grammar', '#LearnEnglish'],
      quizzes: [
        {
          question: 'â“ "I _____ to Toronto three times." (experience, no specific time)',
          options: ['went', 'have been', 'was going', 'did go'],
          correctIndex: 1,
          explanation: 'No specific time mentioned = Present Perfect. "I have been to Toronto three times."',
        },
        {
          question: 'â“ "She _____ her homework yesterday."',
          options: ['has finished', 'have finished', 'finished', 'is finishing'],
          correctIndex: 2,
          explanation: '"Yesterday" tells us WHEN. Use Simple Past: "She finished."',
        },
        {
          question: 'â“ Which sentence is CORRECT?',
          options: ['I have seen that movie last week.', 'I saw that movie last week.', 'I have saw that movie.', 'I was seen that movie.'],
          correctIndex: 1,
          explanation: '"Last week" = specific time â†’ use Simple Past: "I saw."',
        },
      ],
    },
  ];

  // FORMAT 3: Idiom (everyday sayings)
  const idiomLessons = [
    {
      title: 'ðŸŽ­ Idiom Time: "Under the weather"',
      format: 'idiom',
      level: 'B1',
      topic: 'Under the weather - feeling a little sick',
      postBody: `ðŸŽ­ IDIOM: "Under the weather" ðŸ¤’

ðŸ”¤ What does it mean?
It means you feel a little sick. Not very sick â€” just not great.

âœ… Examples:
â€¢ "I'm feeling a bit under the weather today. I think I'll stay home."
â€¢ "My son was under the weather yesterday, so he didn't go to school."
â€¢ "Are you okay? You look a bit under the weather."

âš ï¸ It does NOT mean the weather is bad!
âŒ "The weather is under the weather." â† This makes no sense!
âœ… "I feel under the weather." â† Correct! You feel sick.

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Under the weather ÛŒØ¹Ù†ÛŒ Ø­Ø§Ù„Ù… Ø®ÙˆØ¨ Ù†ÛŒØ³Øª ÛŒØ§ ÛŒÚ©Ù… Ù…Ø±ÛŒØ¶Ù…. Ù…Ø«Ù„Ø§Ù‹ ÙˆÙ‚ØªÛŒ Ø³Ø±Ù…Ø§ Ø®ÙˆØ±Ø¯ÛŒØ¯.

ðŸ’¡ You can also say:
â€¢ "I'm not feeling well."
â€¢ "I feel a bit off today."

ðŸŽ¯ Next time you feel sick, try saying: "I'm a bit under the weather." ðŸ¤§

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#EnglishIdioms', '#UnderTheWeather', '#B1English', '#DailyIdiom'],
      quizzes: [
        {
          question: 'â“ Your friend says "I feel under the weather." What do they mean?',
          options: ['They are cold because of rain', 'They feel a little sick', 'They are very happy', 'They don\'t like the weather'],
          correctIndex: 1,
          explanation: '"Under the weather" = feeling sick. It has nothing to do with actual weather!',
        },
        {
          question: 'â“ When would you say "I\'m under the weather"?',
          options: ['You got a promotion', 'You have a headache and sore throat', 'It\'s raining outside', 'You finished a big project'],
          correctIndex: 1,
          explanation: 'You say this when you feel sick â€” like a headache, cold, or sore throat.',
        },
        {
          question: 'â“ Which sentence uses the idiom CORRECTLY?',
          options: ['The sky is under the weather.', 'I can\'t come to work â€” I\'m under the weather.', 'The weather is under me.', 'My car is under the weather.'],
          correctIndex: 1,
          explanation: '"Under the weather" is about PEOPLE feeling sick, not about things or real weather.',
        },
      ],
    },
  ];

  // FORMAT 4: Phrasal Verb
  const phrasalLessons = [
    {
      title: 'ðŸ”„ Phrasal Verb: "Look forward to"',
      format: 'phrasal-verb',
      level: 'B1',
      topic: 'Look forward to - be excited about something coming',
      postBody: `ðŸ”„ PHRASAL VERB: "Look forward to" ðŸŽ‰

ðŸ”¤ What does it mean?
It means you are excited or happy about something that will happen.

âœ… Examples:
â€¢ "I look forward to the weekend!"
â€¢ "She's looking forward to her vacation."
â€¢ "We look forward to meeting you." (very common in emails!)

âš ï¸ Important grammar rule:
After "look forward to" â†’ use -ING (not infinitive!)
âœ… "I look forward to seeing you." â† CORRECT
âŒ "I look forward to see you." â† WRONG

More examples with -ING:
â€¢ "I'm looking forward to starting my new job."
â€¢ "He looks forward to visiting his family."

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Look forward to ÛŒØ¹Ù†ÛŒ Ù…Ø´ØªØ§Ù‚Ø§Ù†Ù‡ Ù…Ù†ØªØ¸Ø±Ù…. Ù…Ø«Ù„Ø§Ù‹: Ù…Ø´ØªØ§Ù‚Ø§Ù†Ù‡ Ù…Ù†ØªØ¸Ø± Ø¢Ø®Ø± Ù‡ÙØªÙ‡ Ù‡Ø³ØªÙ…!

ðŸ’¡ This is perfect for emails:
"Thank you for your help. I look forward to hearing from you." ðŸ“§

ðŸŽ¯ Try this: What are YOU looking forward to this week? Write it below! ðŸ‘‡

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#PhrasalVerbs', '#LookForwardTo', '#B1English', '#EnglishGrammar'],
      quizzes: [
        {
          question: 'â“ "I look forward to _____ you at the party."',
          options: ['see', 'seeing', 'saw', 'seen'],
          correctIndex: 1,
          explanation: 'After "look forward to" we always use -ING: "seeing"!',
        },
        {
          question: 'â“ What does "I\'m looking forward to the concert" mean?',
          options: ['I want to cancel the concert', 'I am excited about the concert', 'I forgot about the concert', 'I am nervous about the concert'],
          correctIndex: 1,
          explanation: '"Looking forward to" = excited and happy about something in the future!',
        },
        {
          question: 'â“ Which email ending is CORRECT?',
          options: ['I look forward to hear from you.', 'I look forward to hearing from you.', 'I look forward hear from you.', 'I look forward for hearing from you.'],
          correctIndex: 1,
          explanation: '"Look forward TO + -ING": "I look forward to hearing from you."',
        },
      ],
    },
  ];

  // FORMAT 5: Expression
  const expressionLessons = [
    {
      title: 'ðŸ’¬ Useful Expression: "It depends"',
      format: 'expression',
      level: 'B1',
      topic: 'It depends - the answer changes based on the situation',
      postBody: `ðŸ’¬ EXPRESSION: "It depends" ðŸ¤”

ðŸ”¤ What does it mean?
You say "it depends" when the answer is not always the same.
The answer changes based on the situation.

âœ… Examples:
â€¢ "Do you like cooking?" â€” "It depends. If I have time, yes!"
â€¢ "Is English hard?" â€” "It depends on how much you practice."
â€¢ "Should I take the bus or drive?" â€” "It depends on the traffic."

ðŸ“Œ How to use it:
â€¢ "It depends." (by itself â€” simple answer)
â€¢ "It depends on + noun" â†’ "It depends on the weather."
â€¢ "It depends on + question word" â†’ "It depends on how much it costs."

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
It depends ÛŒØ¹Ù†ÛŒ Ø¨Ø³ØªÚ¯ÛŒ Ø¯Ø§Ø±Ù‡. Ù…Ø«Ù„Ø§Ù‹: Ø¨Ø³ØªÚ¯ÛŒ Ø¯Ø§Ø±Ù‡ Ø¨Ù‡ ÙˆØ¶Ø¹ÛŒØª Ø¢Ø¨ Ùˆ Ù‡ÙˆØ§.

ðŸ’¡ This is very useful in conversations!
When someone asks a question and you can't give a simple yes or no, say:
"Well, it depends..."

ðŸŽ¯ Try this: Answer this question using "it depends":
"Do you prefer summer or winter?" ðŸ‘‡

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#EnglishExpressions', '#ItDepends', '#B1English', '#SpeakingTips'],
      quizzes: [
        {
          question: 'â“ "Will you go to the party?" â€” "_____ on who\'s going."',
          options: ['It depends', 'It decides', 'It works', 'It matters'],
          correctIndex: 0,
          explanation: '"It depends on..." is how we say the answer changes based on something.',
        },
        {
          question: 'â“ When do we use "it depends"?',
          options: ['When we are sure about the answer', 'When the answer is always the same', 'When the answer changes based on the situation', 'When we don\'t understand the question'],
          correctIndex: 2,
          explanation: '"It depends" = the answer is not simple â€” it changes based on the situation.',
        },
        {
          question: 'â“ Which is CORRECT?',
          options: ['It depends of the price.', 'It depends on the price.', 'It depends for the price.', 'It depends at the price.'],
          correctIndex: 1,
          explanation: 'Always say "depends ON": "It depends on the price."',
        },
      ],
    },
  ];

  // FORMAT 6: Error Correction (simple mistakes)
  const errorLessons = [
    {
      title: 'ðŸ” Common Mistake: "I am agree" âŒ',
      format: 'error-correction',
      level: 'B1',
      topic: 'Common mistakes with agree, enjoy, and suggest',
      postBody: `ðŸ” SPOT THE MISTAKE! Can you fix these? ðŸ§

Mistake 1:
âŒ "I am agree with you."
âœ… "I agree with you."
â†’ "Agree" is a verb, not an adjective. No "am"!

Mistake 2:
âŒ "I enjoy to swim."
âœ… "I enjoy swimming."
â†’ After "enjoy" â†’ always use -ING!

Mistake 3:
âŒ "She suggested me to go."
âœ… "She suggested that I go." OR "She suggested going."
â†’ "Suggest" doesn't use "me to..."

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
âŒ I am agree â† Ø§Ø´ØªØ¨Ø§Ù‡ Ø±Ø§ÛŒØ¬. ÙÙ‚Ø· Ø¨Ú¯ÛŒØ¯ I agree
âŒ enjoy to â† Ø¨Ø¹Ø¯ Ø§Ø² enjoy Ù‡Ù…ÛŒØ´Ù‡ ing Ø¨Ø°Ø§Ø±ÛŒØ¯
âŒ suggest me to â† Ø¨Ø¹Ø¯ Ø§Ø² suggest Ø§Ø² that Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯

ðŸ’¡ These 3 mistakes are VERY common. If you fix them, your English will sound much more natural! ðŸŒŸ

ðŸŽ¯ Challenge: Write a sentence with "agree," "enjoy," or "suggest." Share below! ðŸ‘‡

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#CommonMistakes', '#EnglishGrammar', '#B1English', '#FixYourEnglish'],
      quizzes: [
        {
          question: 'â“ Which sentence is CORRECT?',
          options: ['I am agree with this idea.', 'I agree with this idea.', 'I am agreed with this idea.', 'I agreeing with this idea.'],
          correctIndex: 1,
          explanation: '"Agree" is a verb. Just say "I agree" â€” no "am" needed!',
        },
        {
          question: 'â“ "I really enjoy _____ music."',
          options: ['to listen', 'listen', 'listening to', 'for listening'],
          correctIndex: 2,
          explanation: 'After "enjoy" â†’ use -ING: "enjoy listening to music."',
        },
        {
          question: 'â“ "She suggested _____ early."',
          options: ['me to leave', 'that I leave', 'me leaving', 'I to leave'],
          correctIndex: 1,
          explanation: '"Suggest" uses "that + subject + verb": "She suggested that I leave early."',
        },
      ],
    },
  ];

  // FORMAT 7: Pronunciation (simple sounds)
  const pronunLessons = [
    {
      title: 'ðŸ”Š Say It Right: Words that Sound Different than They Look!',
      format: 'pronunciation',
      level: 'B1',
      topic: 'Tricky English pronunciation',
      postBody: `ðŸ”Š SAY IT RIGHT! These words trick everyone! ðŸ˜…

These English words don't sound the way they look:

1ï¸âƒ£ Wednesday = "WENZ-day" (not Wed-NES-day)
2ï¸âƒ£ Comfortable = "KUMF-ter-bul" (not com-FOR-ta-ble)
3ï¸âƒ£ Vegetable = "VEJ-tuh-bul" (not ve-ge-TA-ble)
4ï¸âƒ£ Interesting = "IN-tres-ting" (not in-ter-ES-ting)
5ï¸âƒ£ Restaurant = "RES-tront" (not res-tau-RANT)

ðŸ’¡ Secret: In English, we often skip sounds in long words!
This is totally normal. Even native speakers do this.

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Ø¯Ø± Ø§Ù†Ú¯Ù„ÛŒØ³ÛŒ Ø¨Ø¹Ø¶ÛŒ Ú©Ù„Ù…Ø§Øª Ø¬ÙˆØ±ÛŒ Ú©Ù‡ Ù†ÙˆØ´ØªÙ‡ Ø´Ø¯Ù† ØªÙ„ÙØ¸ Ù†Ù…ÛŒØ´Ù†!
Ù…Ø«Ù„Ø§Ù‹ Wednesday Ø±Ùˆ Ù…ÛŒÚ¯ÛŒÙ… Â«ÙˆÙ†Ø²Ø¯ÛŒÂ» Ù†Ù‡ Â«ÙˆØ¯Ù†Ø²Ø¯ÛŒÂ».

ðŸŽ¯ Practice tip: Say each word 5 times fast. Your mouth will learn the shortcut! ðŸ—£ï¸

Which word surprised you the most? Tell us below! ðŸ‘‡

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#Pronunciation', '#SayItRight', '#B1English', '#EnglishSounds'],
      quizzes: [
        {
          question: 'â“ How do native speakers say "comfortable"?',
          options: ['com-FOR-ta-ble (4 syllables)', 'KUMF-ter-bul (3 syllables)', 'com-fort-ABLE', 'COME-for-table'],
          correctIndex: 1,
          explanation: 'We shorten it! "KUMF-ter-bul" â€” only 3 syllables, not 4.',
        },
        {
          question: 'â“ How do you say "Wednesday"?',
          options: ['Wed-NES-day', 'WENZ-day', 'Wed-IN-day', 'WED-nes-day'],
          correctIndex: 1,
          explanation: 'The "d" and second "e" are silent! We say "WENZ-day."',
        },
        {
          question: 'â“ Why do native speakers "skip" sounds in words?',
          options: ['Because they are lazy', 'Because it is a natural part of English', 'Because they don\'t know the correct way', 'Because they speak too fast'],
          correctIndex: 1,
          explanation: 'Dropping sounds in long words is normal and natural English!',
        },
      ],
    },
  ];

  // FORMAT 8: Comparison (similar words)
  const compLessons = [
    {
      title: 'âš–ï¸ What\'s the Difference? "Make" vs "Do"',
      format: 'comparison',
      level: 'B1',
      topic: 'Make vs Do - when to use each one',
      postBody: `âš–ï¸ MAKE vs DO â€” What's the difference? ðŸ¤”

This is one of the most confusing things in English!
Here's a simple way to remember:

ðŸ“Œ DO = for tasks, work, and activities
â€¢ do homework / do the dishes / do exercise
â€¢ do a favour / do your best / do business

ðŸ“Œ MAKE = for creating or producing something
â€¢ make food / make a mistake / make a decision
â€¢ make money / make a plan / make friends

ðŸ”‘ Simple memory trick:
DO = routine tasks (boring stuff ðŸ˜…)
MAKE = you create something new âœ¨

âŒ Common mistakes:
"I need to make my homework." â† WRONG
"I need to do my homework." â† RIGHT âœ…

"I did a mistake." â† WRONG
"I made a mistake." â† RIGHT âœ…

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Do Ø¨ÛŒØ´ØªØ± Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ù‡Ø§ Ùˆ ÙˆØ¸Ø§ÛŒÙ: do homework, do the dishes
Make Ø¨ÛŒØ´ØªØ± Ø¨Ø±Ø§ÛŒ Ø³Ø§Ø®ØªÙ† Ú†ÛŒØ² Ø¬Ø¯ÛŒØ¯: make food, make a plan

ðŸŽ¯ Challenge: Write one sentence with MAKE and one with DO! ðŸ‘‡

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#MakeVsDo', '#EnglishGrammar', '#B1English', '#ConfusingWords'],
      quizzes: [
        {
          question: 'â“ "Can you _____ me a favour?"',
          options: ['make', 'do', 'have', 'take'],
          correctIndex: 1,
          explanation: '"Do a favour" â€” it\'s a task, not creating something!',
        },
        {
          question: 'â“ "She _____ a big mistake at work."',
          options: ['did', 'made', 'done', 'does'],
          correctIndex: 1,
          explanation: 'We say "make a mistake" â€” not "do a mistake."',
        },
        {
          question: 'â“ Which pair is CORRECT?',
          options: ['make homework, do a cake', 'do homework, make a cake', 'make the dishes, do money', 'do a decision, make exercise'],
          correctIndex: 1,
          explanation: 'DO homework (task) and MAKE a cake (creating something)!',
        },
      ],
    },
  ];

  // FORMAT 9: Story / Dialogue (real life)
  const storyLessons = [
    {
      title: 'ðŸŽ¬ Real Conversation: At a Coffee Shop â˜•',
      format: 'dialogue',
      level: 'B1',
      topic: 'Ordering at a coffee shop - useful phrases',
      postBody: `ðŸŽ¬ REAL CONVERSATION: At a Coffee Shop â˜•

Let's practice! Read this conversation:

ðŸ‘¤ Barista: "Hi! What can I get for you?"
ðŸ™‹ You: "Can I have a medium latte, please?"
ðŸ‘¤ Barista: "Sure! Would you like that hot or iced?"
ðŸ™‹ You: "Iced, please."
ðŸ‘¤ Barista: "Do you want any flavour? Vanilla? Caramel?"
ðŸ™‹ You: "Vanilla sounds good!"
ðŸ‘¤ Barista: "For here or to go?"
ðŸ™‹ You: "To go, please."
ðŸ‘¤ Barista: "That'll be $5.75."
ðŸ™‹ You: "Here you go. Thanks!"
ðŸ‘¤ Barista: "Thank you! Have a great day!"

ðŸ“Œ Key phrases to remember:
â€¢ "Can I have a..." = polite way to order
â€¢ "For here or to go?" = eat in the shop or take it?
â€¢ "That'll be..." = here is the price
â€¢ "Here you go" = when you give money/card

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Can I have a... = Ù…ÛŒØªÙˆÙ†Ù… ... Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù…ØŸ (Ø¨Ø±Ø§ÛŒ Ø³ÙØ§Ø±Ø´ Ø¯Ø§Ø¯Ù†)
For here or to go? = Ø§ÛŒÙ†Ø¬Ø§ Ù…ÛŒØ®ÙˆØ±ÛŒØ¯ ÛŒØ§ Ù…ÛŒØ¨Ø±ÛŒØ¯ØŸ

ðŸŽ¯ Next time you order coffee, try using these phrases! â˜•

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#RealEnglish', '#CoffeeShop', '#B1Speaking', '#DailyConversation'],
      quizzes: [
        {
          question: 'â“ How do you politely order something in English?',
          options: ['Give me a coffee!', 'Can I have a coffee, please?', 'I want coffee now.', 'Coffee!'],
          correctIndex: 1,
          explanation: '"Can I have a... please?" is the polite way to order in English!',
        },
        {
          question: 'â“ "For here or to go?" â€” What does this mean?',
          options: ['Do you want sugar?', 'Do you want to eat here or take it with you?', 'Do you want a big or small size?', 'Do you want to pay now or later?'],
          correctIndex: 1,
          explanation: '"For here" = eat in the shop. "To go" = take it with you.',
        },
        {
          question: 'â“ When the barista says "That\'ll be $5.75," what should you do?',
          options: ['Say "It depends"', 'Pay $5.75', 'Ask for a discount', 'Say "No thanks"'],
          correctIndex: 1,
          explanation: '"That\'ll be..." tells you the price. Time to pay!',
        },
      ],
    },
  ];

  // FORMAT 10: Cultural tip
  const culturalLessons = [
    {
      title: 'ðŸ‡¨ðŸ‡¦ Canadian English: Things People Actually Say!',
      format: 'cultural',
      level: 'B1',
      topic: 'Common Canadian expressions and small talk',
      postBody: `ðŸ‡¨ðŸ‡¦ CANADIAN ENGLISH: Things You'll Hear Every Day!

If you live in Canada, you'll hear these a lot:

1ï¸âƒ£ "Sorry!" ðŸ™
Canadians say sorry ALL the time. Even when it's not their fault!
â†’ Someone bumps into YOU and says: "Oh, sorry!"

2ï¸âƒ£ "Double-double" â˜•
This means a coffee with 2 creams and 2 sugars (from Tim Hortons!).
â†’ "I'll have a double-double, please."

3ï¸âƒ£ "How's it going?" ðŸ‘‹
This is not a real question! It's just a greeting.
â†’ Answer: "Good, thanks! You?" (Don't explain your whole day! ðŸ˜…)

4ï¸âƒ£ "No worries!" ðŸ˜Š
This means "it's okay" or "you're welcome."
â†’ "Thanks for helping me!" â€” "No worries!"

5ï¸âƒ£ "Toque" (sounds like "took") ðŸ§¢
A warm winter hat. Very important in Canada! ðŸ¥¶

ðŸ‡®ðŸ‡· Ø¨Ù‡ ÙØ§Ø±Ø³ÛŒ:
Ú©Ø§Ù†Ø§Ø¯Ø§ÛŒÛŒâ€ŒÙ‡Ø§ Ø®ÛŒÙ„ÛŒ sorry Ù…ÛŒÚ¯Ù†! Double-double ÛŒØ¹Ù†ÛŒ Ù‚Ù‡ÙˆÙ‡ Ø¨Ø§ Û² Ø´Ú©Ø± Ùˆ Û² Ø®Ø§Ù…Ù‡.
How's it going Ø¬ÙˆØ§Ø¨ Ú©ÙˆØªØ§Ù‡ Ù…ÛŒØ®ÙˆØ§Ø¯ØŒ Ù†Ù‡ Ø¯Ø§Ø³ØªØ§Ù† Ú©Ø§Ù…Ù„!

ðŸŽ¯ Try this: Next time someone says "How's it going?" just say "Good, thanks!"

ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!`,
      hashtags: ['#CanadianEnglish', '#LifeInCanada', '#B1English', '#CulturalTips'],
      quizzes: [
        {
          question: 'â“ Someone says "How\'s it going?" What\'s the best answer?',
          options: ['Well, this morning I woke up at 7 and...', 'Good, thanks! You?', 'Going where?', 'I don\'t know.'],
          correctIndex: 1,
          explanation: '"How\'s it going?" is just a greeting. Keep it short: "Good, thanks!"',
        },
        {
          question: 'â“ You order a "double-double" at Tim Hortons. What do you get?',
          options: ['Two coffees', 'Coffee with 2 creams and 2 sugars', 'Double-size coffee', 'Coffee with double shot espresso'],
          correctIndex: 1,
          explanation: 'A double-double = 2 creams + 2 sugars. A classic Canadian order!',
        },
        {
          question: 'â“ What is a "toque" in Canadian English?',
          options: ['A type of cake', 'A warm winter hat', 'A greeting', 'A type of coffee'],
          correctIndex: 1,
          explanation: 'A toque is a warm hat! You need one for Canadian winters! ðŸ§¢',
        },
      ],
    },
  ];

  // ALL FORMATS IN ONE POOL - SELECT RANDOMLY
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

  // Pick a random format from all 10 types
  const selectedLesson = allFormats[Math.floor(Math.random() * allFormats.length)];

  const cta = channelUrl
    ? `\n\nðŸŒˆâœ¨ Kay's English Corner\nYour Gateway to English Success in Canada ðŸ‡¨ðŸ‡¦\nðŸ”— Join us on Telegram\n${channelUrl}`
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
  return `You are creating one Telegram post for English language learners.
Audience: B1 (intermediate) English learners. Many are Farsi speakers living in Canada.
Content Type: ${type} (vocabulary, grammar, idiom, expression, or phrasal verb)
Specific Topic: ${topic}
Level: ${level}
${templateHint}

IMPORTANT DIFFICULTY RULES:
- The CONTENT you teach should be B1 level (intermediate).
- The EXPLANATIONS must be written even simpler than B1 â€” use short sentences, everyday words, and a friendly tone so learners can easily understand.
- NO academic or formal language in explanations. Write like a patient, encouraging teacher talking to a friend.
- Use real-life, everyday examples (shopping, work, family, friends, travel).
- Maximum sentence length in explanations: 15 words.
- Avoid words like: paradigm, methodology, furthermore, consequently, albeit, whereas, circumlocution, epistemic, precipitate.

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
  2) Simple English explanation + 2-3 example sentences from daily life.
  3) Persian/Farsi companion explanation (short and clear).
  4) One easy tip on how to practice this TODAY.
  5) Call-to-action to share their own example in comments.
  6) Friendly branded footer for Kay's English Corner.
- Focus ONLY on vocabulary, grammar, idioms, expressionsâ€”NOT exam tips.
- Keep everything simple, warm, and encouraging.
- Include one practical task: e.g. "Try using this word in a sentence about your day!"
- quiz.question should be a simple fill-in-the-blank or best-choice from a real-life scenario.
- quiz.options: use simple, clear English. No trick answers.
- Hashtags: 3 to 6 tags for ${type}.
- quiz.correctIndex must be 0-3.
- quiz options must be distinct and plausible.
- Include this line near the end: "ðŸ¤– Want interactive quizzes & personalized tips? DM the bot for exclusive features!"
${channelUrl ? `- Include this CTA naturally in postBody: ${channelUrl}` : ''}`;
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
