#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const LESSON_DIR = path.resolve('src/content/lessons');

function parseArgs(argv) {
  const args = { changed: false, working: false, base: '', head: 'HEAD' };
  for (const token of argv) {
    if (token === '--changed') args.changed = true;
    else if (token === '--working') args.working = true;
    else if (token.startsWith('--base=')) args.base = token.slice('--base='.length);
    else if (token.startsWith('--head=')) args.head = token.slice('--head='.length);
  }
  return args;
}

function getChangedLessonFiles(base, head) {
  if (!base) {
    throw new Error('The --changed mode requires --base=<git-ref-or-sha>.');
  }

  const cmd = `git diff --name-only ${base}...${head} -- src/content/lessons`;
  const output = execSync(cmd, { encoding: 'utf8' }).trim();
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.resolve(file));
}

function getWorkingLessonFiles() {
  const cmd = 'git ls-files --modified --others --exclude-standard -- src/content/lessons';
  const output = execSync(cmd, { encoding: 'utf8' }).trim();
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.resolve(file));
}

function getBody(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1] : raw;
}

function getFrontmatter(raw) {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return match ? match[1] : '';
}

function getField(frontmatter, key) {
  const quoted = frontmatter.match(new RegExp(`^${key}:\\s*"([^"]*)"`, 'mi'));
  if (quoted) return quoted[1].trim();
  const plain = frontmatter.match(new RegExp(`^${key}:\\s*([^\\n]+)`, 'mi'));
  return plain ? plain[1].trim() : '';
}

