#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
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

const LESSONS_DIR = path.join(process.cwd(), 'src', 'content', 'lessons');

const SIGNATURE_BLOCK = [
  '🌈✨ Kay\'s English Corner',
  'Your Gateway to English Success in Canada 🇨🇦',
  '🌐 Lessons + services: https://ieltscorner.ca',
  '🔗 Join us: https://t.me/kaysenglishcorner',
].join('\n');

const CATEGORY_LABELS = {
  grammar: { lesson: '🔎 Grammar Fix', mini: '⚡ Quick Grammar' },
  vocabulary: { lesson: '🔄 Useful English', mini: '🔑 Word Power' },
  writing: { lesson: '✍️ Writing Move', mini: '✍️ Quick Writing' },
  speaking: { lesson: '🎤 Speaking Tip', mini: '🗣 Quick Speaking' },
  reading: { lesson: '📘 Reading Skill', mini: '📘 Quick Reading' },
  listening: { lesson: '🎧 Listening Tip', mini: '🎧 Quick Listening' },
  exam: { lesson: '🎯 Exam Skill', mini: '🎯 Quick Skill' },
};

const CATEGORY_HOOKS = {
  grammar: [
    'This small change makes a big difference.',
    'A lot of learners get this wrong at first.',
    'This one looks small, but it changes the whole sentence.',
  ],
  vocabulary: [
    'These words look similar, but they do different jobs.',
    'This pair confuses a lot of learners.',
    'If you mix these up, your English sounds less natural.',
  ],
  writing: [
    'This is one of the easiest ways to make your writing stronger.',
    'A better score often starts with one cleaner writing move.',
    'This is not about longer sentences. It is about smarter ones.',
  ],
  speaking: [
    'You do not need a long answer. You need a clear one.',
    'A short clear answer is usually better than a messy long one.',
    'This tip helps you sound more natural right away.',
  ],
  reading: [
    'This skill saves time and stops panic in reading tasks.',
    'A better reading score often comes from one smarter habit.',
    'Do not read everything the same way. Read with a target.',
  ],
  listening: [
    'This tip helps you stop chasing every single word.',
    'A stronger listening score starts with better attention, not more stress.',
    'You do not need every word. You need the right words.',
  ],
  exam: [
    'A better exam result often comes from one simpler habit.',
    'This is the kind of move that saves time under pressure.',
    'Small strategy changes can raise your score fast.',
  ],
};

const CATEGORY_PERSIAN_NOTES = {
  grammar: 'اول معنی رو بگیر، بعد فرم درست رو بذار توی جمله.',
  vocabulary: 'کلمه رو با جمله یاد بگیر، نه فقط با ترجمه.',
  writing: 'قبل نوشتن، کار هر جمله و هر پاراگراف رو معلوم کن.',
  speaking: 'کوتاه و واضح بگو، بعد یه دلیل یا مثال اضافه کن.',
  reading: 'اول سوال رو بفهم، بعد برو سراغ کلمه یا ایده‌ی کلیدی.',
  listening: 'دنبال تک‌تک کلمه‌ها نباش؛ معنی کلی و کلمات مهم رو بگیر.',
  exam: 'اول هدف سوال رو بفهم، بعد با یه روش ساده جوابش کن.',
};

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
  const root = process.cwd();
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.env.local'));
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    exam: 'AUTO',
    mode: 'lesson',
    topic: '',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--exam') {
      options.exam = String(argv[index + 1] ?? 'auto').toUpperCase();
      index += 1;
    } else if (arg === '--mode') {
      options.mode = String(argv[index + 1] ?? 'lesson').toLowerCase();
      index += 1;
    } else if (arg === '--topic') {
      options.topic = String(argv[index + 1] ?? '').trim();
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const validExams = new Set(['AUTO', 'IELTS', 'CELPIP', 'ESL']);
  if (!validExams.has(options.exam)) {
    throw new Error('--exam must be one of: auto, IELTS, CELPIP, ESL');
  }

  const validModes = new Set(['lesson', 'mini-tip']);
  if (!validModes.has(options.mode)) {
    throw new Error('--mode must be one of: lesson, mini-tip');
  }

  return options;
}

