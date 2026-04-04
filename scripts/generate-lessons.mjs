#!/usr/bin/env node
// load environment variables from .env if present (safe to keep out of repo via .gitignore)
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CATEGORIES = ['grammar', 'vocabulary', 'writing', 'speaking'];
const LESSON_DIR = path.resolve('src/content/lessons');
const LEECH_OUT_DIR = path.resolve('src/content/lessons/ielts/writing');
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const TOPIC_BANK = {
  grammar: {
    A1: [
      'to be in simple sentences',
      'subject pronouns and basic verbs',
      'a, an, and the',
      'this, that, these, and those',
      'have got for personal information',
      'there is and there are',
      'present simple for daily routines',
      'question words: who, what, where',
      'can and cannot for ability',
      'prepositions of place',
      'possessive adjectives: my, your, his, her',
      'like and would like',
      'countable and uncountable nouns',
      'some and any in basic sentences',
      'imperatives for instructions',
      'adjectives in simple descriptions',
      'basic adverbs: very, really, quite',
      'present continuous for now',
      'simple past of to be',
      'time expressions: today, yesterday, tomorrow'
    ],
    A2: [
      'present simple vs present continuous',
      'past simple regular verbs',
      'past simple irregular verbs',
      'future with going to',
      'will for quick decisions',
      'comparatives and superlatives',
      'too and enough',
      'must and have to',
      'should for advice',
      'adverbs of frequency',
      'object pronouns and possessive pronouns',
      'first conditional',
      'verb + to infinitive',
      'verb + gerund (ing form)',
      'question tags in conversation',
      'used to for past habits',
      'relative clauses with who and which',
      'present perfect with ever and never',
      'for and since with present perfect',
      'basic passive voice'
    ],
    B1: [
      'present perfect vs past simple',
      'second conditional for unreal situations',
      'modals for possibility: may, might, could',
      'modals of obligation and prohibition',
      'reported speech basics',
      'defining relative clauses',
      'non-defining relative clauses',
      'passive voice in common contexts',
      'gerunds and infinitives after common verbs',
      'linking words for contrast and result',
      'articles in general and specific meaning',
      'quantifiers: much, many, a lot of, plenty of',
      'past continuous and past simple together',
      'present perfect continuous',
      'too, enough, and so...that',
      'countable vs uncountable accuracy',
      'phrasal verbs in everyday situations',
      'adjective order in descriptions',
      'conditionals in advice and plans',
      'common sentence errors and quick fixes'
    ],
    B2: [
      'advanced conditionals in discussion tasks',
      'future forms for prediction and planning',
      'mixed conditionals in arguments',
      'modal verbs for deduction',
      'modal verbs in past contexts',
      'cleft sentences for emphasis',
      'relative clauses with prepositions',
      'participle clauses',
      'passive reporting structures',
      'noun clauses with that and whether',
      'inversion after negative adverbs',
      'discourse markers for formal writing',
      'parallel structure in complex sentences',
      'hedged claims with accurate grammar',
      'advanced article usage',
      'complex noun phrases',
      'subordination for clear paragraph flow',
      'reduced relative clauses',
      'formal and neutral register control',
      'error correction for high-band writing'
    ],
    C1: [
      'subtle tense shifts in argument writing',
      'complex conditionals with nuance',
      'inversion for formal emphasis',
      'advanced passive structures',
      'nominalisation in academic style',
      'reporting verbs with precise grammar',
      'stance expressions in formal writing',
      'advanced clause combinations',
      'ellipsis and substitution for coherence',
      'precision with determiners',
      'advanced punctuation and sentence control',
      'grammar for critical evaluation language',
      'advanced comparison structures',
      'fronting and emphasis patterns',
      'complex referencing with pronouns',
      'avoiding ambiguity in long sentences',
      'controlled complexity in IELTS essays',
      'high-accuracy grammar for CELPIP responses',
      'editing advanced writing for clarity',
      'common C1 grammar slips and repairs'
    ],
    C2: [
      'expert-level sentence control',
      'precision in complex argument structures',
      'advanced inversion and emphasis',
      'register shifts without grammar errors',
      'sophisticated clause architecture',
      'subtle modal meanings in formal texts',
      'advanced discourse grammar',
      'concise high-level phrasing',
      'parallelism for rhetorical clarity',
      'advanced cohesion through grammar',
      'abstract noun structures with accuracy',
      'grammar choices for persuasive force',
      'high-level error diagnosis and revision',
      'tone control in expert responses',
      'precision under timed exam conditions',
      'complex syntax without loss of clarity',
      'advanced reformulation techniques',
      'grammar for evaluator-friendly writing',
      'micro-editing for top-band accuracy',
      'final-stage grammar refinement for C2'
    ],
  },
  vocabulary: {
    A1: ['everyday classroom words', 'family and home words', 'food and shopping words', 'time and routine words'],
    A2: ['travel and transport words', 'health and body words', 'work and study words', 'weather and seasons words'],
    B1: ['problem and solution vocabulary', 'cause and effect vocabulary', 'opinions and reasons vocabulary', 'communication vocabulary'],
    B2: ['formal writing vocabulary', 'argument and evidence vocabulary', 'social issues vocabulary', 'education and work vocabulary'],
    C1: ['precise evaluation vocabulary', 'policy and society vocabulary', 'academic discussion vocabulary', 'advanced stance vocabulary'],
    C2: ['expert-level nuance vocabulary', 'high-precision argument vocabulary', 'advanced formal expression vocabulary', 'top-band lexical control vocabulary'],
  },
  writing: {
    A1: ['writing simple personal messages', 'building short sentences for writing tasks', 'basic punctuation in short writing', 'writing about daily routines'],
    A2: ['writing clear paragraphs with one main idea', 'email writing basics for everyday situations', 'using linking words in short writing', 'describing past experiences in writing'],
    B1: ['opinion paragraph writing with clear support', 'problem and solution writing structure', 'writing clear email requests and responses', 'organizing ideas for timed writing tasks'],
    B2: ['essay introductions and thesis statements', 'supporting arguments with examples in essays', 'comparing two viewpoints in writing tasks', 'editing writing for clarity and cohesion'],
    C1: ['advanced argument structure in formal essays', 'developing critical responses with evidence', 'refining tone for formal exam writing', 'improving sentence variety in high-band essays'],
    C2: ['expert-level precision in persuasive writing', 'controlling advanced tone in exam essays', 'high-level revision strategies under time pressure', 'writing with maximum clarity and impact'],
  },
  speaking: {
    A1: ['introducing yourself clearly in speaking tasks', 'answering simple personal questions', 'speaking about daily life with short sentences', 'using basic connectors in spoken answers'],
    A2: ['giving short opinions in speaking tasks', 'describing people and places in speech', 'answering follow-up questions with confidence', 'speaking about plans and experiences'],
    B1: ['structuring longer speaking answers', 'using examples to support spoken opinions', 'handling common speaking prompts clearly', 'improving fluency with simple linking phrases'],
    B2: ['advanced speaking organization for exam tasks', 'developing arguments in spoken responses', 'managing speaking time effectively', 'improving spoken accuracy under pressure'],
    C1: ['high-band speaking strategies for complex prompts', 'expressing nuanced opinions with clear structure', 'maintaining coherence in longer spoken responses', 'self-correcting grammar and vocabulary while speaking'],
    C2: ['expert-level speaking precision and control', 'delivering persuasive spoken arguments', 'handling abstract topics fluently in exams', 'maximizing speaking scores with advanced response design'],
  },
};

