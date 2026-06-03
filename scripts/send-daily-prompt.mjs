#!/usr/bin/env node
/**
 * Sends one short CELPIP practice prompt per day as a Kit broadcast to
 * subscribers tagged `daily-prompt` (opt-in on the question-bank form;
 * see src/pages/questions/index.astro and subscribe-newsletter.mjs).
 *
 * Free-plan friendly: a scheduled broadcast, same pattern as the digest.
 * Prompts are pulled from the real question bank (src/content/questions) and
 * rotated by day so the daily email is genuine content, not filler.
 *
 *   node scripts/send-daily-prompt.mjs --dry-run
 *   node scripts/send-daily-prompt.mjs
 *
 * Env: KIT_API_KEY required. KIT_DAILY_PROMPT_TAG_ID defaults to 20024388.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const KIT_API_BASE = process.env.KIT_API_BASE || 'https://api.kit.com/v4';
const DAILY_TAG_ID = process.env.KIT_DAILY_PROMPT_TAG_ID || '20024388';
const SITE_URL = process.env.SITE_URL || 'https://ieltscorner.ca';
const SEND_DELAY_MINUTES = Number.parseInt(process.env.KIT_BROADCAST_SEND_DELAY_MINUTES || '5', 10);
const DRY_RUN = process.argv.includes('--dry-run');

function stripQuotes(v) {
  const t = v.trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))
    ? t.slice(1, -1)
    : t;
}

async function loadEnvFile(file) {
  try {
    const content = await readFile(file, 'utf8');
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i <= 0) continue;
      const key = line.slice(0, i).trim();
      if (process.env[key] === undefined) process.env[key] = stripQuotes(line.slice(i + 1));
    }
  } catch { /* ignore */ }
}

async function kitRequest(apiKey, pathName, method = 'POST', body = undefined) {
  const res = await fetch(`${KIT_API_BASE}${pathName}`, {
    method,
    headers: { 'X-Kit-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) throw new Error(`Kit ${method} ${pathName} -> ${res.status}: ${text.slice(0, 300)}`);
  return parsed;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = stripQuotes(line.slice(i + 1).trim());
  }
  return out;
}

async function loadQuestions() {
  const dir = path.join(process.cwd(), 'src', 'content', 'questions');
  const entries = [];
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    for (const file of files) {
      const fm = parseFrontmatter(await readFile(path.join(dir, file), 'utf8'));
      if (fm.title && fm.prompt) {
        entries.push({
          slug: file.replace(/\.(md|mdx)$/, ''),
          title: fm.title,
          prompt: fm.prompt,
          taskType: fm.taskType || '',
          targetCLB: fm.targetCLB || '',
        });
      }
    }
  } catch { /* dir missing */ }
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

// Deterministic day index so each day picks a stable, rotating prompt.
function dayIndex(total) {
  if (total <= 0) return 0;
  const epochDay = Math.floor(Date.now() / 86400000);
  return epochDay % total;
}

function buildHtml(q) {
  const url = `${SITE_URL}/questions/${q.slug}/`;
  const meta = [q.taskType && `${q.taskType} task`, q.targetCLB && `CLB ${q.targetCLB}`]
    .filter(Boolean)
    .join(' • ');
  return [
    '<p>Today’s CELPIP practice prompt:</p>',
    `<p><strong>${q.title}</strong>${meta ? ` <em>(${meta})</em>` : ''}</p>`,
    `<blockquote>${q.prompt}</blockquote>`,
    '<p>Give yourself the real time limit, write your answer, then check the model answer and scoring notes:</p>',
    `<p><a href="${url}">See the model answer</a></p>`,
    '<p>One prompt a day adds up fast. — IELTS Corner</p>',
  ].join('\n');
}

async function main() {
  await loadEnvFile(path.join(process.cwd(), '.env'));
  await loadEnvFile(path.join(process.cwd(), '.env.local'));

  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) {
    console.error('[error] KIT_API_KEY is not set.');
    process.exit(1);
  }

  const questions = await loadQuestions();
  if (!questions.length) {
    console.error('[error] No questions found in src/content/questions.');
    process.exit(1);
  }
  const q = questions[dayIndex(questions.length)];

  const subscriberFilter = [
    { all: [{ type: 'tag', ids: [Number(DAILY_TAG_ID)] }], any: null, none: null },
  ];
  const sendAt = new Date(Date.now() + SEND_DELAY_MINUTES * 60 * 1000).toISOString();
  const subject = `Daily CELPIP prompt: ${q.title}`;

  if (DRY_RUN) {
    console.log('[dry-run] Daily-prompt broadcast');
    console.log('  Total prompts available:', questions.length);
    console.log('  Today’s pick:', q.slug);
    console.log('  Subject:', subject);
    console.log('  Audience tag id:', DAILY_TAG_ID);
    console.log('  Scheduled send_at:', sendAt);
    return;
  }

  const payload = {
    subject,
    preview_text: 'One short CELPIP task for today, with a model answer.',
    content: buildHtml(q),
    description: `Daily CELPIP prompt | ${new Date().toISOString().slice(0, 10)} | ${q.slug}`,
    public: false,
    published_at: new Date().toISOString(),
    send_at: sendAt,
    subscriber_filter: subscriberFilter,
  };

  const created = await kitRequest(apiKey, '/broadcasts', 'POST', payload);
  console.log('[ok] Daily-prompt broadcast scheduled.');
  console.log('  Broadcast id:', created?.broadcast?.id);
  console.log('  Send at:', created?.broadcast?.send_at || sendAt);
}

main().catch((err) => {
  console.error('[error]', err?.message || err);
  process.exit(1);
});