function section(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = new RegExp(`^##\\s+${escaped}\\b.*$`, 'im');
  const startMatch = start.exec(body);
  if (!startMatch || startMatch.index === undefined) return '';

  const from = startMatch.index + startMatch[0].length;
  const rest = body.slice(from);
  const nextHeading = rest.search(/^##\s+/im);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function countMatches(text, pattern) {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

const GENERIC_KEY_RULE_PATTERNS = [
  /decide your (real|exact) message first/i,
  /choose\s+\*\*?word order and syntax\*\*?\s+to match that message/i,
  /write one short, correct sentence before adding extra detail/i,
  /add one support detail only after (the )?(grammar|wording) is (correct|accurate)/i,
  /read once and fix one clear error before moving on/i,
];

function hasGenericKeyRuleText(text) {
  return GENERIC_KEY_RULE_PATTERNS.some((pattern) => pattern.test(text));
}

function checkFile(fileName, body, metadata) {
  const problems = [];

  if (/^##\s+Real-World Focus\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Real-World Focus');
  }

  if (!/^##\s+Key Rule in Plain Language\s*$/im.test(body)) {
    problems.push('missing section: Key Rule in Plain Language');
  } else {
    const keyRule = section(body, 'Key Rule in Plain Language');
    const stepCount = countMatches(keyRule, /^\d+\.\s+/gm);
    if (stepCount < 4) {
      problems.push(`Key Rule section has too few steps (${stepCount}; need at least 4)`);
    }
    if (hasGenericKeyRuleText(keyRule)) {
      problems.push('Key Rule in Plain Language contains banned generic boilerplate text');
    }
  }

  if (!/^##\s+Common Errors with\b/im.test(body)) {
    problems.push('missing section: Common Errors with ...');
  } else {
    const commonErrors = section(body, 'Common Errors with');
    const legacyWeak = countMatches(commonErrors, /^-\s+Real-world weak:/gim);
    const legacyBetter = countMatches(commonErrors, /^-\s+Real-world better:/gim);
    if (legacyWeak > 0 || legacyBetter > 0) {
      problems.push('Common Errors section uses legacy labels (Real-world weak/better); use Weak/Strong only');
    }

    const weakCount = countMatches(commonErrors, /^-\s+Weak:/gim);
    const strongCount = countMatches(commonErrors, /^-\s+Strong:/gim);
    if (weakCount === 0 || strongCount === 0) {
      problems.push('Common Errors section must include Weak and Strong examples');
    }
    if (weakCount !== strongCount) {
      problems.push(`Common Errors examples are unbalanced (weak=${weakCount}, strong=${strongCount})`);
    }
  }

  if (!/^##\s+Real-World Examples\b/im.test(body)) {
    problems.push('missing section: Real-World Examples');
  }

  if (!/^##\s+Topic Explanation and Use\s*$/im.test(body)) {
    problems.push('missing section: Topic Explanation and Use');
  } else {
    const explanation = section(body, 'Topic Explanation and Use').trim();
    if (explanation.length < 280) {
      problems.push('Topic Explanation and Use is too short (needs clear definition + usage conditions)');
    }

    const hasUseConditions = /use conditions\s*:/i.test(explanation) && countMatches(explanation, /^-\s+/gm) >= 3;
    if (!hasUseConditions) {
      problems.push('Topic Explanation and Use must include at least 3 explicit usage conditions');
    }

    if (/is a grammar form used to control meaning, time, relationship, or emphasis/i.test(explanation)) {
      problems.push('Topic Explanation and Use is generic placeholder text; requires topic-specific explanation');
    }

    const bannedGenericPatterns = [
      /is a grammar control area in which form choice changes precision, logic, and readability\./i,
      /Use\s+.+\s+to build sentences that are structurally accurate and easy for exam readers to process on first read\./i,
      /Match form choice to the exact meaning you need to express\./i,
      /Keep agreement, order, and reference stable within each clause\./i,
      /Increase complexity only when it improves clarity and evidence delivery\./i,
      /When\s+.+\s+is controlled, the reader can track logic without re-reading\./i,
      /In timed tasks, accurate\s+.+\s+supports concise and credible exam writing\./i,
    ];
    if (bannedGenericPatterns.some((pattern) => pattern.test(explanation))) {
      problems.push('Topic Explanation and Use contains banned generic boilerplate; rewrite with topic-specific instruction and examples');
    }
  }

  if (/^##\s+Practice\s*$/im.test(body)) {
    const practice = section(body, 'Practice');
    if (/^###\s+Exercise\s+/im.test(practice)) {
      problems.push('Practice section contains duplicate plain exercise headings; keep only accordion exercise blocks');
    }
  }

  const title = (metadata?.title || '').toLowerCase();
  if (/(semicolon|semicolons|colon|colons)/.test(title)) {
    const keyRule = section(body, 'Key Rule in Plain Language');
    const explanation = section(body, 'Topic Explanation and Use');
    const examples = section(body, 'Real-World Examples');

    if (/decide your exact message/i.test(keyRule)) {
      problems.push('Punctuation lesson key rules are generic; requires punctuation-specific instruction');
    }
    const punctuationTerms = /independent clause|conjunctive adverb|complete clause|comma splice|introduce explanation|introduce a list/i;
    if (!punctuationTerms.test(explanation + '\n' + keyRule)) {
      problems.push('Punctuation lesson missing core usage conditions (independent clause/complete clause/etc.)');
    }

    if (!/[;]/.test(explanation + '\n' + examples)) {
      problems.push('Punctuation lesson missing semicolon usage examples');
    }
    if (!/[:]/.test(explanation + '\n' + examples)) {
      problems.push('Punctuation lesson missing colon usage examples');
    }
  }

  return problems;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let filePaths = [];
  if (args.working) {
    filePaths = getWorkingLessonFiles();
    if (filePaths.length === 0) {
      console.log('Lesson quality gate passed. No working-tree lesson files to check.');
      return;
    }
  } else if (args.changed) {
    filePaths = getChangedLessonFiles(args.base, args.head);
    if (filePaths.length === 0) {
      console.log('Lesson quality gate passed. No changed lesson files to check.');
      return;
    }
  } else {
    const entries = await readdir(LESSON_DIR, { withFileTypes: true });
    filePaths = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(LESSON_DIR, entry.name));
  }

  const violations = [];

  for (const filePath of filePaths) {
    const raw = await readFile(filePath, 'utf8');
    const frontmatter = getFrontmatter(raw);
    const body = getBody(raw);
    const metadata = {
      title: getField(frontmatter, 'title'),
      category: getField(frontmatter, 'category'),
    };
    const issues = checkFile(path.basename(filePath), body, metadata);

    if (issues.length > 0) {
      violations.push({ file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'), issues });
    }
  }

  if (violations.length > 0) {
    console.error('Lesson quality gate failed. The following files violate required standards:\n');
    for (const v of violations) {
      console.error(`- ${v.file}`);
      for (const issue of v.issues) {
        console.error(`  - ${issue}`);
      }
    }
    console.error(`\nTotal files with violations: ${violations.length}`);
    process.exit(1);
  }

  console.log(`Lesson quality gate passed for ${filePaths.length} lesson files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
