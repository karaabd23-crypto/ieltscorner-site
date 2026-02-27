#!/usr/bin/env node
// load environment variables from .env if present (safe to keep out of repo via .gitignore)
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CATEGORIES = ['grammar', 'vocabulary'];
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const LESSON_DIR = path.resolve('src/content/lessons');

function parseArgs(argv) {
  const opts = { count: 1, dryRun: false, model: DEFAULT_MODEL };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--count') {
      opts.count = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--model') {
      opts.model = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(opts.count) || opts.count < 1 || opts.count > 12) {
    throw new Error('--count must be an integer between 1 and 12');
  }

  return opts;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeYaml(value) {
  return String(value).replace(/"/g, '\\"');
}

async function existingLessonFiles() {
  const entries = await readdir(LESSON_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_'))
    .map((entry) => entry.name);
}

function pickLevelAndCategory(existingCount, index) {
  const total = existingCount + index;
  const level = LEVELS[total % LEVELS.length];
  const category = CATEGORIES[Math.floor(total / LEVELS.length) % CATEGORIES.length];
  return { level, category, seed: total };
}

function scoreMap(level) {
  const map = {
    A1: { ieltsBand: '3.0-4.0', clb: '2-3' },
    A2: { ieltsBand: '4.0-5.0', clb: '4-5' },
    B1: { ieltsBand: '5.0-6.0', clb: '6-7' },
    B2: { ieltsBand: '6.0-6.5', clb: '7-8' },
    C1: { ieltsBand: '7.0-8.0', clb: '9-10' },
    C2: { ieltsBand: '8.5-9.0', clb: '11-12' },
  };
  return map[level] ?? map.B2;
}

function shouldBePremium(level, seed) {
  if (!['C1', 'C2'].includes(level)) return false;
  return seed % 2 === 0;
}

function buildPrompt({ level, category, premium }) {
  return `You are an expert curriculum writer for IELTS and CELPIP.
Create ONE high-quality ${category.toUpperCase()} lesson at CEFR ${level}.

Return valid JSON with EXACT schema:
{
  "title": string,
  "excerpt": string,
  "heroTip": string,
  "tags": string[],
  "visualAids": string[],
  "quiz": [{"prompt": string, "options": string[], "correctIndex": number, "explanation": string}],
  "body": string
}

Quality requirements (important):
- Lesson must be lively, practical, and not dull.
- Body is markdown starting with "##" (no frontmatter).
- Include mini-dialogues, tables/checklists, and at least 2 "visual" sections learners can scan quickly.
- Include: clear explanation, real examples, common mistakes, guided practice (min 8 items), and answer key.
- Include one IELTS exam strategy and one CELPIP strategy.
- Include a soft CTA to continue learning at ieltscorner.ca.
- Keep lesson 900-1400 words.
- Use neutral, clear ESL-friendly language.
- Tags: 4-7 lowercase tags.
- visualAids: 3-6 concise strings describing visual supports available in the lesson.
- quiz: 5-7 multiple-choice questions with explanations.
- ${premium ? 'This is PREMIUM: make it advanced and depth-focused.' : 'This is FREE: make it practical and motivating.'}
- Never mention AI or model names.`;
}

async function generateLessonWithOpenAI({ apiKey, model, level, category, premium }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: buildPrompt({ level, category, premium }),
      text: {
        format: {
          type: 'json_schema',
          name: 'lesson',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'excerpt', 'heroTip', 'tags', 'visualAids', 'quiz', 'body'],
            properties: {
              title: { type: 'string', minLength: 8, maxLength: 120 },
              excerpt: { type: 'string', minLength: 20, maxLength: 240 },
              heroTip: { type: 'string', minLength: 20, maxLength: 180 },
              tags: {
                type: 'array',
                minItems: 4,
                maxItems: 7,
                items: { type: 'string' },
              },
              visualAids: {
                type: 'array',
                minItems: 3,
                maxItems: 6,
                items: { type: 'string' },
              },
              quiz: {
                type: 'array',
                minItems: 5,
                maxItems: 7,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['prompt', 'options', 'correctIndex', 'explanation'],
                  properties: {
                    prompt: { type: 'string', minLength: 8 },
                    options: {
                      type: 'array',
                      minItems: 3,
                      maxItems: 4,
                      items: { type: 'string' },
                    },
                    correctIndex: { type: 'number' },
                    explanation: { type: 'string', minLength: 8 },
                  },
                },
              },
              body: { type: 'string', minLength: 900 },
            },
          },
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const outputText = data.output_text;
  if (!outputText) {
    throw new Error('OpenAI response did not include output_text');
  }

  const parsed = JSON.parse(outputText);
  if (!parsed.body.startsWith('## ')) {
    parsed.body = `## Lesson\n\n${parsed.body}`;
  }

  parsed.quiz = parsed.quiz.map((q) => ({
    ...q,
    correctIndex: Math.max(0, Math.min(Number(q.correctIndex ?? 0), (q.options?.length ?? 1) - 1)),
  }));

  return parsed;
}

function fallbackLesson({ level, category }) {
  const title = `${level} ${category === 'grammar' ? 'Grammar' : 'Vocabulary'} Boost for IELTS & CELPIP`;
  return {
    title,
    excerpt: `A practical ${level} ${category} lesson with visual supports, self-marking quiz, and exam-focused practice.`,
    heroTip: 'Start with the visual summary, then test yourself in the quiz before you read the full answer key.',
    tags: [category, level.toLowerCase(), 'ielts', 'celpip', 'self-study'],
    visualAids: ['before/after sentence board', 'mistake radar checklist', 'score-boost strategy map'],
    quiz: [
      {
        prompt: 'Choose the sentence with the best exam tone.',
        options: ['Very bad policy.', 'This policy may create avoidable delays.', 'Policy delay'],
        correctIndex: 1,
        explanation: 'Option 2 is precise and appropriately formal for test writing.',
      },
      {
        prompt: 'Pick the strongest collocation for a formal essay.',
        options: ['do a decision', 'make a decision', 'build a decision'],
        correctIndex: 1,
        explanation: '“Make a decision” is the correct collocation.',
      },
      {
        prompt: 'What should you check first after writing a paragraph?',
        options: ['Word count only', 'Cohesion and grammar accuracy', 'Font style'],
        correctIndex: 1,
        explanation: 'Cohesion and grammar directly affect scoring criteria.',
      },
      {
        prompt: 'Which option shows controlled hedging?',
        options: ['This always happens.', 'This may be partly due to cost.', 'This happen maybe.'],
        correctIndex: 1,
        explanation: 'Option 2 is grammatically accurate and nuanced.',
      },
      {
        prompt: 'For speaking fluency, what helps most?',
        options: ['Memorizing one long script', 'Using flexible linking phrases', 'Avoiding all pauses'],
        correctIndex: 1,
        explanation: 'Flexible phrases support natural fluency under pressure.',
      },
    ],
    body: `## ${title}

### Visual warm-up: spot the difference

| Weak sentence | Strong exam sentence | Why it scores better |
|---|---|---|
| People are bad at money. | Many people struggle with long-term financial planning. | More precise and formal |
| This is very bad. | This may lead to several avoidable outcomes. | Better hedging and clarity |

### Core explanation
- Use clear sentence frames first, then add range.
- Keep grammar and vocabulary tied to task purpose.
- Build one paragraph around one main point.

### Common mistakes radar
1. Over-general statements with no support.
2. Forced “advanced” words used incorrectly.
3. Unclear pronoun references.
4. Repetition of the same sentence pattern.

### Guided practice (self-study)
1. Rewrite one weak sentence into a formal exam sentence.
2. Add a hedging phrase to a strong opinion.
3. Build one topic sentence + one support sentence.
4. Replace two weak verbs with precise verbs.
5. Add one linking phrase to improve flow.
6. Fix one grammar accuracy issue.
7. Convert one spoken idea into formal writing.
8. Record a 45-second spoken answer using two target phrases.

### Answer key (sample)
1. Many residents face rising housing costs in urban centers.
2. This may be partly explained by higher living expenses.
3. Public transit investment improves access to employment.
4. “get better” → “improve”; “do effect” → “influence”.
5. “As a result,” / “In addition,” depending on meaning.
6. Subject-verb agreement and article use.
7. “I think it’s good” → “I believe this policy is beneficial.”
8. Include one example and one reason.

### IELTS + CELPIP strategy note
In IELTS writing and CELPIP writing, build control first: clear structure + accurate language beats risky complexity.

### Next step
Use the quiz above to check retention, then continue with the next level lesson on ieltscorner.ca.`
  };
}

function renderLessonMarkdown({
  title,
  category,
  level,
  ieltsBand,
  clb,
  excerpt,
  tags,
  heroTip,
  visualAids,
  quiz,
  premium,
  priceCAD,
  date,
  body,
}) {
  const safeTags = tags.map((tag) => `"${escapeYaml(tag)}"`).join(', ');
  const safeVisual = visualAids.map((item) => `"${escapeYaml(item)}"`).join(', ');
  const quizYaml = quiz
    .map(
      (q) =>
        `  - prompt: "${escapeYaml(q.prompt)}"\n    options: [${q.options
          .map((o) => `"${escapeYaml(o)}"`)
          .join(', ')}]\n    correctIndex: ${q.correctIndex}\n    explanation: "${escapeYaml(q.explanation ?? '')}"`
    )
    .join('\n');

  return `---
title: "${escapeYaml(title)}"
category: "${category}"
level: "${level}"
ieltsBand: "${ieltsBand}"
clb: "${clb}"
exam: ["IELTS", "CELPIP"]
excerpt: "${escapeYaml(excerpt)}"
date: "${date}"
tags: [${safeTags}]
heroTip: "${escapeYaml(heroTip)}"
visualAids: [${safeVisual}]
quiz:
${quizYaml || '  []'}
premium: ${premium}
priceCAD: ${priceCAD}
draft: false
---

${body.trim()}\n`;
}

async function main() {
  const opts = parseArgs(process.argv);
  await mkdir(LESSON_DIR, { recursive: true });
  const currentFiles = await existingLessonFiles();

  const apiKey = process.env.OPENAI_API_KEY;
  const today = new Date().toISOString().slice(0, 10);

  const created = [];
  for (let i = 0; i < opts.count; i += 1) {
    const { level, category, seed } = pickLevelAndCategory(currentFiles.length, i);
    const premium = shouldBePremium(level, seed);
    const priceCAD = premium ? 12 : 0;
    const score = scoreMap(level);

    const lessonData = apiKey
      ? await generateLessonWithOpenAI({ apiKey, model: opts.model, level, category, premium })
      : fallbackLesson({ level, category });

    const baseSlug = slugify(lessonData.title);
    const filename = `${today}-${category}-${level.toLowerCase()}-${baseSlug}.md`;
    const filePath = path.join(LESSON_DIR, filename);

    const markdown = renderLessonMarkdown({
      title: lessonData.title,
      category,
      level,
      ieltsBand: score.ieltsBand,
      clb: score.clb,
      excerpt: lessonData.excerpt,
      tags: lessonData.tags,
      heroTip: lessonData.heroTip,
      visualAids: lessonData.visualAids,
      quiz: lessonData.quiz,
      premium,
      priceCAD,
      date: today,
      body: lessonData.body,
    });

    if (!opts.dryRun) {
      await writeFile(filePath, markdown, 'utf8');
    }

    created.push({ filePath, title: lessonData.title, level, category, premium });
  }

  for (const lesson of created) {
    const gate = lesson.premium ? 'premium' : 'free';
    console.log(`${opts.dryRun ? '[dry-run] would create' : 'created'}: ${lesson.filePath}`);
    console.log(`  -> ${lesson.title} (${lesson.level} ${lesson.category}, ${gate})`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});