function extractScalar(frontmatter, fieldName) {
  const quotedMatch = frontmatter.match(new RegExp(`^${fieldName}:\\s*"([^"]*)"\\s*$`, 'm'));
  if (quotedMatch) return quotedMatch[1].trim();

  const singleQuotedMatch = frontmatter.match(new RegExp(`^${fieldName}:\\s*'([^']*)'\\s*$`, 'm'));
  if (singleQuotedMatch) return singleQuotedMatch[1].trim();

  const plainMatch = frontmatter.match(new RegExp(`^${fieldName}:\\s*([^\\n]+?)\\s*$`, 'm'));
  return plainMatch ? plainMatch[1].trim() : '';
}

function extractList(frontmatter, fieldName) {
  const match = frontmatter.match(new RegExp(`^${fieldName}:\\s*\\[([^\\]]*)\\]\\s*$`, 'm'));
  if (!match) return [];

  return match[1]
    .split(',')
    .map((item) => stripWrappingQuotes(item))
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractQuiz(frontmatter) {
  const quizMatch = frontmatter.match(
    /-\s*prompt:\s*"([^"]+)"[\s\S]*?options:\s*\n((?:\s*-\s*"[^"]+"\s*\n)+)\s*correctIndex:\s*(\d+)\s*\n\s*explanation:\s*"([^"]+)"/m,
  );
  if (!quizMatch) return null;

  const [, question, optionsBlock, correctIndexRaw, explanation] = quizMatch;
  const options = [...optionsBlock.matchAll(/-\s*"([^"]+)"/g)].map((match) => match[1].trim());
  if (options.length < 2) return null;

  const correctIndex = Math.max(0, Math.min(options.length - 1, Number.parseInt(correctIndexRaw, 10) || 0));
  return {
    question: question.trim().slice(0, 290),
    options: options.slice(0, 10),
    correctIndex,
    explanation: explanation.trim().slice(0, 180),
  };
}

function cleanupLessonTitle(title) {
  return String(title ?? '')
    .replace(/\s*\((A1|A2|B1|B2|C1|C2)\)\s*$/i, '')
    .trim();
}

function firstSentence(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? text).trim();
}

