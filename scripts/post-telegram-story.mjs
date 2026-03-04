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

  // Comprehensive fallback examples with Persian, examples, and quizzes
  const examples = {
    'vocab-tip': `${emoji} WORD POWER: "Serendipity" ✨

━━━━━━━━━━━━━━━━━━━━━
📌 Meaning (فارسی): اتفاق خوش (یافتن چیزی خوب به طور تصادفی)

✍️ Example:
"Meeting you here was pure serendipity!"

❓ Quick Quiz:
Which sentence uses "serendipity" correctly?

A) The serendipity was planned by my manager
B) Finding this book was pure serendipity
C) I serendipity like this restaurant

👉 Answer: B ✓
━━━━━━━━━━━━━━━━━━━━━
💪 Use it today in conversation!`,

    'grammar-hack': `${emoji} GRAMMAR FIX: Present Perfect ⏱️

━━━━━━━━━━━━━━━━━━━━━
🔴 WRONG: "I live here for 5 years"
🟢 RIGHT: "I've lived here for 5 years"

📌 (فارسی): برای وقتهای طولانی ongoing از Present Perfect استفاده کن

✍️ Examples:
✅ "She's been a doctor for 10 years"
✅ "They've lived in Paris since 2020"

❓ Quiz:
Choose the correct sentence:

A) I have studied English for 3 years
B) I study English for 3 years
C) I studied English for 3 years

👉 Answer: A ✓
━━━━━━━━━━━━━━━━━━━━━
🎯 Practice with time expressions NOW!`,

    'idiom-quick': `${emoji} TODAY'S IDIOM: "Hit the nail on the head" 🔨

━━━━━━━━━━━━━━━━━━━━━
📌 Meaning: دقیقاً درست، exact point را بیان کردن

✍️ Example:
"Your analysis really hit the nail on the head!"

❓ Quick Quiz:
What does "hit the nail on the head" mean?

A) To be exactly right about something
B) To hurt someone with a hammer
C) To start a new project

👉 Answer: A ✓
━━━━━━━━━━━━━━━━━━━━━
💬 Use this in your next discussion!`,

    'pronunciation': `${emoji} SAY IT RIGHT: "Often" 🗣️

━━━━━━━━━━━━━━━━━━━━━
Word: OFTEN
❌ Wrong: OFF-ten (emphasize 't')
✅ Right: OFF-en (silent 't')

📌 (فارسی): تلفظ "OF-en" است، نه "OF-ten"

🎯 Practice: "I often go to the coffee shop"

❓ Which pronunciation is correct?

A) OFF-ten (clear T sound)
B) OFF-en (T is silent/reduced)
C) O-FEE-ten

👉 Answer: B ✓
━━━━━━━━━━━━━━━━━━━━━
🎧 Listen and repeat 3 times!`,

    'expression': `${emoji} REACT LIKE A NATIVE: "That's brilliant!" 💯

━━━━━━━━━━━━━━━━━━━━━
Instead of basic "very good":
❌ "Very good"
✅ "Brilliant!"
✅ "Fantastic!"
✅ "Outstanding!"

📌 (فارسی): native speakers از این expressions استفاده میکنند

❓ Quiz:
Which expression sounds most natural?

A) "Your work is very good"
B) "Your work is brilliant"
C) "Your work is nice"

👉 Answer: B ✓ (Native speakers love "brilliant")
━━━━━━━━━━━━━━━━━━━━━
⬆️ Level up your English today!`,

    'vocab-pair': `${emoji} CONFUSING PAIR: Affect vs. Effect 🎯

━━━━━━━━━━━━━━━━━━━━━
AFFECT = فعل (تحت تأثیر قرار دادن، تاثیر گذاشتن)
EFFECT = اسم (نتیجه، تاثیر)

✍️ Examples:
✅ "The rain affects my mood" (verb)
✅ "The effect was dramatic" (noun)

❓ Quiz:
Fill the blank correctly:

"This change will _____ our budget"

A) affect
B) effect

👉 Answer: A (affect = verb)
━━━━━━━━━━━━━━━━━━━━━
🎯 Bookmark this pair NOW!`,

    'phrase-boost': `${emoji} SAY THIS INSTEAD: Professional Boosters 📈

━━━━━━━━━━━━━━━━━━━━━
Instead of "Good": Say...
❌ "Very good" → ✅ "Exceptional"
❌ "Nice work" → ✅ "Impressive effort"
❌ "OK project" → ✅ "Well-executed project"

📌 همینطور در فارسی: از واژگان قوی تر استفاده کن

❓ Quiz:
Which sounds most professional?

A) "That's very good work"
B) "That's exceptional work"
C) "That's nice"

👉 Answer: B ✓
━━━━━━━━━━━━━━━━━━━━━
💼 Use these in meetings and emails!`,

    'quick-quiz': `${emoji} QUICK QUIZ: Present vs. Perfect 🧠

━━━━━━━━━━━━━━━━━━━━━
Question: Which is WRONG?

A) "I have been to Paris last year"
B) "I went to Paris last year"
C) "I've been living here for 5 years"

📌 (فارسی): با specific past time از Simple Past استفاده کن

👉 Answer: A ✗
Reason: "last year" = specific time → use Simple Past

✅ Correct: "I went to Paris last year"
====================================
🎯 Now you know! Test yourself NOW!`,
  };

  return {
    text: examples[type] || `${emoji} ENGLISH TIP\n\n━━━━━━━━━━━━━━━━━━━━━\n⏰ Check your inbox later for more!\n\n🎯 Master one concept at a time!\n🤖 More tips? DM the bot!\n━━━━━━━━━━━━━━━━━━━━━`,
    media: null,
  };
}

