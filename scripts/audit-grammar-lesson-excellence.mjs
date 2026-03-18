#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const LESSON_DIR = path.resolve('src/content/lessons');
const DEFAULT_FAIL_BELOW = 85;

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'from',
  'or', 'vs', 'use', 'uses', 'using', 'advanced', 'basic', 'review', 'how', 'what',
  'when', 'where', 'why', 'that', 'this', 'these', 'those', 'your', 'their', 'its',
]);

const JARGON_PATTERNS = [
  /\bcommunicative purpose\b/i,
  /\blexical field\b/i,
  /\bmetalinguistic\b/i,
  /\bsyntactic\b/i,
  /\bdiscourse marker\b/i,
  /\brhetorical\b/i,
  /\bnominali[sz]ation\b/i,
];

const BANNED_GENERIC_ERROR_PATTERNS = [
  /mixing timelines inside one sentence/i,
  /adding complexity without meaning/i,
  /keep one timeline and match all verbs to it/i,
  /keep only forms that make your message clearer/i,
];

const BANNED_GENERIC_ANSWER_PATTERNS = [
  /keep one clear timeline/i,
  /place \*\*[^*]+\*\* in a correct position/i,
  /sounds natural in context/i,
];

function parseArgs(argv) {
  let failBelow = DEFAULT_FAIL_BELOW;
  for (const token of argv) {
    if (token.startsWith('--fail-below=')) {
      const value = Number(token.split('=')[1]);
      if (Number.isFinite(value) && value >= 0 && value <= 100) {
        failBelow = value;
      }
    }
  }
  return { failBelow };
}

