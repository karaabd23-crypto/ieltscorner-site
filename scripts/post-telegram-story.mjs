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

  // Comprehensive fallback examples with Persian and examples + SEPARATE quiz data
  const examples = {
    'vocab-tip': {
      content: `${emoji} WORD POWER: "Serendipity" ✨

━━━━━━━━━━━━━━━━━━━━━
📌 Meaning (فارسی): اتفاق خوش (یافتن چیزی خوب به طور تصادفی)

✍️ Example:
"Meeting you here was pure serendipity!"

━━━━━━━━━━━━━━━━━━━━━
💪 Use it today in conversation!`,
      quiz: {
        question: '❓ Which sentence uses "serendipity" correctly?',
        options: [
          'The serendipity was planned by my manager',
          'Finding this book was pure serendipity',
          'I serendipity like this restaurant'
        ],
        correctOptionId: 1
      }
    },

    'grammar-hack': {
      content: `${emoji} GRAMMAR FIX: Present Perfect ⏱️

━━━━━━━━━━━━━━━━━━━━━
🔴 WRONG: "I live here for 5 years"
🟢 RIGHT: "I've lived here for 5 years"

📌 (فارسی): برای وقتهای طولانی ongoing از Present Perfect استفاده کن

✍️ Examples:
✅ "She's been a doctor for 10 years"
✅ "They've lived in Paris since 2020"

━━━━━━━━━━━━━━━━━━━━━
🎯 Practice with time expressions NOW!`,
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
      content: `${emoji} TODAY'S IDIOM: "Hit the nail on the head" 🔨

━━━━━━━━━━━━━━━━━━━━━
📌 Meaning: دقیقاً درست، exact point را بیان کردن

✍️ Example:
"Your analysis really hit the nail on the head!"

━━━━━━━━━━━━━━━━━━━━━
💬 Use this in your next discussion!`,
      quiz: {
        question: '❓ What does "hit the nail on the head" mean?',
        options: [
          'To be exactly right about something',
          'To hurt someone with a hammer',
          'To start a new project'
        ],
        correctOptionId: 0
      }
    },

    'pronunciation': {
      content: `${emoji} SAY IT RIGHT: "Often" 🗣️

━━━━━━━━━━━━━━━━━━━━━
Word: OFTEN
❌ Wrong: OFF-ten (emphasize 't')
✅ Right: OFF-en (silent 't')

📌 (فارسی): تلفظ "OF-en" است، نه "OF-ten"

🎯 Practice: "I often go to the coffee shop"

━━━━━━━━━━━━━━━━━━━━━
🎧 Listen and repeat 3 times!`,
      quiz: {
        question: '❓ Which pronunciation is correct for "often"?',
        options: [
          'OFF-ten (clear T sound)',
          'OFF-en (T is silent/reduced)',
          'O-FEE-ten'
        ],
        correctOptionId: 1
      }
    },

    'expression': {
      content: `${emoji} REACT LIKE A NATIVE: "That's brilliant!" 💯

━━━━━━━━━━━━━━━━━━━━━
Instead of basic "very good":
❌ "Very good"
✅ "Brilliant!"
✅ "Fantastic!"
✅ "Outstanding!"

📌 (فارسی): native speakers از این expressions استفاده میکنند

━━━━━━━━━━━━━━━━━━━━━
⬆️ Level up your English today!`,
      quiz: {
        question: '❓ Which expression sounds most natural?',
        options: [
          'Your work is very good',
          'Your work is brilliant',
          'Your work is nice'
        ],
        correctOptionId: 1
      }
    },

    'vocab-pair': {
      content: `${emoji} CONFUSING PAIR: Affect vs. Effect 🎯

━━━━━━━━━━━━━━━━━━━━━
AFFECT = فعل (تحت تأثیر قرار دادن، تاثیر گذاشتن)
EFFECT = اسم (نتیجه، تاثیر)

✍️ Examples:
✅ "The rain affects my mood" (verb)
✅ "The effect was dramatic" (noun)

━━━━━━━━━━━━━━━━━━━━━
🎯 Bookmark this pair NOW!`,
      quiz: {
        question: '❓ Fill the blank: "This change will _____ our budget"',
        options: [
          'affect (verb)',
          'effect (noun)',
          'Both are correct'
        ],
        correctOptionId: 0
      }
    },

    'phrase-boost': {
      content: `${emoji} SAY THIS INSTEAD: Professional Boosters 📈

━━━━━━━━━━━━━━━━━━━━━
Instead of Common Words: Say...
❌ "Very good" → ✅ "Exceptional"
❌ "Nice work" → ✅ "Impressive effort"
❌ "OK project" → ✅ "Well-executed project"

📌 همینطور در فارسی: از واژگان قوی تر استفاده کن

━━━━━━━━━━━━━━━━━━━━━
💼 Use these in meetings and emails!`,
      quiz: {
        question: '❓ Which sounds most professional?',
        options: [
          'That\'s very good work',
          'That\'s exceptional work',
          'That\'s nice'
        ],
        correctOptionId: 1
      }
    },

    'quick-quiz': {
      content: `${emoji} TEST YOUR KNOWLEDGE: Present vs. Past 🧠

━━━━━━━━━━━━━━━━━━━━━
Key Rule:
📌 (فارسی): با specific past time از Simple Past استفاده کن

✍️ Example:
❌ "I have been to Paris last year"
✅ "I went to Paris last year"

━━━━━━━━━━━━━━━━━━━━━
🎯 Now test yourself!`,
      quiz: {
        question: '❓ Which sentence is correct?',
        options: [
          'I have been to Paris last year',
          'I went to Paris last year',
          'I have went to Paris last year'
        ],
        correctOptionId: 1
      }
    },
  };

  const storyData = examples[type] || {
    content: `${emoji} ENGLISH TIP\n\n━━━━━━━━━━━━━━━━━━━━━\n📌 Master one concept at a time!\n🤖 More tips? DM the bot!\n━━━━━━━━━━━━━━━━━━━━━`,
    quiz: {
      question: '❓ Do you find these tips helpful?',
      options: ['Yes!', 'Very helpful', 'Extremely helpful'],
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

  const prompt = `You are an English language coach creating engaging Telegram Story content (text-only, no images).
Generate BOTH content AND quiz data separately.

Topic: ${topic}
Type: ${type}
Emoji to start with: ${emoji}

Create a response with this EXACT JSON structure:
{
  "content": "[emoji] [TITLE]\\n\\n━━━━━━━━━━━━━━━━━━━━━\\n[Teaching point with Persian explanation]\\n\\n✍️ Examples:\\n[Examples]\\n\\n━━━━━━━━━━━━━━━━━━━━━\\n[Call-to-action]",
  "quiz": {
    "question": "❓ [Quiz question]",
    "options": ["[Option A]", "[Option B]", "[Option C]"],
    "correctOptionId": [0, 1, or 2]
  }
}

Guidelines for content:
- Maximum 250 words
- Use lots of emojis (💡✨🎯🗣️💬🔄⬆️)
- Focus ONLY on vocabulary, grammar, idioms, expressions—NOT exam tips
- Include Persian explanation in parentheses like: (فارسی): [explanation]
- Use 2 example sentences with ✅ or ❌
- Use Unicode borders: ━━━━━━━━━━━━━━━━━━━━━
- Be conversational and mobile-friendly

Guidelines for quiz:
- Question should start with ❓
- Provide exactly 3 options (A, B, C style)
- correctOptionId must be 0, 1, or 2 (index of correct answer)
- Make sure the correct answer teaches the lesson
- Keep options concise

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
            content: 'You create brief, engaging English learning content with Persian explanations as JSON responses.',
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
