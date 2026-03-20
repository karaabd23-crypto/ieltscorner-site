#!/usr/bin/env node
/**
 * rewrite-lesson-content.mjs
 *
 * Sends each existing lesson to OpenAI to:
 *  1. Evaluate & suggest a better title
 *  2. Detect off-topic / generic content & examples
 *  3. Rewrite the "How It Works" teach-grid with topic-specific content
 *  4. Fix generic card notes and example explanations
 *
 * Usage:
 *   node scripts/rewrite-lesson-content.mjs                     # dry-run, prints report
 *   node scripts/rewrite-lesson-content.mjs --apply              # writes changes to files
 *   node scripts/rewrite-lesson-content.mjs --limit 5            # process only 5 lessons
 *   node scripts/rewrite-lesson-content.mjs --file some-slug.md  # process one file
 *   node scripts/rewrite-lesson-content.mjs --model gpt-4o-mini  # override model
 *   node scripts/rewrite-lesson-content.mjs --concurrency 3      # parallel requests (default 2)
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';

// ── Load .env if present ─────────────────────────────────────────────
const envPath = path.resolve('.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const LESSON_DIR = path.resolve('src/content/lessons');
const PROMPT_FILE = path.resolve('prompts/lesson-rewriter.md');
const REPORT_DIR = path.resolve('reports');
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// ── CLI args ──────────────────────────────────────────────────────────
function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = {
    apply: false,
    limit: 0,
    file: null,
    model: DEFAULT_MODEL,
    concurrency: 1,
    retryFailed: null,  // path to previous report JSON to retry only failed entries
    skipRewritten: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--limit') opts.limit = parseInt(argv[++i], 10);
    else if (arg === '--file') opts.file = argv[++i];
    else if (arg === '--model') opts.model = argv[++i];
    else if (arg === '--concurrency') opts.concurrency = parseInt(argv[++i], 10);
    else if (arg === '--retry-failed') opts.retryFailed = argv[++i];
    else if (arg === '--skip-rewritten') opts.skipRewritten = true;
    else console.warn(`[warn] Unknown arg: ${arg}`);
  }
  return opts;
}

// ── Extract frontmatter fields ───────────────────────────────────────
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: '', body: raw, fields: {} };

  const fm = match[1];
  const body = raw.slice(match[0].length).trimStart();
  const fields = {};

  // Simple YAML extraction for the fields we need
  const titleMatch = fm.match(/^title:\s*"(.+?)"/m);
  if (titleMatch) fields.title = titleMatch[1];

  const catMatch = fm.match(/^category:\s*"(.+?)"/m);
  if (catMatch) fields.category = catMatch[1];

  const levelMatch = fm.match(/^level:\s*"(.+?)"/m);
  if (levelMatch) fields.level = levelMatch[1];

  return { frontmatter: match[0], body, fields };
}

// ── Section extraction helpers ───────────────────────────────────────
function extractSection(body, startHeading, endHeadingOrEOF) {
  // Find the section between two ## headings (or to end-of-file)
  const startRe = new RegExp(`^${escapeRegex(startHeading)}\\s*$`, 'm');
  const startMatch = body.match(startRe);
  if (!startMatch) return null;

  const startIdx = startMatch.index;
  let endIdx = body.length;

  if (endHeadingOrEOF) {
    const endRe = new RegExp(`^${escapeRegex(endHeadingOrEOF)}\\s*$`, 'm');
    const rest = body.slice(startIdx + startMatch[0].length);
    const endMatch = rest.match(endRe);
    if (endMatch) {
      endIdx = startIdx + startMatch[0].length + endMatch.index;
    }
  }

  return {
    full: body.slice(startIdx, endIdx),
    startIdx,
    endIdx,
  };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Helpers ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── OpenAI call with retry ───────────────────────────────────────────
async function callRewriter({ title, category, level, body, model }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const systemPrompt = await readFile(PROMPT_FILE, 'utf8');

  const userMessage = `## Lesson to audit

**Title:** ${title}
**Category:** ${category}
**Level:** ${level}

**Current body:**

${body}`;

  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 14000,
      }),
    });

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        const errorText = await response.text();
        throw new Error(`OpenAI 429 after ${MAX_RETRIES} retries: ${errorText}`);
      }
      // Parse retry-after from header or error body
      const retryAfter = response.headers.get('retry-after');
      let waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : (2 ** attempt) * 3000 + Math.random() * 2000;
      if (waitMs < 2000) waitMs = 2000;
      console.log(`    ↻ Rate limited, retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const usage = data.usage || {};
    return { result: JSON.parse(content), usage };
  }
}

// ── Apply rewrites to a lesson file ──────────────────────────────────
// Convert markdown bold/italic inside HTML to proper HTML tags
function fixMarkdownInHtml(html) {
  if (!html) return html;
  // **bold** → <strong>bold</strong>
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  // *italic* → <em>italic</em> (but not inside HTML attributes)
  html = html.replace(/(?<!<[^>]*)\*([^*]+?)\*/g, '<em>$1</em>');
  return html;
}