function extractExamplesByClass(body, className) {
  const collected = [];
  const pattern = new RegExp(`${className}"><span>[^<]*<\\/span>([\\s\\S]*?)<\\/p>`, 'g');
  for (const match of body.matchAll(pattern)) {
    const text = htmlToPlainText(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (text && !collected.includes(text)) {
      collected.push(text);
    }
  }
  return collected;
}

function extractPatternExamples(body) {
  const collected = [];
  for (const match of body.matchAll(/lesson-pattern-sentence">([\s\S]*?)<\/div>/g)) {
    const text = htmlToPlainText(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (text && !collected.includes(text)) {
      collected.push(text);
    }
  }
  return collected;
}

function extractFixTip(body) {
  const match = body.match(/lesson-fix-line"><strong>Fix:<\/strong>\s*([\s\S]*?)<\/p>/);
  if (!match) return '';
  return htmlToPlainText(match[1] ?? '').replace(/\s+/g, ' ').trim();
}

function inferCategory(category, title) {
  const normalized = String(category ?? '').trim().toLowerCase();
  if (normalized) return normalized;

  const titleText = String(title ?? '').toLowerCase();
  if (titleText.includes('writing')) return 'writing';
  if (titleText.includes('speaking')) return 'speaking';
  if (titleText.includes('reading')) return 'reading';
  if (titleText.includes('listening')) return 'listening';
  if (titleText.includes('vocabulary') || titleText.includes('word formation')) return 'vocabulary';
  return 'grammar';
}

function buildLessonHashtags(lesson) {
  const category = inferCategory(lesson.category, lesson.title);
  const level = String(lesson.level ?? '').toUpperCase();
  const examList = Array.isArray(lesson.exam) ? lesson.exam : [];
  const tags = [
    {
      grammar: '#Grammar',
      vocabulary: '#Vocabulary',
      writing: '#Writing',
      speaking: '#Speaking',
      reading: '#Reading',
      listening: '#Listening',
      exam: '#ExamEnglish',
    }[category] ?? '#LearnEnglish',
  ];

  if (examList.includes('CELPIP')) {
    tags.push('#CELPIP');
  } else if (examList.includes('IELTS')) {
    tags.push('#IELTS');
  } else {
    tags.push('#LearnEnglish');
  }

  if (level) {
    tags.push(`#${level}English`);
  }

  return [...new Set(tags)].slice(0, 4);
}

function buildFallbackQuiz(lesson) {
  const title = cleanupLessonTitle(lesson.title);
  return {
    question: `What is the main idea in ${title}?`,
    options: [
      lesson.heroTip || 'Understand the meaning first',
      'Use the longest words possible',
      'Make the sentence more confusing',
    ],
    correctIndex: 0,
    explanation: 'Start with the main meaning and the real job of the sentence.',
  };
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

function seedFromText(value) {
  return [...String(value ?? '')].reduce((sum, char) => sum + char.codePointAt(0), 0);
}

function pickFromList(list, seed) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[Math.abs(seed) % list.length];
}

function appendSignature(text) {
  const body = String(text ?? '').trim();
  if (!body) return SIGNATURE_BLOCK;
  if (body.includes('Kay\'s English Corner') || body.includes('Kay’s English Corner')) {
    return body;
  }
  return `${body}\n\n${SIGNATURE_BLOCK}`;
}

function normalizeActionLine(category, title) {
  if (category === 'writing') {
    return '🎯 Your turn:\nUse this move in one short IELTS or CELPIP paragraph.';
  }
  if (category === 'speaking') {
    return `🎯 Your turn:\nSay one short answer out loud with ${title.toLowerCase()}.`;
  }
  if (category === 'reading' || category === 'listening') {
    return '🎯 Your turn:\nTry this idea in your next practice set.';
  }
  if (category === 'vocabulary') {
    return `🎯 Quick challenge:\nWrite one sentence with ${title.toLowerCase()}.`;
  }
  return `🎯 Your turn:\nMake one sentence with ${title.toLowerCase()}.`;
}

function buildLessonContent(lesson, mode) {
  const category = inferCategory(lesson.category, lesson.title);
  const labels = CATEGORY_LABELS[category] ?? CATEGORY_LABELS.exam;
  const title = cleanupLessonTitle(lesson.title);
  const seed = seedFromText(`${lesson.slug}:${mode}`);
  const hook = pickFromList(CATEGORY_HOOKS[category] ?? CATEGORY_HOOKS.exam, seed);
  const heroTip = firstSentence(lesson.heroTip) || 'Keep the meaning clear first.';
  const strongExamples = Array.isArray(lesson.strongExamples) ? lesson.strongExamples : [];
  const weakExamples = Array.isArray(lesson.weakExamples) ? lesson.weakExamples : [];
  const patternExamples = Array.isArray(lesson.patternExamples) ? lesson.patternExamples : [];
  const primaryStrong = strongExamples[0] || patternExamples[0] || '';
  const secondaryStrong = strongExamples[1] || patternExamples[1] || '';
  const primaryWeak = weakExamples[0] || '';
  const fixTip = firstSentence(lesson.fixTip);
  const persianNote = CATEGORY_PERSIAN_NOTES[category] ?? CATEGORY_PERSIAN_NOTES.exam;
  const actionLine = normalizeActionLine(category, title);

  const lines = [
    `${mode === 'mini-tip' ? labels.mini : labels.lesson}: ${title}`,
    '',
    hook,
    '',
  ];

  if (category === 'grammar' || category === 'vocabulary') {
    if (primaryWeak && primaryStrong) {
      lines.push('❌ Common mistake:', primaryWeak, '', '✅ Better:', primaryStrong, '');
    }
    lines.push('💡 Key point:', heroTip, '');
    if (secondaryStrong && mode !== 'mini-tip') {
      lines.push('✍️ One more example:', secondaryStrong, '');
    }
  } else if (category === 'writing') {
    lines.push('💡 The move:', heroTip, '');
    if (primaryStrong) {
      lines.push('✅ Strong example:', primaryStrong, '');
    }
    if (secondaryStrong) {
      lines.push(mode === 'mini-tip' ? '✍️ Another useful line:' : '✍️ One more example:', secondaryStrong, '');
    }
    if (primaryWeak && mode !== 'mini-tip') {
      lines.push('❌ Watch for this:', primaryWeak, '');
    }
  } else {
    lines.push('💡 Main tip:', heroTip, '');
    if (primaryStrong) {
      lines.push('✅ Example:', primaryStrong, '');
    }
    if (secondaryStrong) {
      lines.push(mode === 'mini-tip' ? '✍️ Another example:' : '✅ Another example:', secondaryStrong, '');
    }
  }

  if (fixTip && mode !== 'mini-tip') {
    lines.push('🛠 Quick fix:', fixTip, '');
  }

  lines.push('🇮🇷 فارسی کوتاه:', persianNote, '', actionLine);

  return {
    title,
    topic: lesson.slug,
    level: lesson.level || '',
    postBody: appendSignature(lines.join('\n')),
    hashtags: buildLessonHashtags(lesson),
    quizzes: [lesson.quiz || buildFallbackQuiz(lesson)],
  };
}

function buildCustomTopic(topic, mode) {
  const cleanTopic = String(topic ?? '').trim();
  const lines = [
    `${mode === 'mini-tip' ? '⚡ Quick English' : '🔎 English Tip'}: ${cleanTopic}`,
    '',
    'This is a useful English point that can help you sound clearer right away.',
    '',
    '💡 Key idea:',
    'Understand the meaning first, then use it in one natural sentence.',
    '',
    '🇮🇷 فارسی کوتاه:',
    'اول معنی رو بگیر، بعد توی یه جمله‌ی طبیعی ازش استفاده کن.',
    '',
    `🎯 Your turn:\nMake one sentence with ${cleanTopic.toLowerCase()}.`,
  ];

  return {
    slug: `custom:${cleanTopic.toLowerCase()}`,
    title: cleanTopic,
    category: 'grammar',
    level: 'B1',
    exam: [],
    postBody: appendSignature(lines.join('\n')),
    hashtags: ['#LearnEnglish', '#EnglishTips', '#DailyEnglish'],
    quizzes: [{
      question: `What should you do first with ${cleanTopic}?`,
      options: [
        'Understand the meaning and use it in one natural sentence',
        'Memorize a hard definition only',
        'Make the sentence more complicated than necessary',
      ],
      correctIndex: 0,
      explanation: 'Real learning happens when you connect meaning to a natural example.',
    }],
  };
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

function normalizeTopicSearch(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesForcedTopic(lesson, topic) {
  const needle = normalizeTopicSearch(topic);
  if (!needle) return false;

  const haystacks = [
    lesson.slug,
    lesson.title,
    lesson.excerpt,
    lesson.heroTip,
  ].map(normalizeTopicSearch);

  return haystacks.some((haystack) => haystack.includes(needle));
}

const TELEGRAM_POSITIVE_KEYWORDS = [
  'article',
  'articles',
  'borrow',
  'lend',
  'make',
  'do',
  'few',
  'little',
  'should',
  'can',
  'could',
  'adjective',
  'adverb',
  'preposition',
  'question',
  'request',
  'email',
  'letter',
  'clinic',
  'doctor',
  'pharmacy',
  'job',
  'work',
  'phone',
  'appointment',
  'conversation',
  'speaking',
  'vocab',
  'vocabulary',
  'grammar',
  'time',
  'tense',
  'plural',
  'singular',
  'prefix',
  'suffix',
  'used to',
  'present perfect',
];

const TELEGRAM_NEGATIVE_KEYWORDS = [
  'advanced',
  'cohesion',
  'discourse',
  'reformulation',
  'techniques',
  'ambiguity',
  'argument structure',
  'formal expression',
  'formal essays',
  'punctuation and sentence control',
  'stance',
  'inversion',
  'emphasis',
  'clause combinations',
  'academic discussion',
  'time management by question type',
  'recover after missed detail',
  'note taking symbol system',
];

function countKeywordHits(text, keywords) {
  const haystack = normalizeTopicSearch(text);
  if (!haystack) return 0;
  return keywords.reduce((count, keyword) => (
    haystack.includes(normalizeTopicSearch(keyword)) ? count + 1 : count
  ), 0);
}

function scoreLessonForTelegram(lesson, mode) {
  const composite = [
    lesson.slug,
    lesson.title,
    lesson.excerpt,
    lesson.heroTip,
    ...(Array.isArray(lesson.strongExamples) ? lesson.strongExamples : []),
  ].join(' ');

  let score = 0;
  const category = inferCategory(lesson.category, lesson.title);
  const level = String(lesson.level ?? '').toUpperCase();
  const strongExampleCount = Array.isArray(lesson.strongExamples) ? lesson.strongExamples.length : 0;
  const weakExampleCount = Array.isArray(lesson.weakExamples) ? lesson.weakExamples.length : 0;

  score += strongExampleCount * 8;
  score += weakExampleCount * 3;
  score += countKeywordHits(composite, TELEGRAM_POSITIVE_KEYWORDS) * 7;
  score -= countKeywordHits(composite, TELEGRAM_NEGATIVE_KEYWORDS) * 12;

  if (level === 'A1' || level === 'A2') score += 10;
  if (level === 'B1' || level === 'B2') score += 16;
  if (level === 'C1') score += 4;
  if (level === 'C2') score -= 8;

  if (category === 'grammar' || category === 'vocabulary') score += 14;
  if (category === 'speaking') score += 10;
  if (category === 'writing') score += mode === 'mini-tip' ? -6 : 2;
  if (category === 'reading' || category === 'listening') score += mode === 'mini-tip' ? -2 : 0;

  if (lesson.slug.includes('celpip-task1') || lesson.slug.includes('ielts-task-1')) score += 8;
  if (lesson.slug.includes('walk-in') || lesson.slug.includes('pharmacy') || lesson.slug.includes('doctor')) score += 12;
  if (lesson.slug.includes('advanced-')) score -= 14;

  return score;
}

async function loadLessonBank() {
  const fileNames = (await readdir(LESSONS_DIR))
    .filter((fileName) => fileName.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right));

  const lessons = [];
  for (const fileName of fileNames) {
    const raw = await readFile(path.join(LESSONS_DIR, fileName), 'utf8');
    const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!frontmatterMatch) continue;

    const frontmatter = frontmatterMatch[1];
    if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;

    const title = extractScalar(frontmatter, 'title');
    if (!title) continue;

    const body = raw.slice(frontmatterMatch[0].length);
    lessons.push({
      slug: fileName.replace(/\.md$/i, ''),
      title,
      category: extractScalar(frontmatter, 'category'),
      level: extractScalar(frontmatter, 'level'),
      excerpt: extractScalar(frontmatter, 'excerpt'),
      heroTip: extractScalar(frontmatter, 'heroTip'),
      exam: extractList(frontmatter, 'exam'),
      strongExamples: extractExamplesByClass(body, 'lesson-line-strong'),
      weakExamples: extractExamplesByClass(body, 'lesson-line-weak'),
      patternExamples: extractPatternExamples(body),
      fixTip: extractFixTip(body),
      quiz: extractQuiz(frontmatter),
    });
  }

  return lessons;
}

function pickLesson(lessons, options, history, topicDedupeDays) {
  if (options.topic) {
    const matched = lessons.find((lesson) => matchesForcedTopic(lesson, options.topic));
    return matched ?? null;
  }

  const scoredLessons = [...lessons]
    .map((lesson) => ({
      lesson,
      score: scoreLessonForTelegram(lesson, options.mode),
    }))
    .sort((left, right) => right.score - left.score || left.lesson.slug.localeCompare(right.lesson.slug));

  const candidateCount = Math.min(scoredLessons.length, 80);
  const candidateLessons = scoredLessons.slice(0, candidateCount).map((entry) => entry.lesson);
  const salt = options.mode === 'mini-tip' ? 37 : 11;
  const startIndex = pickDeterministicIndex(candidateLessons.length, salt);

  for (let offset = 0; offset < candidateLessons.length; offset += 1) {
    const selected = candidateLessons[(startIndex + offset) % candidateLessons.length];
    if (!hasRecentTopic(history, selected.slug, { kind: 'content', maxAgeDays: topicDedupeDays })) {
      return selected;
    }
  }

  return candidateLessons[startIndex] ?? null;
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

function buildPostMessage(content) {
  const hashLine = content.hashtags.length ? `\n\n${content.hashtags.join(' ')}` : '';
  return `${content.postBody}${hashLine}`;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL?.trim() ?? '';
  const historyFilePath = resolveHistoryFilePath();
  const history = await loadPostHistory(historyFilePath);
  const topicDedupeDays = Math.max(7, Number.parseInt(process.env.TELEGRAM_TOPIC_DEDUPE_DAYS ?? '60', 10) || 60);

  const lessonBank = await loadLessonBank();
  if (lessonBank.length === 0) {
    throw new Error('No lesson files found for Telegram content generation.');
  }

  const pickedLesson = pickLesson(lessonBank, options, history, topicDedupeDays);
  const content = pickedLesson
    ? buildLessonContent(pickedLesson, options.mode)
    : buildCustomTopic(options.topic || 'Daily English', options.mode);

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: 'dry-run', content, pickedLesson }, null, 2));
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);
  if (!botToken || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN and/or target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL).');
  }

  const messageText = buildPostMessage(content);
  const messageFingerprint = createContentFingerprint(messageText, { stripSignature: true });

  if (hasFingerprint(history, messageFingerprint)) {
    console.log('[skip] Duplicate content found in persistent history. Skipping publish.');
    return;
  }

  if (hasRecentTopic(history, content.topic, { kind: 'content', maxAgeDays: topicDedupeDays })) {
    console.log(`[skip] Topic already posted in the last ${topicDedupeDays} days. Skipping publish.`);
    return;
  }

  const claim = await claimPostOwnership({
    kind: 'content',
    fingerprint: messageFingerprint,
    topic: content.topic,
  });

  if (!claim.claimed) {
    console.log('[skip] Another Telegram content run already owns this topic or fingerprint. Skipping publish.');
    return;
  }

  try {
    const publicSlug = resolvePublicChannelSlug(channelUrl, chatId);
    const existingTexts = await fetchRecentChannelTexts(publicSlug, { stripSignature: true });
    const normalizedMessage = toCanonicalPostText(messageText, { stripSignature: true });

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
    for (const quiz of content.quizzes) {
      if (!quiz || !Array.isArray(quiz.options) || quiz.options.length < 2) continue;

      await new Promise((resolve) => setTimeout(resolve, 700));
      const quizResult = await telegramRequest('sendPoll', {
        chat_id: chatId,
        question: quiz.question,
        options: quiz.options,
        type: 'quiz',
        correct_option_id: quiz.correctIndex,
        explanation: quiz.explanation,
        is_anonymous: true,
      }, botToken);

      if (quizResult?.result?.message_id) {
        quizMessageIds.push(quizResult.result.message_id);
      }
    }

    rememberFingerprint(history, messageFingerprint, {
      kind: 'content',
      topic: content.topic,
      messageId: messageResult?.result?.message_id ?? null,
      quizMessageIds,
      mode: options.mode,
    });
    await savePostHistory(historyFilePath, history);

    console.log(`[ok] Posted Telegram ${options.mode} content for lesson topic: ${content.topic}`);
  } finally {
    await releasePostOwnershipClaim(claim);
  }
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
