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
  return `You are an expert ESL teacher writing lessons for IELTS and CELPIP learners.
Create ONE high-quality ${category.toUpperCase()} lesson at CEFR level ${level}.

WRITE FOR ESL STUDENTS - use simple, clear language. Explain everything.

Return valid JSON:
{
  "title": string,
  "excerpt": string,
  "heroTip": string,
  "tags": string[],
  "visualAids": string[],
  "quiz": [{"prompt": string, "options": string[], "correctIndex": number, "explanation": string}],
  "body": string
}

CONTENT REQUIREMENTS:
- Title: Simple and clear (example: "Beginner: How to Use Present Tense")
- Excerpt: One sentence, beginner-friendly
- heroTip: Short, encouraging tip starting with emoji (example: "👉 Start with examples")
- Body: Markdown, starting with "##" heading
- Keep it 1000-1400 words
- Use EMOJI and VISUAL MARKERS (✅, ❌, 📝, 🎓) to break up text
- Tags: 5-7 lowercase tags (include: "${category}", "${level.toLowerCase()}", "beginner-friendly", "esl", "examples")
- visualAids: 3 short strings (example: ["Simple example table", "Right and wrong list", "Real test examples"])

LESSON STRUCTURE (must include all sections):
1. **What You Will Learn** (short, encouraging intro)
2. **Look at Real Examples** (show 3-4 CORRECT examples, then 2-3 WRONG examples with ✅/❌ marks)
3. **How It Works - Step by Step** (3-4 numbered steps with clear explanations)
4. **The Most Common MISTAKES** (table with Wrong | Right | Why columns)
5. **Practice - Try These Yourself** (3-4 exercises, then answers below)
6. **For IELTS Exams** (bullet points: what to do, what NOT to do)
7. **For CELPIP Exams** (bullet points: what to do, what NOT to do)
8. **Your Next Steps** (encouraging final section)

LANGUAGE RULES:
- Use short, simple sentences
- Explain every grammar term (example: say "verb form" not just "conjugation")
- Use real, everyday examples (work, school, hobbies)
- Never use: "collocation", "hedging", "nuanced", "coherence", "cohesion"
- Use words like: correct, wrong, right, example, practice, rule, mistake
- Every explanation should be: "Because..." or "Why?" answered

QUIZ (5-7 questions):
- Each question tests ONE skill
- Options should be realistic mistakes ESL students make
- Explanations should say WHY the answer is right
- First question should be EASY to build confidence

${premium ? 'PREMIUM LEVEL: Make content more challenging, include advanced examples and strategies.' : 'FREE LEVEL: Make content motivating, include lots of examples, encourage practice.'}

Never mention AI, models, or automation.`;
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
  const levelNames = {
    A1: 'Beginner',
    A2: 'Easy',
    B1: 'Intermediate',
    B2: 'Upper Intermediate',
    C1: 'Advanced',
    C2: 'Expert'
  };
  const levelName = levelNames[level] || 'Intermediate';
  const title = `${levelName}: Essential ${category === 'grammar' ? 'Grammar' : 'Vocabulary'}`;
  
  return {
    title,
    excerpt: `Learn ${category} with simple examples. Perfect for IELTS and CELPIP preparation.`,
    heroTip: '👉 Start with the examples. Try the practice questions. Check answers at the bottom.',
    tags: [category, level.toLowerCase(), 'beginner-friendly', 'esl', 'examples', 'practice', 'exam-prep'],
    visualAids: ['Simple example table', 'Right and wrong list', 'Real test examples'],
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