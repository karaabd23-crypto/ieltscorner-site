#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MODEL = 'gpt-4.1-mini';

// Story topics - shorter, more engaging content
const STORY_TOPICS = [
  { type: 'vocab-tip', topic: 'One powerful word to sound more professional' },
  { type: 'grammar-hack', topic: 'Fix this common mistake in 10 seconds' },
  { type: 'idiom-quick', topic: 'Today\'s idiom - use it in conversation' },
  { type: 'pronunciation', topic: 'How to say this tricky word correctly' },
  { type: 'expression', topic: 'React like a native speaker' },
  { type: 'vocab-pair', topic: 'Two words people always confuse' },
  { type: 'phrase-boost', topic: 'Say this instead of "very good"' },
  { type: 'quick-quiz', topic: 'Which sentence is correct?' },
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
  const { type, topic } = topicObj;
  const emojiMap = {
    'vocab-tip': '💡',
    'grammar-hack': '✨',
    'idiom-quick': '🎯',
    'pronunciation': '🗣️',
    'expression': '💬',
    'vocab-pair': '🔄',
    'phrase-boost': '⬆️',
    'quick-quiz': '❓',
  };

  const emoji = emojiMap[type] || '📚';

  // Different examples based on type
  const examples = {
    'vocab-tip': `💡 Word Power: "Serendipity"\n\nMeaning: Finding good things by chance\n\nExample:\n"Meeting you here was pure serendipity!"\n\n✨ Try it today!`,
    'grammar-hack': `✨ Quick Fix!\n\nSay: "I've lived here for 5 years"\nNOT: "I live here for 5 years"\n\nPresent Perfect for ongoing time!\n\n🎯 Use it correctly!`,
    'idiom-quick': `🎯 Hit the nail on the head\n\nMeaning: Be exactly right\n\nExample:\n"You hit the nail on the head with that analysis!"\n\n💪 Try it in conversation!`,
    'pronunciation': `🗣️ Say it right!\n\n"Comfortable"\n❌ com-FOR-table\n✅ KUMF-ter-bul\n\n3 syllables, not 4!\n\n🎧 Practice now!`,
    'expression': `💬 React like a native!\n\nInstead of "very good":\n✅ "That's brilliant!"\n✅ "Fantastic work!"\n✅ "Outstanding!"\n\n⬆️ Level up your English!`,
    'vocab-pair': `🔄 Confusing Words?\n\nAFFECT = verb (to influence)\nEFFECT = noun (result)\n\n"The rain affects my mood"\n"The effect was dramatic"\n\n🎯 Got it?`,
    'phrase-boost': `⬆️ Say this instead!\n\n❌ "Very good"\n✅ "Brilliant"\n✅ "Exceptional"\n✅ "Outstanding"\n\nSound more professional!\n\n💼 Try it today!`,
    'quick-quiz': `❓ Which is correct?\n\nA) "I've been to Paris last year"\nB) "I went to Paris last year"\n\n..\n..\nAnswer: B!\n\nUse Simple Past with specific past time!\n\n✅ Now you know!`,
  };

  return {
    text: examples[type] || `${emoji} ${topic}\n\n"Brilliant" is stronger than "very good"\n\nExample:\n"That presentation was brilliant!"\n\n🤖 Want more? DM the bot!`,
    media: null,
  };
}

async function generateStoryWithOpenAI(topicObj, apiKey, model) {
  if (!apiKey) {
    console.log('[info] No OPENAI_API_KEY, using fallback story');
    return fallbackStory(topicObj);
  }

  const { type, topic } = topicObj;

  const prompt = `You are an English language coach creating a Telegram Story (24-hour temporary content).

Topic: ${topic}
Type: ${type}

Create SHORT, punchy content optimized for mobile viewing:
- Maximum 60 words total
- Start with an emoji
- One clear point or tip
- Include ONE example sentence
- End with a quick CTA like "Try it!" or "Use it today!"

Focus ONLY on vocabulary, grammar, idioms, expressions—NOT exam tips.

Format:
[Emoji] [Title/Hook]

[Main teaching point - 1-2 sentences]

Example:
[Your example]

[Short CTA]

Keep it conversational and engaging!`;

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
            content: 'You create brief, engaging English learning content for Telegram Stories.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 200,
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
      media: null, // Can be enhanced later with image generation
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

async function postStory(botToken, chatId, story) {
  // Note: As of now, Telegram Bot API doesn't have native story posting
  // We'll post as a regular message with story-style formatting
  // When native story API is available, update this method
  
  const message = `📖 Story\n\n${story.text}`;
  
  return await telegramRequest(botToken, 'sendMessage', {
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
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
