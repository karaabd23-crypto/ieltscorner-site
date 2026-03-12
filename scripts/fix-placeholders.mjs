/**
 * fix-placeholders.mjs
 * Scans every lesson .md file for generic placeholder content and replaces
 * it with topic-aware offline content (no API usage).
 *
 * Usage:
 *   node scripts/fix-placeholders.mjs            # fix all affected lessons
 *   node scripts/fix-placeholders.mjs --dry-run  # show which files would be changed
 *   node scripts/fix-placeholders.mjs --limit 10 # fix first 10 affected files only
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

const LESSONS_DIR = resolve('src/content/lessons');

// Placeholder sentinel strings
const HAS_PLACEHOLDER = [
  '<strong>Form 1</strong>',
  '<em>Example sentence here</em>',
  'When you need to describe...',
  'Incorrect example here',
  'Correct example here',
  'Write a clear, simple definition here',
  '**Why this works:** Explanation here.',
];

function hasPlaceholders(text) {
  return HAS_PLACEHOLDER.some((p) => text.includes(p));
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const raw = match[1];
  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
    return m ? m[1].trim() : '';
  };
  return {
    title: get('title'),
    level: get('level'),
    category: get('category'),
    excerpt: get('excerpt'),
  };
}

async function generateContent(meta) {
  const topic = normalizeTopic(meta.title);
  const level = normalizeLevel(meta.level);
  const category = String(meta.category || '').toLowerCase();

  const row1 = buildRow(topic, level, category, 1);
  const row2 = buildRow(topic, level, category, 2);
  const wrongRight = buildWrongRight(topic, level, category);
  const realTests = buildRealTestExamples(topic, level, category);

  return {
    definition: buildDefinition(topic, level, category),
    row1_rule: row1.rule,
    row1_example: row1.example,
    row1_when: row1.when,
    row2_rule: row2.rule,
    row2_example: row2.example,
    row2_when: row2.when,
    incorrect_example: wrongRight.incorrect,
    correct_example: wrongRight.correct,
    mistake_explanation: wrongRight.why,
    ielts_example: realTests.ielts_example,
    ielts_why: realTests.ielts_why,
    celpip_example: realTests.celpip_example,
    celpip_why: realTests.celpip_why,
  };
}

function normalizeLevel(level) {
  const n = String(level || '').trim().toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(n) ? n : 'B1';
}

function normalizeTopic(title) {
  return String(title || 'this language point')
    .replace(/\s*\((A1|A2|B1|B2|C1|C2)\)\s*/gi, ' ')
    .replace(/[\-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function levelAudience(level) {
  if (level === 'A1' || level === 'A2') return 'beginner';
  if (level === 'B1' || level === 'B2') return 'intermediate';
  return 'advanced';
}

function buildDefinition(topic, level, category) {
  const audience = levelAudience(level);
  if (category === 'vocabulary') {
    return `This lesson teaches ${topic} for ${audience} learners, so you can choose more precise words in IELTS and CELPIP responses.`;
  }
  if (category === 'writing') {
    return `This lesson explains how to use ${topic} in clear written English, helping ${audience} learners produce stronger task responses.`;
  }
  if (category === 'speaking') {
    return `This lesson shows how to use ${topic} naturally in spoken English, so ${audience} learners can sound clearer and more confident.`;
  }
  return `This lesson explains ${topic} with practical patterns and examples, helping ${audience} learners use English more accurately.`;
}

function topicHints(topic) {
  const t = topic.toLowerCase();
  return {
    conditional: /conditional|if/.test(t),
    article: /article|a an the/.test(t),
    tense: /past|present|future|perfect|continuous|simple/.test(t),
    passive: /passive/.test(t),
    relative: /relative clause|who|which|that\b/.test(t),
    modal: /modal|must|should|may|might|can|could|would/.test(t),
    preposition: /preposition/.test(t),
    vocab: /vocab|vocabulary|words|collocation|phrasal verb/.test(t),
  };
}

function buildRow(topic, level, category, index) {
  const hints = topicHints(topic);
  const isFirst = index === 1;

  if (hints.conditional) {
    return isFirst
      ? {
          rule: 'If + present, result',
          example: 'If I have time tonight, I will review one writing task.',
          when: 'To talk about real future possibilities',
        }
      : {
          rule: 'If + past, would',
          example: 'If I lived closer, I would join every weekend workshop.',
          when: 'To describe unreal or imagined situations',
        };
  }

  if (hints.article) {
    return isFirst
      ? {
          rule: 'Use a/an first mention',
          example: 'I bought a book and an umbrella on my way home.',
          when: 'For singular nouns introduced first time',
        }
      : {
          rule: 'Use the specific noun',
          example: 'The book was useful, so I shared it with my classmate.',
          when: 'For known or specific nouns',
        };
  }

  if (hints.tense) {
    return isFirst
      ? {
          rule: 'Main tense pattern',
          example: 'I study in the morning and I review vocabulary at night.',
          when: 'For the core time meaning of the tense',
        }
      : {
          rule: 'Contrast with another tense',
          example: 'I was studying when my teacher sent the assignment.',
          when: 'When two time actions interact',
        };
  }

  if (hints.passive) {
    return isFirst
      ? {
          rule: 'Be + past participle',
          example: 'The final report was submitted before the deadline.',
          when: 'When action matters more than the doer',
        }
      : {
          rule: 'Passive with by-phrase',
          example: 'The survey was analyzed by the research team yesterday.',
          when: 'When the agent is useful to mention',
        };
  }

  if (hints.modal) {
    return isFirst
      ? {
          rule: 'Modal + base verb',
          example: 'You should plan your ideas before you start writing.',
          when: 'For advice, ability, or possibility',
        }
      : {
          rule: 'Modal in past context',
          example: 'I could have answered better with more preparation.',
          when: 'To reflect on past ability or possibility',
        };
  }

  if (hints.preposition) {
    return isFirst
      ? {
          rule: 'Core preposition choice',
          example: 'The class starts at 9:00 and ends at 10:30.',
          when: 'For standard place or time reference',
        }
      : {
          rule: 'Preposition in phrase',
          example: 'She is interested in public health and community work.',
          when: 'In fixed collocations and expressions',
        };
  }

  if (hints.vocab || category === 'vocabulary') {
    return isFirst
      ? {
          rule: 'Core word in context',
          example: `The speaker gave a clear example of ${topic.toLowerCase()} during the lesson.`,
          when: 'To express the basic meaning clearly',
        }
      : {
          rule: 'Collocation or phrase',
          example: `We practiced useful phrases related to ${topic.toLowerCase()} in pairs.`,
          when: 'To sound more natural and precise',
        };
  }

  if (category === 'speaking') {
    return isFirst
      ? {
          rule: 'Simple response frame',
          example: `I usually apply ${topic.toLowerCase()} when I explain my opinion in Part 3.`,
          when: 'For clear and direct spoken answers',
        }
      : {
          rule: 'Extended response frame',
          example: `I add reasons and examples, which makes my ${topic.toLowerCase()} more convincing.`,
          when: 'To develop longer spoken responses',
        };
  }

  if (category === 'writing') {
    return isFirst
      ? {
          rule: 'Clear sentence pattern',
          example: `This paragraph uses ${topic.toLowerCase()} to present one main idea clearly.`,
          when: 'For accurate and readable task writing',
        }
      : {
          rule: 'Formal extension pattern',
          example: `In formal tasks, ${topic.toLowerCase()} helps connect claims and evidence logically.`,
          when: 'To improve coherence and formal tone',
        };
  }

  const difficulty = levelAudience(level);
  return isFirst
    ? {
        rule: 'Core usage pattern',
        example: `Students use ${topic.toLowerCase()} to build clear ${difficulty} level sentences.`,
        when: 'For common daily communication',
      }
    : {
        rule: 'Expanded usage pattern',
        example: `This pattern helps learners use ${topic.toLowerCase()} with better precision and control.`,
        when: 'For more detailed meaning and nuance',
      };
}

function buildWrongRight(topic, level, category) {
  const hints = topicHints(topic);

  if (hints.article) {
    return {
      incorrect: 'I bought book from store near my office.',
      correct: 'I bought a book from the store near my office.',
      why: 'Countable singular nouns need an article, and specific nouns usually take “the”.',
    };
  }

  if (hints.conditional) {
    return {
      incorrect: 'If I will have time, I will call you tonight.',
      correct: 'If I have time, I will call you tonight.',
      why: 'In first conditionals, the if-clause uses present simple, not “will”.',
    };
  }

  if (hints.passive) {
    return {
      incorrect: 'The report submitted yesterday by the team.',
      correct: 'The report was submitted yesterday by the team.',
      why: 'Passive clauses need the correct form of “be” plus a past participle.',
    };
  }

  if (hints.tense) {
    return {
      incorrect: 'Yesterday I go to class and learn new words.',
      correct: 'Yesterday I went to class and learned new words.',
      why: 'Past-time markers require past verb forms for sequence and accuracy.',
    };
  }

  if (category === 'vocabulary' || hints.vocab) {
    return {
      incorrect: `The essay used ${topic.toLowerCase()} in a not clear way.`,
      correct: `The essay used ${topic.toLowerCase()} in a clearer and more precise way.`,
      why: 'Choose natural collocations and concise wording to improve clarity.',
    };
  }

  return {
    incorrect: `I use ${topic.toLowerCase()} wrong in this sentence and it sound unclear.`,
    correct: `I used ${topic.toLowerCase()} incorrectly in this sentence, so it sounded unclear.`,
    why: 'Accurate grammar and tense choice make the sentence clear and natural.',
  };
}

function buildRealTestExamples(topic, level, category) {
  const topicLc = topic.toLowerCase();
  if (category === 'writing') {
    return {
      ielts_example: `"Overall, the data shows that ${topicLc} plays a key role in the final trend."`,
      ielts_why: `It applies ${topicLc} in a formal IELTS style with a clear claim.`,
      celpip_example: `"In my opinion, using ${topicLc} makes this response clearer and more organized."`,
      celpip_why: `It uses ${topicLc} to present a direct opinion plus support.`,
    };
  }

  if (category === 'speaking') {
    return {
      ielts_example: `"One useful strategy is to use ${topicLc} so my answer sounds natural and focused."`,
      ielts_why: `It demonstrates ${topicLc} with a clear structure and fluent delivery.`,
      celpip_example: `"When I practiced, ${topicLc} helped me explain my idea faster and more clearly."`,
      celpip_why: `It shows how ${topicLc} improves clarity under time pressure.`,
    };
  }

  return {
    ielts_example: `"In this sentence, ${topicLc} is used accurately to express the intended meaning."`,
    ielts_why: `It shows correct grammar control and clear communication.`,
    celpip_example: `"I used ${topicLc} in my response to make the message precise and natural."`,
    celpip_why: `It demonstrates exam-ready language that is easy to follow.`,
  };
}

function applyContent(text, content) {
  let result = text;

  // Definition line
  result = result.replace(
    /Write a clear, simple definition here\..*?(?=\n)/,
    content.definition
  );

  // Table row 1
  result = result.replace(
    /<td style="padding: 0\.75rem; border: 1px solid #ddd;"><strong>Form 1<\/strong><\/td>/,
    `<td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>${escHtml(content.row1_rule)}</strong></td>`
  );
  // First occurrence of "Example sentence here" → row 1
  result = result.replace(
    /<td style="padding: 0\.75rem; border: 1px solid #ddd;"><em>Example sentence here<\/em><\/td>/,
    `<td style="padding: 0.75rem; border: 1px solid #ddd;"><em>${escHtml(content.row1_example)}</em></td>`
  );
  result = result.replace(
    /<td style="padding: 0\.75rem; border: 1px solid #ddd;">When you need to describe\.\.\.<\/td>/,
    `<td style="padding: 0.75rem; border: 1px solid #ddd;">${escHtml(content.row1_when)}</td>`
  );

  // Table row 2
  result = result.replace(
    /<td style="padding: 0\.75rem; border: 1px solid #ddd;"><strong>Form 2<\/strong><\/td>/,
    `<td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>${escHtml(content.row2_rule)}</strong></td>`
  );
  // Second occurrence of "Example sentence here" → row 2
  result = result.replace(
    /<td style="padding: 0\.75rem; border: 1px solid #ddd;"><em>Example sentence here<\/em><\/td>/,
    `<td style="padding: 0.75rem; border: 1px solid #ddd;"><em>${escHtml(content.row2_example)}</em></td>`
  );
  result = result.replace(
    /<td style="padding: 0\.75rem; border: 1px solid #ddd;">When you need to express\.\.\.<\/td>/,
    `<td style="padding: 0.75rem; border: 1px solid #ddd;">${escHtml(content.row2_when)}</td>`
  );

  // Mistakes section — use code block replacements
  result = result.replace(/\nIncorrect example here\n/, `\n${content.incorrect_example}\n`);
  result = result.replace(/\nCorrect example here\n/, `\n${content.correct_example}\n`);
  result = result.replace(
    /\*\*Why\?\*\* Explain the mistake and the correct approach\./,
    `**Why?** ${content.mistake_explanation}`
  );

  result = result.replace(
    /> "The chart shows the trend in\.\.\."/,
    `> ${content.ielts_example}`
  );
  result = result.replace(
    /> "Let me describe a time when\.\.\."/,
    `> ${content.celpip_example}`
  );

  let whyCount = 0;
  result = result.replace(/\*\*Why this works:\*\* Explanation here\./g, () => {
    whyCount += 1;
    return whyCount === 1
      ? `**Why this works:** ${content.ielts_why}`
      : `**Why this works:** ${content.celpip_why}`;
  });

  return result;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit=') || a === '--limit');
  let limit = Infinity;
  if (limitArg) {
    const idx = args.indexOf('--limit');
    limit = idx !== -1 ? parseInt(args[idx + 1], 10) : parseInt(limitArg.split('=')[1], 10);
  }

  const allFiles = await readdir(LESSONS_DIR);
  const mdFiles = allFiles.filter((f) => f.endsWith('.md'));

  const affected = [];
  for (const file of mdFiles) {
    const text = await readFile(join(LESSONS_DIR, file), 'utf8');
    if (hasPlaceholders(text)) {
      affected.push(file);
    }
  }

  console.log(`Found ${affected.length} lesson(s) with placeholder content.`);

  if (isDryRun) {
    affected.forEach((f) => console.log(' -', f));
    return;
  }

  const toProcess = affected.slice(0, limit);
  console.log(`Processing ${toProcess.length} file(s) in offline mode...\n`);

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    const filePath = join(LESSONS_DIR, file);
    const text = await readFile(filePath, 'utf8');
    const meta = parseFrontmatter(text);

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${file} ... `);

    try {
      const content = await generateContent(meta);
      const updated = applyContent(text, content);
      await writeFile(filePath, updated, 'utf8');
      fixed++;
      console.log('✓');
    } catch (err) {
      failed++;
      console.log(`✗ ${err.message}`);
    }

  }

  console.log(`\nDone. Fixed: ${fixed}  Failed: ${failed}  Remaining: ${affected.length - toProcess.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