function applyRewrites(raw, result) {
  // Sanitize all HTML fields from markdown artifacts
  for (const key of ['rewrittenTeachGrid', 'rewrittenExamples', 'rewrittenErrors', 'rewrittenContext', 'rewrittenWhyItMatters', 'rewrittenPracticeLab']) {
    if (result[key]) result[key] = fixMarkdownInHtml(result[key]);
  }

  let updated = raw;
  let changes = [];

  // 1. Rewrite teach-grid (How It Works section)
  if (result.rewrittenTeachGrid) {
    const teachRe = /<div class="lesson-teach-grid">[\s\S]*?<\/section>\s*<\/div>/;
    const match = updated.match(teachRe);
    if (match) {
      updated = updated.replace(match[0], result.rewrittenTeachGrid.trim());
      changes.push('Rewrote How It Works teach-grid');
    }
  }

  // 2. Rewrite examples grid
  if (result.rewrittenExamples) {
    const exRe = /<div class="lesson-example-grid">[\s\S]*?<\/article>\s*<\/div>/;
    const match = updated.match(exRe);
    if (match) {
      updated = updated.replace(match[0], result.rewrittenExamples.trim());
      changes.push('Rewrote Examples section');
    }
  }

  // 3. Rewrite error grid
  if (result.rewrittenErrors) {
    const errRe = /<div class="lesson-error-grid">[\s\S]*?<\/article>\s*<\/div>/;
    const match = updated.match(errRe);
    if (match) {
      updated = updated.replace(match[0], result.rewrittenErrors.trim());
      changes.push('Rewrote Common Mistakes section');
    }
  }

  // 4. Rewrite context
  if (result.rewrittenContext) {
    const ctxRe = /<div class="lesson-context">[\s\S]*?<\/div>/;
    const match = updated.match(ctxRe);
    if (match) {
      updated = updated.replace(match[0], result.rewrittenContext.trim());
      changes.push('Rewrote lesson context');
    }
  }

  // 5. Rewrite "Why It Matters"
  if (result.rewrittenWhyItMatters) {
    const whyRe = /<p class="lesson-importance">[\s\S]*?<\/p>/;
    const match = updated.match(whyRe);
    if (match) {
      updated = updated.replace(match[0], result.rewrittenWhyItMatters.trim());
      changes.push('Rewrote Why It Matters');
    }
  }

  // 6. Rewrite Practice Lab (use section boundary for reliable matching)
  if (result.rewrittenPracticeLab) {
    const labStart = updated.indexOf('<div class="practice-lab" data-practice-lab>');
    if (labStart !== -1) {
      // Find the next ## heading after the practice lab
      const afterLab = updated.indexOf('\n## ', labStart + 1);
      const labEnd = afterLab !== -1 ? afterLab : updated.length;
      // Walk backward from boundary to find last </div>
      const section = updated.slice(labStart, labEnd).trimEnd();
      updated = updated.slice(0, labStart) + result.rewrittenPracticeLab.trim() + updated.slice(labStart + section.length);
      changes.push('Rewrote Practice Lab');
    }
  }

  // 7. Update excerpt in frontmatter
  if (result.rewrittenExcerpt) {
    const excerptRe = /^excerpt:\s*"(.+?)"/m;
    const match = updated.match(excerptRe);
    if (match) {
      updated = updated.replace(match[0], `excerpt: "${result.rewrittenExcerpt}"`);
      changes.push('Rewrote excerpt');
    }
  }

  // 8. Update title if suggested
  if (result.titleVerdict === 'needs-improvement' && result.suggestedTitle) {
    const titleRe = /^title:\s*"(.+?)"/m;
    const titleMatch = updated.match(titleRe);
    if (titleMatch) {
      updated = updated.replace(titleMatch[0], `title: "${result.suggestedTitle}"`);
      changes.push(`Title: "${titleMatch[1]}" → "${result.suggestedTitle}"`);
    }
  }

  return { updated, changes };
}

