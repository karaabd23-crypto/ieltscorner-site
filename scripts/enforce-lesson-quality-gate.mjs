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

function lessonMapBlock(body) {
  const match = String(body || '').match(/<nav class="lesson-map"[\s\S]*?<\/nav>/i);
  return match ? match[0] : '';
}

function explanationSection(body) {
  return section(body, 'How It Works') || section(body, 'Core Lesson');
}

function countMatches(text, pattern) {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

function countPanelListItems(text, panelClass) {
  const match = String(text || '').match(
    new RegExp(`<section class="${panelClass}"[\\s\\S]*?<ul>([\\s\\S]*?)<\\/ul>`, 'i')
  );
  if (!match) return 0;
  return countMatches(match[1], /<li>/gi);
}

function checkFile(fileName, body, metadata) {
  const problems = [];
  const introBeforeSections = (() => {
    const match = String(body || '').match(/^([\s\S]*?)(?=^##\s+)/m);
    return match ? match[1].trim() : '';
  })();

  if (/with clearer explanations, structured practice, and exam-focused review\./i.test(metadata?.excerpt || '')) {
    problems.push('frontmatter excerpt still uses the old generic template');
  }

  if (/with clearer structure, stronger support, and exam-focused review\./i.test(metadata?.excerpt || '')) {
    problems.push('frontmatter excerpt still uses the old generic writing template');
  }

  if (/Read the model, do the controlled practice, then check yourself before moving on\./i.test(metadata?.heroTip || '')) {
    problems.push('frontmatter heroTip still uses the old generic template');
  }

  if (/Plan the job of the response before you write the sentences\./i.test(metadata?.heroTip || '')) {
    problems.push('frontmatter heroTip still uses the old generic writing template');
  }

  if (/^##\s+Real-World Focus\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Real-World Focus');
  }

  if (/^##\s+Topic Explanation and Use\b/im.test(body)) {
    problems.push('contains old heading: ## Topic Explanation and Use');
  }

  if (/^##\s+Lesson Map\b/im.test(body)) {
    problems.push('contains old heading: ## Lesson Map');
  }

  if (/^##\s+Core Lesson\b/im.test(body)) {
    problems.push('contains old heading: ## Core Lesson');
  }

  if (/^##\s+Real-World Examples\b/im.test(body)) {
    problems.push('contains old heading: ## Real-World Examples ...');
  }

  if (/^##\s+Common Errors with\b/im.test(body)) {
    problems.push('contains old heading: ## Common Errors with ...');
  }

  if (/^##\s+Interactive Practice Lab\b/im.test(body)) {
    problems.push('contains old heading: ## Interactive Practice Lab');
  }

  if (/^##\s+Goal\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Goal');
  }

  if (/^##\s+What\b/im.test(body)) {
    problems.push('contains forbidden heading starting with ## What ...');
  }

  if (/^##\s+Key Rule in Plain Language\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Key Rule in Plain Language');
  }

  if (/^##\s+Practice\s*$/im.test(body)) {
    problems.push('contains forbidden heading: ## Practice');
  }

  if (/^##\s+Answer Guide\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Answer Guide');
  }

  if (/^##\s+Self-Check Before You Leave\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Self-Check Before You Leave');
  }

  if (/^##\s+Interactive Exercise Test\b/im.test(body)) {
    problems.push('contains forbidden heading: ## Interactive Exercise Test');
  }

  if (/Murphy-style flow/i.test(body)) {
    problems.push('contains banned heading text: Murphy-style flow');
  }

  if (/<details class="lesson-accordion/i.test(body)) {
    problems.push('accordion markup is forbidden in lesson bodies; use visible cards instead');
  }

  if (/This lesson treats \*\*/i.test(body)) {
    problems.push('body still uses the old "This lesson treats" boilerplate');
  }

  if (!/class="lesson-context"/i.test(body) || introBeforeSections.length < 120) {
    problems.push('lesson must begin with a visible context paragraph before the first section');
  }

  if (!/^##\s+Examples\b/im.test(body)) {
    problems.push('missing section: Examples');
  }

  const lessonMap = lessonMapBlock(body);
  if (!lessonMap) {
    problems.push('missing lesson map block');
  } else {
    const requiredAnchors = [
      /href="#examples"/i,
      /href="#how-it-works"/i,
      /href="#common-mistakes"/i,
      /href="#practice-lab"/i,
      /href="#why-it-matters"/i,
    ];
    if (!requiredAnchors.every((pattern) => pattern.test(lessonMap))) {
      problems.push('lesson map is missing one or more required anchor links');
    }
  }

  if (!/^##\s+How It Works\b/im.test(body)) {
    problems.push('missing section: How It Works');
  } else {
    const explanation = explanationSection(body).trim();
    if (explanation.length < 280) {
      problems.push('How It Works is too short (needs clear definition + usage conditions)');
    }

    const hasUseConditions =
      countPanelListItems(explanation, 'lesson-panel lesson-panel-when') >= 3 ||
      countMatches(explanation, /<li>/g) >= 6;
    if (!hasUseConditions) {
      problems.push('How It Works must include explicit usage conditions and remember rules');
    }

    const bannedGenericPatterns = [
      /is a lexical field used to discuss a specific domain with precise meaning and natural collocations\./i,
      /is a grammar control area in which form choice changes precision, logic, and readability\./i,
      /Match form choice to the exact meaning you need to express\./i,
      /Keep agreement, order, and reference stable within each clause\./i,
      /Increase complexity only when it improves clarity and evidence delivery\./i,
    ];
    if (bannedGenericPatterns.some((pattern) => pattern.test(explanation))) {
      problems.push('How It Works contains banned generic boilerplate; rewrite with topic-specific instruction');
    }
  }

  if (!/^##\s+Common Mistakes\b/im.test(body)) {
    problems.push('missing section: Common Mistakes');
  } else {
    const commonErrors = section(body, 'Common Mistakes');
    const legacyWeak = countMatches(commonErrors, /^-\s+Real-world weak:/gim);
    const legacyBetter = countMatches(commonErrors, /^-\s+Real-world better:/gim);
    if (legacyWeak > 0 || legacyBetter > 0) {
      problems.push('Common Mistakes uses legacy labels (Real-world weak/better); use Weak/Strong only');
    }

    const weakCount = countMatches(commonErrors, /(^-\s+Weak:|class="lesson-line lesson-line-weak")/gim);
    const strongCount = countMatches(commonErrors, /(^-\s+Strong:|class="lesson-line lesson-line-strong")/gim);
    if (weakCount === 0 || strongCount === 0) {
      problems.push('Common Mistakes must include Weak and Strong examples');
    }
    if (weakCount !== strongCount) {
      problems.push(`Common Mistakes examples are unbalanced (weak=${weakCount}, strong=${strongCount})`);
    }

    const bannedErrorFallbackPatterns = [
      /mixing timelines inside one sentence/i,
      /adding complexity without meaning/i,
      /keep one timeline and match all verbs to it/i,
      /keep only forms that make your message clearer/i,
    ];
    if (bannedErrorFallbackPatterns.some((pattern) => pattern.test(commonErrors))) {
      problems.push('Common Mistakes includes banned generic fallback content; rewrite with topic-specific errors');
    }
  }

  if (!/^##\s+Practice Lab\b/im.test(body)) {
    problems.push('missing section: Practice Lab');
  }

  if (/^##\s+Want Personalized Score Feedback\?\s*$/im.test(body)) {
    problems.push('contains old support heading: ## Want Personalized Score Feedback?');
  }

  if (!/^##\s+Get Feedback\b/im.test(body)) {
    problems.push('missing section: Get Feedback');
  } else {
    const feedback = section(body, 'Get Feedback');
    if (!/class="lesson-support-callout"/i.test(feedback)) {
      problems.push('Get Feedback must use the shared lesson support callout');
    }
    const requiredLinks = [
      /href="\/essay-correction"/i,
      /href="\/tutoring"/i,
      /href="\/celpip\/writing\/ai-feedback"/i,
      /href="\/webinar"/i,
    ];
    if (!requiredLinks.every((pattern) => pattern.test(feedback))) {
      problems.push('Get Feedback is missing one or more core support links');
    }
  }

  if (!/^##\s+Why It Matters\b/im.test(body)) {
    problems.push('missing section: Why It Matters');
  } else {
    const importance = section(body, 'Why It Matters').trim();
    if (importance.length < 120) {
      problems.push('Why It Matters is too short');
    }
    if (!/why it matters|why it matters:|why this matters/i.test(importance)) {
      problems.push('Why It Matters should explain the value of the topic directly');
    }
  }

  if (/class="lesson-section-lede"/i.test(body) || /class="lesson-map-intro"/i.test(body)) {
    problems.push('remove generic section intro banners and duplicated lesson-map labels');
  }

  if (/^##\s+Practice Lab\b/im.test(body)) {
    const lab = section(body, 'Practice Lab');
    const taskCount = countMatches(lab, /<article class="practice-task"/gim);
    if (taskCount < 3) {
      problems.push('Practice Lab must include at least 3 interactive tasks');
    }
    if (!/data-practice-score/i.test(lab)) {
      problems.push('Practice Lab must include a visible live score block');
    }
    if (!/data-task-feedback/i.test(lab)) {
      problems.push('Practice Lab must include immediate feedback areas');
    }
  }

  const title = (metadata?.title || '').toLowerCase();

  if (/word formation:\s*prefix|prefixes/.test(title)) {
    const explanation = explanationSection(body).toLowerCase();
    const examples = section(body, 'Examples').toLowerCase();
    const combined = `${explanation}\n${examples}`;

    if ((combined.match(/prefix/g) || []).length < 2) {
      problems.push('Prefix lesson lacks clear prefix-focused explanation (needs repeated prefix references)');
    }
    if (!/(un-|in-|im-|dis-|mis-|re-|over-|under-)/.test(combined)) {
      problems.push('Prefix lesson missing concrete prefix forms (for example un-, dis-, mis-, re-)');
    }
  }

  if (/word formation:\s*suffix|suffixes/.test(title)) {
    const explanation = explanationSection(body).toLowerCase();
    const examples = section(body, 'Examples').toLowerCase();
    const combined = `${explanation}\n${examples}`;

    if ((combined.match(/suffix/g) || []).length < 2) {
      problems.push('Suffix lesson lacks clear suffix-focused explanation (needs repeated suffix references)');
    }
    if (!/(-tion|-ment|-ness|-able|-ive|-ly|-ity)/.test(combined)) {
      problems.push('Suffix lesson missing concrete suffix patterns (for example -tion, -ment, -ly)');
    }
  }

  if (/noun formation/.test(title)) {
    const explanation = explanationSection(body).toLowerCase();
    const examples = section(body, 'Examples').toLowerCase();
    const combined = `${explanation}\n${examples}`;

    if (!/noun/.test(combined)) {
      problems.push('Noun formation lesson must explicitly explain noun slot usage');
    }
    if (!/(decision|improvement|expansion|nominali[sz]ation|-tion|-ment|-ness|-ity)/.test(combined)) {
      problems.push('Noun formation lesson missing concrete noun-formation examples');
    }
  }

  if (/(semicolon|semicolons|colon|colons)/.test(title)) {
    const explanation = explanationSection(body);
    const commonErrors = section(body, 'Common Mistakes');
    const examples = section(body, 'Examples');

    if (/decide your exact message/i.test(explanation + '\n' + commonErrors)) {
      problems.push('Punctuation lesson guidance is generic; requires punctuation-specific instruction');
    }
    const punctuationTerms = /independent clause|conjunctive adverb|complete clause|comma splice|introduce explanation|introduce a list/i;
    if (!punctuationTerms.test(explanation + '\n' + commonErrors)) {
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
      excerpt: getField(frontmatter, 'excerpt'),
      heroTip: getField(frontmatter, 'heroTip'),
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