async function generateStoryWithOpenAI(topicObj, apiKey, model) {
  if (!apiKey) {
    console.log('[info] No OPENAI_API_KEY, using fallback story');
    return fallbackStory(topicObj);
  }

  const { type, emoji, topic } = topicObj;

  const prompt = `You are an English language coach creating engaging Telegram Story content (text-only, no images).

Topic: ${topic}
Type: ${type}
Emoji to start with: ${emoji}

Create SHORT, punchy content with this EXACT structure:
1. Start with emoji and title/hook
2. Include a line of separator: ━━━━━━━━━━━━━━━━━━━━━
3. Add English teaching point (1-2 sentences)
4. Add Persian explanation in parentheses or on next line (e.g., "(فارسی): [explanation]")
5. Give 1-2 example sentences with ✅ or ❌
6. Include a simple quiz with 3 options (A, B, C)
7. Provide the answer
8. End with separator and call-to-action

Guidelines:
- Maximum 300 words
- Use lots of emojis (💡✨🎯🗣️💬🔄⬆️❓)
- Focus ONLY on vocabulary, grammar, idioms, expressions—NOT exam tips
- Make Persian explanations clear and helpful
- Quiz should test understanding of the taught concept
- Use Unicode borders: ━━━━━━━━━━━━━━━━━━━━━
- Be conversational and mobile-friendly
- Each section should be clearly separated

Format:
${emoji} [TITLE]

━━━━━━━━━━━━━━━━━━━━━
📌 [English explanation]

(فارسی): [Clear Persian explanation]

✍️ Examples:
[Examples with checkmarks]

❓ Quiz:
[Question with A, B, C options]

👉 Answer: [Answer] ✓

━━━━━━━━━━━━━━━━━━━━━
[Motivational CTA]`;

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
            content: 'You create brief, engaging English learning content with Persian explanations and quizzes for Telegram. Use lots of emojis. Format clearly with separators.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 600,
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

    return {
      text,
      media: null,
    };
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

async function findTemplateImages() {
  const templateDir = path.join(process.cwd(), 'public', 'telegram-story-templates');
  try {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(templateDir);
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    return imageFiles.map(f => path.join(templateDir, f));
  } catch {
    return [];
  }
}

async function postStory(botToken, chatId, story) {
  // Post as text-only message with decorative formatting
  const message = `${story.text}`;
  
  return await telegramRequest(botToken, 'sendMessage', {
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
    parse_mode: 'HTML',
  });
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
    console.log('\n' + '='.repeat(50));
    console.log('STORY PREVIEW');
    console.log('='.repeat(50));
    console.log(story.text);
    console.log('='.repeat(50) + '\n');
    return;
  }

  if (options.dryRun) {
    console.log('[dry-run] Would post story:');
    console.log(story.text);
    return;
  }

  console.log('[posting] Story to Telegram...');
  const result = await postStory(botToken, chatId, story);
  console.log('[success] Story posted:', result.result?.message_id);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