function parseArgs(argv) {
  const opts = { count: 1, dryRun: false, model: DEFAULT_MODEL, category: 'all', seedFile: null, overwrite: false };
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
    } else if (arg === '--category') {
      opts.category = String(argv[i + 1] ?? '').toLowerCase();
      i += 1;
    } else if (arg === '--seed-file') {
      opts.seedFile = argv[i + 1];
      i += 1;
    } else if (arg === '--overwrite') {
      opts.overwrite = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(opts.count) || opts.count < 1 || opts.count > 200) {
    throw new Error('--count must be an integer between 1 and 200');
  }

  if (opts.category !== 'all' && !CATEGORIES.includes(opts.category)) {
    throw new Error(`--category must be one of: all, ${CATEGORIES.join(', ')}`);
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

function pickLevelAndCategory(existingCount, index, categories = CATEGORIES) {
  const total = existingCount + index;
  const level = LEVELS[total % LEVELS.length];
  const category = categories[Math.floor(total / LEVELS.length) % categories.length];
  return { level, category, seed: total };
}

function pickTopic({ level, category, seed }) {
  const byCategory = TOPIC_BANK[category] ?? TOPIC_BANK.grammar;
  const topics = byCategory[level] ?? byCategory.B1;
  const topicIndex = Math.floor(seed / LEVELS.length);
  return topics[topicIndex % topics.length];
}

function simplifyGrammarTopic(topic) {
  return String(topic)
    .replace(/nominalisation/gi, 'noun forms')
    .replace(/ellipsis and substitution/gi, 'shorter reference words')
    .replace(/inversion/gi, 'word order changes')
    .replace(/register shifts/gi, 'formal and casual style changes')
    .replace(/parallelism/gi, 'parallel structure')
    .replace(/discourse grammar/gi, 'grammar for linking ideas')
    .replace(/subordination/gi, 'complex sentence links')
    .replace(/determiners/gi, 'words like this, that, some, and each')
    .trim();
}

function buildClearTitle({ category, topic }) {
  const cleanTopic = category === 'grammar' ? simplifyGrammarTopic(topic) : String(topic);
  const prettyTopic = `${cleanTopic[0].toUpperCase()}${cleanTopic.slice(1)}`;
  if (category === 'grammar') {
    return `How to Use ${prettyTopic}`;
  }
  if (category === 'vocabulary') {
    return `Vocabulary for ${prettyTopic}`;
  }
  if (category === 'writing') {
    return `How to Write About ${prettyTopic}`;
  }
  if (category === 'speaking') {
    return `How to Speak About ${prettyTopic}`;
  }
  return `Lesson on ${prettyTopic}`;
}

function ensureClearTitle({ title, category, topic }) {
  const fallbackTitle = buildClearTitle({ category, topic });
  if (!title || typeof title !== 'string') return fallbackTitle;
  const cleaned = title.trim();
  if (!cleaned) return fallbackTitle;
  if (/essential|boost|lesson\s*\d*$/i.test(cleaned)) return fallbackTitle;
  if (/\b(a1|a2|b1|b2|c1|c2|beginner|elementary|intermediate|advanced|expert)\b/i.test(cleaned)) {
    return fallbackTitle;
  }
  return cleaned
    .replace(/^grammar\s*:\s*/i, 'How to Use ')
    .replace(/^vocabulary\s*:\s*/i, 'Vocabulary for ')
    .replace(/^writing\s*:\s*/i, 'How to Write About ')
    .replace(/^speaking\s*:\s*/i, 'How to Speak About ');
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

async function callOpenAI({ topic, level, category, model }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const promptFile = path.resolve('prompts/lesson-generator.md');
  let systemPrompt;
  try {
    systemPrompt = await readFile(promptFile, 'utf8');
    console.log(`[openai] Loaded system prompt from ${promptFile}`);
  } catch {
    throw new Error(`Missing prompt file: ${promptFile}. Create prompts/lesson-generator.md to define the lesson instructions.`);
  }

  const userMessage = `Create a ${category} lesson on the topic: "${topic}" (level: ${level}).
Target exams: IELTS and CELPIP.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 12000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI API');

  const parsed = JSON.parse(content);

  const required = ['title', 'excerpt', 'tags', 'quiz', 'body'];
  for (const field of required) {
    if (!parsed[field]) throw new Error(`OpenAI response missing required field: "${field}"`);
  }

  // Provide defaults for optional fields
  parsed.heroTip = parsed.heroTip || '';
  parsed.visualAids = parsed.visualAids || [];
  parsed.slug = parsed.slug || '';
  parsed.lessonType = parsed.lessonType || '';
  parsed.grammarFocus = parsed.grammarFocus || '';
  parsed.topic = parsed.topic || '';
  parsed.relatedTopics = parsed.relatedTopics || [];

  return parsed;
}

// Lesson generation: uses OpenAI API when OPENAI_API_KEY is set, otherwise falls back to built-in templates.

function fallbackLesson({ level, category, topic }) {
  const title = buildClearTitle({ category, topic });
  const topicLabel = String(topic || '').trim() || 'this target';
  const focusLabel = `"${topicLabel}"`;
  const examTask =
    category === 'speaking'
      ? 'IELTS Speaking and CELPIP Speaking responses'
      : category === 'writing'
        ? 'IELTS and CELPIP writing tasks'
        : 'IELTS and CELPIP questions';

  return {
    title,
    excerpt: `Build control of ${topicLabel} with clear examples, guided drills, and exam-ready practice.`,
    heroTip: 'Start with the examples, then complete each task in the Practice Lab before checking feedback.',
    tags: [category, level.toLowerCase(), 'beginner-friendly', 'esl', 'examples', 'practice', 'exam-prep'],
    visualAids: ['Simple example table', 'Right and wrong list', 'Real test examples'],
    quiz: [
      {
        prompt: 'Which sentence is better for a test?',
        options: ['Very bad.', 'This is not helpful.', 'This creates problems.'],
        correctIndex: 1,
        explanation: 'Option 2 is clear and serious. Good for tests.',
      },
      {
        prompt: 'How do you say "to choose"?',
        options: ['do a decision', 'make a decision', 'get a decision'],
        correctIndex: 1,
        explanation: 'We say "make a decision". "Do a decision" is wrong.',
      },
      {
        prompt: 'After you write, what should you check first?',
        options: ['Only the length', 'Grammar and spelling', 'Only adjectives'],
        correctIndex: 1,
        explanation: 'Good grammar helps you get better marks on tests.',
      },
      {
        prompt: 'Which sentence is more polite?',
        options: ['This always happens.', 'This might happen.', 'This happen maybe.'],
        correctIndex: 1,
        explanation: 'Option 2 is more careful and polite. Better for tests.',
      },
      {
        prompt: 'What helps you speak more smoothly?',
        options: ['Memorize everything', 'Use connecting words like also and then', 'Never stop talking'],
        correctIndex: 1,
        explanation: 'Connecting words help your speaking sound natural.',
      },
    ],
    body: `<p class="lesson-context">This lesson builds reliable control of ${focusLabel} for ${examTask}. You will see practical model sentences, clear usage conditions, and targeted correction drills so you can produce accurate language under time pressure. Follow each section in order, then complete the practice set and check the feedback before moving to a new topic.</p>

<nav class="lesson-map" aria-label="Lesson map">
  <a href="#examples">Examples</a>
  <a href="#how-it-works">How It Works</a>
  <a href="#common-mistakes">Common Mistakes</a>
  <a href="#practice-lab">Practice Lab</a>
  <a href="#why-it-matters">Why It Matters</a>
</nav>

## Examples

| Model | Sentence | Why it works |
|---|---|---|
| Incorrect | Learners use ${topicLabel} in a way that confuses the main idea. | The message is too vague and key meaning is lost. |
| Strong | Learners use ${topicLabel} to state a clear point, then support it with precise detail. | The examiner can track meaning quickly and score coherence higher. |
| Strong | In timed responses, speakers use ${topicLabel} to control logic before adding extra detail. | Controlled structure reduces avoidable grammar and clarity errors. |

## How It Works

Use ${topicLabel} as a control tool, not as decoration. Start by deciding the job of the sentence in your response: explain, compare, justify, or conclude. Once the job is clear, choose a structure that keeps the message stable from beginning to end. This prevents mid-sentence drift and helps the examiner follow your argument without guessing. In exam conditions, this stability matters more than forcing advanced wording.

<section class="lesson-panel lesson-panel-when">
  <h3>Use it when</h3>
  <ul>
    <li>You need to state one claim and support it with one specific reason.</li>
    <li>You are linking evidence to a conclusion in a writing body paragraph.</li>
    <li>You want a speaking response to stay organized under time pressure.</li>
    <li>You are revising a sentence that sounds correct but unclear.</li>
  </ul>
</section>

<section class="lesson-panel lesson-panel-remember">
  <h3>Keep these rules in mind</h3>
  <ul>
    <li>Keep one purpose per sentence so the reader does not lose the main point.</li>
    <li>Match grammar choices to meaning first, then polish style.</li>
    <li>Prefer clear wording over risky expressions you cannot control.</li>
    <li>Check whether each sentence directly supports your response goal.</li>
  </ul>
</section>

## Common Mistakes

- Weak: I use ${topicLabel} because it is good and useful for many things.
- Strong: I use ${topicLabel} to make my reason specific, then I add one clear example.
- Fix: Name the exact purpose of the sentence before you add detail.

- Weak: In this answer I change structure many times and the point becomes unclear.
- Strong: In this answer I keep one structure, then extend it with focused support.
- Fix: Keep one sentence frame until the core message is complete.

- Weak: The response adds advanced words, but the grammar does not match the meaning.
- Strong: The response uses controlled wording that fits the intended meaning and tone.
- Fix: Replace risky wording with accurate forms you can use consistently.

## Practice Lab

<div class="practice-lab" data-practice-lab>
  <p data-practice-score>Score: 0 / 3</p>
  <button type="button" data-practice-reset>Reset</button>

  <article class="practice-task" data-task-type="choice">
    <h3>Task 1: Choose the stronger line</h3>
    <p>Select the sentence that keeps the response purpose clear.</p>
    <div data-task-feedback></div>
  </article>

  <article class="practice-task" data-task-type="typing">
    <h3>Task 2: Rewrite for control</h3>
    <p>Rewrite one weak sentence so it uses ${topicLabel} with clear meaning.</p>
    <div data-task-feedback></div>
  </article>

  <article class="practice-task" data-task-type="order">
    <h3>Task 3: Order the response steps</h3>
    <p>Arrange the steps from planning to final sentence check.</p>
    <div data-task-feedback></div>
  </article>
</div>

## Get Feedback

<div class="lesson-support-callout">
  <p>Get targeted corrections and a practical improvement plan for your next exam attempt.</p>
  <ul>
    <li><a href="/essay-correction">Essay Correction</a></li>
    <li><a href="/tutoring">Tutoring</a></li>
    <li><a href="/celpip/writing/ai-feedback">AI Feedback</a></li>
    <li><a href="/webinar">Webinar</a></li>
  </ul>
</div>

## Why It Matters

<div class="lesson-importance">
  <p><strong>Why this matters:</strong> exam scores depend on clear meaning and controlled structure, not random complexity. When you can apply ${topicLabel} with stable grammar and direct support, your writing and speaking become easier to follow, easier to score, and easier to improve over time. This control helps you protect points in grammar, coherence, and task achievement across both IELTS and CELPIP.</p>
</div>`,
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

${sanitizePracticeLabHtml(body.trim())}\n`;
}

/**
 * Fix common AI-generated HTML formatting issues that break markdown rendering.
 * Inside practice-lab blocks, reduce 4+ space indentation to 2 spaces and
 * remove blank lines between HTML tags so markdown doesn't treat them as code blocks.
 */
function sanitizePracticeLabHtml(body) {
  // Split on practice-lab boundaries
  const parts = body.split(/(<div class="practice-lab"[\s\S]*?<\/div>\s*<\/div>)/);
  return parts.map((part) => {
    if (!part.includes('data-practice-lab')) return part;
    // Remove blank lines between HTML tags
    let fixed = part.replace(/>\s*\n\s*\n\s*</g, '>\n<');
    // Reduce deep indentation: replace 4+ leading spaces with 2
    fixed = fixed.replace(/^( {4,})/gm, (match) => {
      return '  '.repeat(Math.ceil(match.length / 4));
    });
    return fixed;
  }).join('');
}

function twoDigit(n) {
  return String(n).padStart(2, '0');
}

function leechMdxTemplate({ test, skill, title, description, level, date, slug }) {
  return `---
test: ${test}
skill: ${skill}
title: "${escapeYaml(title)}"
category: "writing"
level: "C1"
ieltsBand: "7+"
clb: "9-10"
exam: ["IELTS"]
excerpt: "${escapeYaml(description)}"
date: "${date}"
tags: ["writing", "ielts", "grammar", "band-7"]
draft: false
---

import LessonShell from "../../../../components/lesson/LessonShell.astro";
import Callout from "../../../../components/lesson/Callout.astro";
import PatternTable from "../../../../components/lesson/PatternTable.astro";
import MiniQuiz from "../../../../components/lesson/MiniQuiz.astro";

<LessonShell
  title="${escapeYaml(title)}"
  description="${escapeYaml(description)}"
  level="${escapeYaml(level)}"
  date="${date}"
>

## Key points

- This lesson focuses on **${slug}** and how to use it accurately in IELTS writing.
- Aim for **controlled accuracy** first, then add range.

<Callout type="tip" title="How to study this">
Copy 2 example sentences into your own Task 2 paragraph. Keep the grammar simple and correct.
</Callout>

## Meaning and use (clear explanation)

Write a short explanation here in plain English. Keep it simple. Give 3–4 examples.

## Common patterns

<PatternTable
  caption="Useful patterns"
  rows={[
    { pattern: "Pattern 1", meaning: "Meaning/use 1", example: "Example 1." },
    { pattern: "Pattern 2", meaning: "Meaning/use 2", example: "Example 2." },
    { pattern: "Pattern 3", meaning: "Meaning/use 3", example: "Example 3." }
  ]}
/>

## Common mistakes (IELTS)

<Callout type="warning" title="Typical learner errors">
- Wrong form
- Wrong position in the sentence
- Wrong meaning / wrong register
</Callout>

## Practice

1) Rewrite sentence A more formally.  
2) Rewrite sentence B using a different structure.  
3) Fix the error in sentence C.

<MiniQuiz title="Mini-quiz">
<ol>
  <li>Choose the correct sentence (A/B/C).</li>
  <li>Fix the error: ________.</li>
</ol>

<details>
  <summary>Answer key</summary>
  <ol>
    <li>Answer 1</li>
    <li>Answer 2</li>
  </ol>
</details>
</MiniQuiz>

</LessonShell>
`;
}

async function generateLeechBatchFromSeed({ seedFile, dryRun, overwrite }) {
  if (!seedFile) throw new Error('Missing --seed-file');

  const { readFile, access } = await import('node:fs/promises');

  const seedPath = path.resolve(seedFile);
  const raw = await readFile(seedPath, 'utf8');
  const seed = JSON.parse(raw);

  const test = seed.test ?? 'ielts';
  const skill = seed.skill ?? 'writing';
  const level = seed.level ?? 'Band 7+';
  const defaultDate = seed.defaultDate ?? new Date().toISOString().slice(0, 10);

  if (!Array.isArray(seed.items) || seed.items.length === 0) {
    throw new Error('Seed file must include items: [] with at least 1 item');
  }

  await mkdir(LEECH_OUT_DIR, { recursive: true });

  const created = [];
  const skipped = [];

  for (let i = 0; i < seed.items.length; i += 1) {
    const item = seed.items[i];
    const slug = item.slug;
    const title = item.title;
    const description = item.description;

    if (!slug || !title || !description) {
      throw new Error(`Seed item ${i + 1} missing slug/title/description`);
    }

    const fileName = `${twoDigit(i + 1)}-${slug}.mdx`;
    const filePath = path.join(LEECH_OUT_DIR, fileName);

    let exists = false;
    try {
      await access(filePath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists && !overwrite) {
      skipped.push(fileName);
      continue;
    }

    const mdx = leechMdxTemplate({
      test,
      skill,
      title,
      description,
      level,
      date: item.date ?? defaultDate,
      slug,
    });

    if (!dryRun) {
      await writeFile(filePath, mdx, 'utf8');
    }

    created.push(fileName);
  }

  console.log(`✅ Leech batch complete`);
  console.log(`📁 Output: ${LEECH_OUT_DIR}`);
  console.log(`🟢 Created/Updated: ${created.length}`);
  created.forEach((f) => console.log(`  + ${f}`));

  if (skipped.length) {
    console.log(`🟡 Skipped (already exist; re-run with --overwrite): ${skipped.length}`);
    skipped.forEach((f) => console.log(`  - ${f}`));
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.seedFile) {
    await generateLeechBatchFromSeed({
      seedFile: opts.seedFile,
      dryRun: opts.dryRun,
      overwrite: opts.overwrite,
    });
    return;
  }

  await mkdir(LESSON_DIR, { recursive: true });
  const currentFiles = await existingLessonFiles();
  const selectedCategories = opts.category === 'all' ? CATEGORIES : [opts.category];

  console.log('[info] Using built-in lesson generator with teacher-maintained templates.');

  const today = new Date().toISOString().slice(0, 10);

  console.log(`[info] Using ${process.env.OPENAI_API_KEY ? `OpenAI API (model: ${opts.model})` : 'built-in lesson templates (no OPENAI_API_KEY set)'}.`);

  const created = [];
  for (let i = 0; i < opts.count; i += 1) {
    const { level, category, seed } = pickLevelAndCategory(currentFiles.length, i, selectedCategories);
    const topic = pickTopic({ level, category, seed });
    const premium = shouldBePremium(level, seed);
    const priceCAD = premium ? 12 : 0;
    const score = scoreMap(level);

    let lessonData;
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log(`[openai] Generating: "${topic}" (${level} ${category})`);
        lessonData = await callOpenAI({ topic, level, category, model: opts.model });
        console.log(`[openai] ✅ Done`);
      } catch (err) {
        console.warn(`[openai] ⚠️  API call failed: ${err.message}. Falling back to template.`);
        lessonData = fallbackLesson({ level, category, topic });
      }
    } else {
      lessonData = fallbackLesson({ level, category, topic });
    }

    const baseSlug = (lessonData.slug && slugify(lessonData.slug)) || slugify(lessonData.title);
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