function extractParts(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

function getField(frontmatter, key) {
  const quoted = frontmatter.match(new RegExp(`^${key}:\\s*"([^"]*)"`, 'mi'));
  if (quoted) return quoted[1].trim();
  const plain = frontmatter.match(new RegExp(`^${key}:\\s*([^\\n]+)`, 'mi'));
  return plain ? plain[1].trim() : '';
}

function section(body, headingStart) {
  const escaped = headingStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = new RegExp(`^##\\s+${escaped}\\b.*$`, 'im');
  const startMatch = start.exec(body);
  if (!startMatch || startMatch.index == null) return '';
  const from = startMatch.index + startMatch[0].length;
  const rest = body.slice(from);
  const nextHeading = rest.search(/^##\s+/im);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function lessonMapBlock(body) {
  const match = String(body || '').match(/<nav class="lesson-map"[\s\S]*?<\/nav>/i);
  return match ? match[0] : '';
}

function explanationSection(body) {
  return section(body, 'How It Works') || section(body, 'Core Lesson');
}

function stripMarkdown(text) {
  return (text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*|__|\*|_/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentences(text) {
  return stripMarkdown(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function wordCount(text) {
  return (stripMarkdown(text).match(/\b[\w'-]+\b/g) || []).length;
}

function countMatches(text, pattern) {
  const matches = String(text || '').match(pattern);
  return matches ? matches.length : 0;
}

function averageSentenceLength(text) {
  const sents = sentences(text);
  if (sents.length === 0) return 0;
  const totalWords = sents.reduce((sum, s) => sum + wordCount(s), 0);
  return totalWords / sents.length;
}

function longSentenceCount(text, threshold = 28) {
  return sentences(text).filter((s) => wordCount(s) > threshold).length;
}

function titleKeywords(title) {
  const lower = String(title || '').toLowerCase().replace(/\((a1|a2|b1|b2|c1|c2)\)/g, ' ');
  if (/a,\s*an,\s*(and\s*)?the/.test(lower)) {
    return ['article', 'articles', 'a', 'an', 'the'];
  }
  const raw = lower.match(/\b[a-z][a-z'-]{1,}\b/g) || [];
  const cleaned = raw
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 || token === 'a' || token === 'an' || token === 'the')
    .filter((token) => !STOPWORDS.has(token));
  return [...new Set(cleaned)].slice(0, 8);
}

function keywordCoverage(text, keywords) {
  if (keywords.length === 0) return 1;
  const lower = String(text || '').toLowerCase();
  const matched = keywords.filter((keyword) => {
    if (/^[a-z]{1,3}$/.test(keyword)) {
      return lower.includes(` ${keyword} `) || lower.startsWith(`${keyword} `) || lower.endsWith(` ${keyword}`);
    }
    return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower);
  });
  return matched.length / keywords.length;
}

function bulletCount(text) {
  return (
    (String(text || '').match(/^\s*-\s+/gm) || []).length +
    (String(text || '').match(/<li>/gi) || []).length +
    (String(text || '').match(/class="lesson-support-card\b/gi) || []).length
  );
}

function h2Headings(body) {
  return [...String(body || '').matchAll(/^##\s+([^\r\n]+)/gm)].map((m) => m[1].trim());
}

function scoreTopicFidelity({ title, topic, examples, errors, practice }) {
  const keywords = titleKeywords(title);
  const combined = `${topic}\n${examples}\n${errors}\n${practice}`;
  const coverage = keywordCoverage(combined, keywords);
  const sectionHits = [topic, examples, errors, practice].filter((sec) => keywordCoverage(sec, keywords) > 0).length;

  let score = 0;
  if (coverage >= 0.8) score = 14;
  else if (coverage >= 0.6) score = 12;
  else if (coverage >= 0.45) score = 10;
  else if (coverage >= 0.3) score = 7;
  else score = 4;

  if (sectionHits >= 4) score += 6;
  else if (sectionHits >= 3) score += 4;
  else if (sectionHits >= 2) score += 2;

  return { score: Math.min(score, 20), coverage, sectionHits, keywords };
}

function scoreExplanation(topicText) {
  const issues = [];
  let score = 0;
  const length = stripMarkdown(topicText).length;
  const avgLen = averageSentenceLength(topicText);
  const longSents = longSentenceCount(topicText, 26);
  const countPanelBullets = (className) => {
    const match = topicText.match(new RegExp(`class="${className}"[\\s\\S]*?<ul>([\\s\\S]*?)<\\/ul>`, 'i'));
    return match ? countMatches(match[1], /<li>/g) : 0;
  };
  const useItWhenBullets = (() => {
    const panelCount = countPanelBullets('lesson-panel lesson-panel-when');
    if (panelCount > 0) return panelCount;
    const match = topicText.match(/Use it when:\s*([\s\S]*?)(?=\n[A-Z][^\n]*:|\n\n|$)/i);
    return match ? bulletCount(match[1]) : 0;
  })();
  const keepRulesBullets = (() => {
    const panelCount = countPanelBullets('lesson-panel lesson-panel-remember');
    if (panelCount > 0) return panelCount;
    const match = topicText.match(/Keep these rules in mind:\s*([\s\S]*?)(?=\n[A-Z][^\n]*:|\n\n|$)/i);
    return match ? bulletCount(match[1]) : 0;
  })();

  if (length >= 500) score += 4;
  else if (length >= 340) score += 3;
  else if (length >= 260) score += 2;
  else issues.push('Topic explanation is too short.');

  if (avgLen <= 18) score += 4;
  else if (avgLen <= 20) score += 3;
  else if (avgLen <= 23) score += 2;
  else issues.push(`Average sentence length is high (${avgLen.toFixed(1)} words).`);

  if (longSents <= 3) score += 2;
  else if (longSents <= 6) score += 1;
  else issues.push(`Too many long sentences (${longSents}).`);

  if (useItWhenBullets >= 3) score += 2;
  else issues.push('Use-it-when guidance needs at least 3 bullets.');

  if (keepRulesBullets >= 4) score += 3;
  else if (keepRulesBullets >= 3) score += 2;
  else issues.push('Keep-these-rules guidance needs at least 4 bullets.');

  if (JARGON_PATTERNS.some((pattern) => pattern.test(topicText))) {
    score = Math.max(0, score - 2);
    issues.push('Contains jargon that may be hard for CLB 6 learners.');
  }

  return { score: Math.min(score, 15), issues, avgLen, longSents };
}

function scoreExamples(examplesText) {
  let score = 0;
  const issues = [];
  const weak = (examplesText.match(/-\s+Weak:|class="lesson-line lesson-line-weak"/g) || []).length;
  const strong = (examplesText.match(/-\s+Strong:|class="lesson-line lesson-line-strong"/g) || []).length;
  const why = (examplesText.match(/-\s+Why it works:|class="lesson-card-note"/g) || []).length;

  if (weak >= 2 && strong >= 2 && weak === strong) score += 7;
  else issues.push('Examples need at least 2 balanced Weak/Strong pairs.');

  if (why >= 2) score += 3;
  else issues.push('Each model pair should include a short why-it-works line.');

  return { score: Math.min(score, 10), issues };
}

function scoreErrors(errorsText) {
  let score = 0;
  const issues = [];
  const cards = (errorsText.match(/<details class="lesson-accordion lesson-error">|class="lesson-error-card"/g) || []).length;
  const weak = (errorsText.match(/-\s+Weak:|class="lesson-line lesson-line-weak"/g) || []).length;
  const strong = (errorsText.match(/-\s+Strong:|class="lesson-line lesson-line-strong"/g) || []).length;
  const fix = (errorsText.match(/-\s+Fix:|class="lesson-fix-line"/g) || []).length;

  if (cards >= 3) score += 4;
  else issues.push('Need at least 3 error cards.');

  if (weak >= 3 && strong >= 3 && weak === strong) score += 3;
  else issues.push('Error cards need balanced Weak/Strong examples.');

  if (fix >= 3) score += 3;
  else issues.push('Each error card needs a clear fix line.');

  if (BANNED_GENERIC_ERROR_PATTERNS.some((pattern) => pattern.test(errorsText))) {
    score = Math.max(0, score - 3);
    issues.push('Common Errors includes banned generic fallback lines.');
  }

  return { score: Math.min(score, 10), issues };
}

function scorePractice(practiceText) {
  let score = 0;
  const issues = [];
  const tasks = (practiceText.match(/<article class="practice-task"/g) || []).length;
  const hasChoice = /data-task-type="choice"/i.test(practiceText);
  const hasOrder = /data-task-type="order"/i.test(practiceText);
  const hasTyping = /data-task-type="typing"/i.test(practiceText);
  const hasSort = /data-task-type="sort"/i.test(practiceText);
  const typeCount = [hasChoice, hasOrder, hasTyping, hasSort].filter(Boolean).length;

  if (tasks >= 4) score += 3;
  else if (tasks >= 3) score += 2;
  else issues.push('Practice Lab needs at least 3 task cards.');

  if (typeCount >= 3) score += 2;
  else issues.push('Practice Lab should use at least 3 task formats across the lesson.');

  return { score: Math.min(score, 5), issues };
}

function scoreInteractiveFeedback(labText) {
  let score = 0;
  const issues = [];
  const tasks = (labText.match(/<article class="practice-task"/g) || []).length;
  const feedbackAreas = (labText.match(/data-task-feedback/gi) || []).length;
  const liveScore = /data-practice-score/i.test(labText);
  const reset = /data-practice-reset/i.test(labText);

  if (feedbackAreas >= tasks && tasks > 0) score += 4;
  else issues.push('Each interactive task should include immediate feedback.');

  if (liveScore) score += 3;
  else issues.push('Practice Lab needs a visible score counter.');

  if (reset) score += 3;
  else issues.push('Practice Lab needs a reset control.');

  return { score: Math.min(score, 10), issues };
}

function scoreForm(body) {
  let score = 0;
  const issues = [];
  const headings = h2Headings(body);
  const introBlock = (() => {
    const match = String(body || '').match(/^([\s\S]*?)(?=^##\s+)/m);
    return match ? stripMarkdown(match[1]) : '';
  })();

  const required = [
    'Examples',
    'How It Works',
    'Common Mistakes',
    'Practice Lab',
    'Why It Matters',
  ];

  const missing = required.filter((name) => {
    return !headings.includes(name);
  });

  if (missing.length === 0) score += 10;
  else issues.push(`Missing key section(s): ${missing.join(', ')}`);

  const forbidden = headings.filter((h) =>
    /^(Goal|What\b|Key Rule in Plain Language|Topic Explanation and Use|Real-World Examples|Common Errors with|Interactive Practice Lab|Lesson Map|Core Lesson)\b/i.test(h)
  );
  if (forbidden.length > 0) {
    issues.push(`Contains forbidden heading(s): ${forbidden.join(', ')}`);
  }

  const practiceBlocks = (body.match(/<div class="practice-lab" data-practice-lab>/g) || []).length;
  const hasLessonMap = /class="lesson-map"/i.test(body);
  const hasContext = /class="lesson-context"/i.test(body) && introBlock.length >= 120;
  const hasImportance = /class="lesson-importance"/i.test(body);
  const visibleCards =
    (body.match(/class="lesson-example-card"/g) || []).length +
    (body.match(/class="lesson-error-card"/g) || []).length +
    (body.match(/class="lesson-panel /g) || []).length;
  if (practiceBlocks === 1) score += 2;
  else issues.push(`Interactive block count should be 1 (found ${practiceBlocks}).`);

  if (hasLessonMap) score += 1;
  if (hasContext) score += 1;
  if (hasImportance) score += 1;

  if (visibleCards >= 7) score += 4;
  else issues.push('Lesson should include multiple visible cards for guided reading.');

  if (/<details class="lesson-accordion/i.test(body)) {
    issues.push('Accordion markup is still present.');
  }

  const avgLen = averageSentenceLength(body);
  const longSents = longSentenceCount(body, 30);
  const bullets = bulletCount(body);
  if (avgLen <= 19 && longSents <= 8 && bullets >= 12) score += 10;
  else {
    if (avgLen > 19) issues.push(`Overall sentence length is high (${avgLen.toFixed(1)} words).`);
    if (longSents > 8) issues.push(`Too many very long sentences (${longSents}).`);
    if (bullets < 12) issues.push(`Not enough scan-friendly bullets (${bullets}).`);
  }

  if (!hasLessonMap) issues.push('Lesson Map block is missing.');
  if (!hasContext) issues.push('The lesson needs a clear context paragraph before the first section.');
  if (!hasImportance) issues.push('The lesson needs a Why It Matters block.');
  if (/class="lesson-section-lede"|class="lesson-map-intro"/i.test(body)) {
    issues.push('Generic section-intro banners are still present.');
  }

  return { score: Math.min(score, 30), issues };
}

function gradeFromScore(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

async function main() {
  const { failBelow } = parseArgs(process.argv.slice(2));
  const entries = await readdir(LESSON_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md'));

  const results = [];
  for (const file of files) {
    const filePath = path.join(LESSON_DIR, file.name);
    const raw = await readFile(filePath, 'utf8');
    const parts = extractParts(raw);
    if (!parts) continue;

    const category = getField(parts.frontmatter, 'category').toLowerCase();
    if (category !== 'grammar') continue;

    const title = getField(parts.frontmatter, 'title');
    const body = parts.body;
    const topic = explanationSection(body);
    const examples = section(body, 'Examples');
    const errors = section(body, 'Common Mistakes');
    const practice = section(body, 'Practice Lab');

    const topicFidelity = scoreTopicFidelity({ title, topic, examples, errors, practice });
    const explanation = scoreExplanation(topic);
    const examplesScore = scoreExamples(examples);
    const errorsScore = scoreErrors(errors);
    const practiceScore = scorePractice(practice);
    const answerScore = scoreInteractiveFeedback(practice);
    const formScore = scoreForm(body);

    const contentScore = topicFidelity.score + explanation.score + examplesScore.score + errorsScore.score + practiceScore.score + answerScore.score;
    const total = contentScore + formScore.score;
    const issues = [
      ...explanation.issues,
      ...examplesScore.issues,
      ...errorsScore.issues,
      ...practiceScore.issues,
      ...answerScore.issues,
      ...formScore.issues,
    ];

    results.push({
      file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      title,
      score: total,
      grade: gradeFromScore(total),
      contentScore,
      formScore: formScore.score,
      topicCoverage: Number(topicFidelity.coverage.toFixed(2)),
      issues,
    });
  }

  const totalLessons = results.length;
  const average = totalLessons === 0 ? 0 : results.reduce((sum, r) => sum + r.score, 0) / totalLessons;
  const passed = results.filter((r) => r.score >= failBelow);
  const failed = results.filter((r) => r.score < failBelow).sort((a, b) => a.score - b.score);

  console.log(`Grammar excellence audit: ${totalLessons} lesson(s) checked.`);
  console.log(`Threshold: ${failBelow} | Pass: ${passed.length} | Fail: ${failed.length} | Average: ${average.toFixed(1)}`);

  if (failed.length > 0) {
    console.error('\nLessons below threshold:');
    for (const row of failed.slice(0, 30)) {
      console.error(`- ${row.file} | score ${row.score} (${row.grade})`);
      for (const issue of row.issues.slice(0, 5)) {
        console.error(`  - ${issue}`);
      }
    }
    console.error(`\nTotal failed lessons: ${failed.length}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
