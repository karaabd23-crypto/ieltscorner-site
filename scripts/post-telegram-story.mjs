#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';

// Story topics with structure for rich content
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

  // Updated to match the model: conversational, dual-language, contextual
  const examples = {
    'vocab-tip': {
      content: `${emoji} Word Power: "Serendipity"

Let's explore this wonderful word together! 🎯

📌 Meaning:
✅ A happy accident; finding something good by pure chance
(فارسی): اتفاق خوش، یافتن چیزی خوب به طور تصادفی

✍️ Example:
"Meeting you here was pure serendipity!"
"دیدار با تو اینجا اتفاق خوش محسوب میشه!"

💡 Tip: Use this when something wonderful happens unexpectedly!

Try using it today! 💪`,
      quiz: {
        question: '❓ Complete: "Finding my lost passport right before my flight was pure ___."',
        options: [
          'serendipity',
          'mistake',
          'coincidence'
        ],
        correctOptionId: 0
      }
    },

    'grammar-hack': {
      content: `${emoji} Grammar Fix: Present Perfect

Let's clear up this common confusion! 🎯

📌 The Rule:
❌ WRONG: "I live here for 5 years"
✅ RIGHT: "I've lived here for 5 years"
(فارسی): برای مدت طولانی از Present Perfect استفاده کن

✍️ Examples:
"She's been a doctor for 10 years"
"او ۱۰ سال است که پزشک است"

💡 Tip: Use Present Perfect when the time period is still ongoing!

Master this now! 🎯`,
      quiz: {
        question: '❓ Choose the correct sentence:',
        options: [
          'I have studied English for 3 years',
          'I study English for 3 years',
          'I studied English for 3 years'
        ],
        correctOptionId: 0
      }
    },

    'idiom-quick': {
      content: `${emoji} Idiom of the Day: "Hit the nail on the head"

Let's explore this powerful expression! 💛

📌 Meaning:
✅ To say something that is exactly right or correct
(فارسی): دقیقاً درست بودن، حق گفتن

✍️ Example:
"Your analysis really hit the nail on the head!"
"تجزیه‌تحلیل تو کاملاً صحیح بود!"

💡 Tip: Use this to praise someone's insight or correct observation!

Try it in conversation! 🎯`,
      quiz: {
        question: '❓ Complete: "When she said the project would fail, she really ___ because it did."',
        options: [
          'hit the nail on the head',
          'broke the ice',
          'let the cat out of the bag'
        ],
        correctOptionId: 0
      }
    },

    'pronunciation': {
      content: `${emoji} Pronunciation Guide: "Often"

Let's say this word correctly! 🗣️

📌 The Correct Way:
✅ Say: OFF-en (T is silent!)
❌ NOT: OFF-ten (with clear T)
(فارسی): تلفظ "آفن" است، نه "آفتن"

✍️ Example in use:
"I often go to that coffee shop"
"من اغلب به آن کافه می‌روم"

💡 Tip: The 't' is silent – it sounds almost like a 'd' sound!

Practice now! 🎧`,
      quiz: {
        question: '❓ Which pronunciation is correct for "often"?',
        options: [
          'OFF-en (silent T)',
          'OFF-ten (clear T)',
          'O-FEN (one syllable)'
        ],
        correctOptionId: 0
      }
    },

    'expression': {
      content: `${emoji} Expression Upgrade: React Better

Let's sound more native! 💬

📌 Instead of "very good" say:
✅ "Brilliant!" 
✅ "Fantastic!"
✅ "Outstanding!"
(فارسی): از این لغات قوی‌تر اسفاده کن!

✍️ Example:
Instead: "That was very good"
Better: "That was brilliant!"
"بهتر از این بود نگفت!"

💡 Tip: Native speakers love these stronger expressions!

Upgrade your English today! ⬆️`,
      quiz: {
        question: '❓ Which response sounds most natural from a native speaker?',
        options: [
          'Your presentation was very good',
          'Your presentation was outstanding',
          'Your presentation was nice'
        ],
        correctOptionId: 1
      }
    },

    'vocab-pair': {
      content: `${emoji} Confusing Pair: Affect vs. Effect

Let's solve this once and for all! 🔄

📌 The Difference:
AFFECT = فعل (تاثیر گذاشتن، تحت تاثیر قرار دادن)
EFFECT = اسم (نتیجه، اثر)

✍️ Examples:
"The rain affects my mood" (verb)
"باران بر روحیه‌ام تاثیر می‌گذارد"

"The effect was dramatic" (noun)
"اثر آن تاثیرگذار بود"

💡 Tip: AFFECT = Action, EFFECT = End result!

Bookmark this! 🎯`,
      quiz: {
        question: '❓ Choose the correct word: "Lack of sleep can seriously _____ your grades."',
        options: [
          'affect',
          'effect',
          'afect'
        ],
        correctOptionId: 0
      }
    },

    'phrase-boost': {
      content: `${emoji} Professional Language: Level Up

Sound more impressive! 📈

📌 Replacements to Use:
❌ "Very good" → ✅ "Exceptional"
❌ "Nice work" → ✅ "Impressive effort"
❌ "Good idea" → ✅ "Innovative approach"
(فارسی): از واژگان حرفه‌ای‌تر استفاده کن!

✍️ Example:
At work: "That's an innovative approach to solving this!"
در کار: "این یک رویکرد نوآورانه برای حل مسئله است!"

💡 Tip: These words stand out in meetings and emails!

Use them today! 💼`,
      quiz: {
        question: '❓ Which sounds most professional in a work email?',
        options: [
          'Your report was very good',
          'Your report demonstrates exceptional attention to detail',
          'Your report was nice'
        ],
        correctOptionId: 1
      }
    },

    'quick-quiz': {
      content: `${emoji} Test Your Knowledge: Past Tenses

Let's check what you know! 🧠

📌 Key Rule:
With specific past time → Use Simple Past
(فارسی): با زمان‌های مشخص گذشته از Simple Past استفاده کن

❌ WRONG: "I have been to Paris last year"
✅ RIGHT: "I went to Paris last year"

💡 Because "last year" = specific past time!

Ready to test? Let's go! 🎯`,
      quiz: {
        question: '❓ Which sentence is correct?',
        options: [
          'I have visited Japan last summer',
          'I visited Japan last summer',
          'I have been visiting Japan last summer'
        ],
        correctOptionId: 1
      }
    },
  };

  const storyData = examples[type] || {
    content: `${emoji} English Tip of the Day

Let's learn something new! 💡

📌 Today's Focus:
Master one concept at a time!

💡 More tips coming your way!

Stay tuned! 🚀`,
    quiz: {
      question: '❓ Are you enjoying these daily tips?',
      options: ['Yes!', 'Very much!', 'Extremely helpful!'],
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

  const prompt = `You are an engaging English language coach creating Telegram stories that feel conversational and helpful.

Topic: ${topic}
Type: ${type}
Emoji to start with: ${emoji}

Create a response as VALID JSON with this exact structure:
{
  "content": "text content here",
  "quiz": {
    "question": "quiz question here",
    "options": ["option 1", "option 2", "option 3"],
    "correctOptionId": 0
  }
}

CONTENT GUIDELINES (conversational, like a friend):
1. Start with emoji and engaging hook (e.g., "Let's explore this word together!")
2. Include a "Meaning:" section with:
   - English explanation (1-2 lines)
   - Persian translation in parentheses: (فارسی): [translation]
3. Include an "Example:" section with:
   - English sentence using the word/phrase
   - Persian translation below it
4. Include a "Tip:" section with practical advice
5. Use lots of emojis naturally throughout (💛✨🎯💬⬆️🎧)
6. Keep tone warm, encouraging, and personal
7. Maximum 200 words

QUIZ GUIDELINES (contextual, not just definitions):
1. Question should be CONTEXTUAL - embed the word/phrase in a realistic sentence/situation
2. Use fill-in-the-blank format when possible (like the model)
3. Provide 3 plausible options (not obviously wrong)
4. The correct answer teaches through usage
5. correctOptionId must be 0, 1, or 2 (array index)

STYLE MODEL TO FOLLOW:
Content should be as conversational as this example:
"Let's explore this wonderful word together! 
📌 Meaning: A happy accident; finding something good by pure chance
(فارسی): اتفاق خوش، یافتن چیزی خوب به طور تصادفی
✍️ Example: "Meeting you here was pure serendipity!"
💡 Tip: Use this when something wonderful happens unexpectedly!"

Quiz should be contextual like:
Q: "Complete: 'Finding my lost passport right before my flight was pure ___.'
Options: serendipity / mistake / coincidence"

Return ONLY valid JSON, no other text.`;

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
            content: 'You create engaging, conversational English learning content with Persian explanations. Your style is warm, personal, and encouraging. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 800,
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
      // Try to parse as JSON (new format)
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
  // Post the main content message
  console.log('[posting] Main content to Telegram...');
  const contentResult = await telegramRequest(botToken, 'sendMessage', {
    chat_id: chatId,
    text: story.content,
    disable_web_page_preview: true,
    parse_mode: 'HTML',
  });
  console.log('[success] Content posted: message ID', contentResult.result?.message_id);

  // Then post the quiz as a poll with correct answer
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
    console.log('\n' + '='.repeat(60));
    console.log('STORY PREVIEW - CONTENT');
    console.log('='.repeat(60));
    console.log(story.content);
    console.log('\n' + '='.repeat(60));
    console.log('STORY PREVIEW - QUIZ');
    console.log('='.repeat(60));
    console.log(`Question: ${story.quiz.question}`);
    story.quiz.options.forEach((opt, idx) => {
      const marker = idx === story.quiz.correctOptionId ? '✅' : '  ';
      console.log(`  ${marker} ${String.fromCharCode(65 + idx)}) ${opt}`);
    });
    console.log('='.repeat(60) + '\n');
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