// ── Batch runner with concurrency control ────────────────────────────
async function runBatch(items, concurrency, fn) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
      // Delay between calls to stay under TPM rate limits
      await sleep(15000);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (!process.env.OPENAI_API_KEY) {
    console.error('[error] Set OPENAI_API_KEY environment variable first.');
    process.exit(1);
  }

  // Collect lesson files
  let files;
  if (opts.file) {
    files = [opts.file];
  } else if (opts.retryFailed) {
    // Load previous report and retry only entries with errors
    const prevReport = JSON.parse(await readFile(opts.retryFailed, 'utf8'));
    files = prevReport.filter((e) => e.error).map((e) => e.file);
    console.log(`[info] Retrying ${files.length} failed lesson(s) from ${opts.retryFailed}`);
  } else {
    const all = await readdir(LESSON_DIR);
    files = all.filter((f) => f.endsWith('.md')).sort();
  }

  // Skip files already rewritten (modified after the main-run cutoff)
  if (opts.skipRewritten) {
    const cutoff = new Date('2026-03-19T21:35:00').getTime();
    const before = files.length;
    files = files.filter((f) => {
      const stat = statSync(path.join(LESSON_DIR, f));
      return stat.mtimeMs < cutoff;
    });
    console.log(`[info] --skip-rewritten: ${before - files.length} already done, ${files.length} remaining`);
  }

  if (opts.limit > 0) files = files.slice(0, opts.limit);
  console.log(`[info] Processing ${files.length} lesson(s) with model ${opts.model}`);
  console.log(`[info] Mode: ${opts.apply ? 'APPLY (writing files)' : 'DRY-RUN (report only)'}`);
  console.log(`[info] Concurrency: ${opts.concurrency}\n`);

  const report = [];
  let totalInput = 0;
  let totalOutput = 0;
  let errors = 0;

  const results = await runBatch(files, opts.concurrency, async (file, i) => {
    const filePath = path.join(LESSON_DIR, file);
    const raw = await readFile(filePath, 'utf8');
    const { body, fields } = parseFrontmatter(raw);

    if (!fields.title || !fields.category) {
      console.log(`[skip] ${file} — missing title or category`);
      return null;
    }

    const num = `[${i + 1}/${files.length}]`;
    console.log(`${num} ${file} — "${fields.title}" (${fields.category} ${fields.level || '?'})`);

    try {
      const { result, usage } = await callRewriter({
        title: fields.title,
        category: fields.category || 'grammar',
        level: fields.level || 'B1',
        body,
        model: opts.model,
      });

      totalInput += usage.prompt_tokens || 0;
      totalOutput += usage.completion_tokens || 0;

      // Build report entry
      const entry = {
        file,
        title: fields.title,
        titleVerdict: result.titleVerdict,
        suggestedTitle: result.suggestedTitle || null,
        titleReason: result.titleReason || '',
        relevanceIssues: result.relevanceIssues || [],
        changes: [],
      };

      if (result.titleVerdict === 'needs-improvement') {
        console.log(`  ⚠ Title: "${fields.title}" → "${result.suggestedTitle}"`);
        console.log(`    Reason: ${result.titleReason}`);
      } else {
        console.log(`  ✓ Title OK`);
      }

      if (result.relevanceIssues?.length) {
        for (const issue of result.relevanceIssues) {
          console.log(`  ⚠ ${issue}`);
        }
      }

      // Apply rewrites
      const { updated, changes } = applyRewrites(raw, result);
      entry.changes = changes;

      if (changes.length) {
        for (const c of changes) console.log(`  → ${c}`);
      } else {
        console.log(`  (no content changes needed)`);
      }

      if (opts.apply && changes.length > 0) {
        await writeFile(filePath, updated, 'utf8');
        console.log(`  ✓ Saved`);
      }

      return entry;
    } catch (err) {
      errors++;
      console.error(`  ✗ Error: ${err.message}`);
      return { file, error: err.message };
    }
  });

  // Filter out nulls
  const entries = results.filter(Boolean);
  report.push(...entries);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Processed: ${entries.length}`);
  console.log(`Errors: ${errors}`);

  const titleFixes = entries.filter((e) => e.titleVerdict === 'needs-improvement').length;
  const contentFixes = entries.filter((e) => e.changes?.length > 0).length;
  const relevanceFlags = entries.filter((e) => e.relevanceIssues?.length > 0).length;

  console.log(`Title improvements suggested: ${titleFixes}`);
  console.log(`Content sections rewritten: ${contentFixes}`);
  console.log(`Off-topic/generic content flagged: ${relevanceFlags}`);
  console.log(`Tokens used: ${totalInput.toLocaleString()} in / ${totalOutput.toLocaleString()} out`);

  const costIn = (totalInput / 1_000_000) * 2.5;
  const costOut = (totalOutput / 1_000_000) * 10;
  console.log(`Estimated cost: $${(costIn + costOut).toFixed(2)}`);

  // Save report JSON
  await mkdir(REPORT_DIR, { recursive: true });
  const reportFile = path.join(REPORT_DIR, `rewrite-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved: ${reportFile}`);

  if (!opts.apply && contentFixes > 0) {
    console.log(`\nRun with --apply to write changes to files.`);
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
