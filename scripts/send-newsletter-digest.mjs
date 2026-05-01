#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getLatestInstagramPost,
  getLatestYouTubeVideo,
  getTelegramChannelSnapshot,
} from './lib/social-feed.mjs';

const DEFAULT_SITE_URL = 'https://ieltscorner.ca';
const DEFAULT_STATE_FILE = '.cache/newsletter-state.json';
const DEFAULT_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@KaraAbdolmaleki';
const DEFAULT_TELEGRAM_CHANNEL_URL = 'https://t.me/Kaysenglishcorner';
const DEFAULT_INSTAGRAM_USERNAME = 'ieltscorner.ca';
const DEFAULT_DIGEST_FORM_ID = 9278182;
const DEFAULT_SEND_DELAY_MINUTES = 5;
const KIT_API_BASE = 'https://api.kit.com/v4';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeAbsoluteUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(line.slice(separatorIndex + 1));

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env files
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
    preview: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--preview') {
      options.preview = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function parseOptionalInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalBoolean(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeSubscriberEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isLikelyValidEmail(value) {
  const email = normalizeSubscriberEmail(value);
  if (!email || email.length > 320) {
    return false;
  }
  if (!EMAIL_PATTERN.test(email)) {
    return false;
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return false;
  }
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  return true;
}

async function fetchKitJson(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kit API failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function kitRequest({ apiKey, pathName, method = 'POST', body = {} }) {
  const response = await fetch(`${KIT_API_BASE}${pathName}`, {
    method,
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const firstError = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
    const detail = String(firstError || text || '').trim().slice(0, 240) || `HTTP ${response.status}`;
    throw new Error(`Kit API failed (${response.status}): ${detail}`);
  }

  return {
    status: response.status,
    body: parsed,
  };
}

async function collectKitSubscribers({ apiKey, buildPath, maxPages = 30, perPage = 500 }) {
  const deduped = new Map();
  let cursor = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams();
    params.set('per_page', String(perPage));
    if (cursor) {
      params.set('after', cursor);
    }

    const payload = await fetchKitJson(`${KIT_API_BASE}${buildPath(params)}`, apiKey);

    const rows = Array.isArray(payload?.subscribers) ? payload.subscribers : [];
    for (const row of rows) {
      const email = normalizeSubscriberEmail(row?.email_address);
      if (!isLikelyValidEmail(email)) {
        continue;
      }

      const subscriberState = String(row?.state || '').trim().toLowerCase();
      if (subscriberState && subscriberState !== 'active') {
        continue;
      }

      const submittedAt = String(row?.added_at || row?.created_at || '').trim();
      const existing = deduped.get(email);
      if (!existing) {
        deduped.set(email, {
          email,
          submittedAt,
        });
        continue;
      }

      const nextTime = Date.parse(submittedAt || '');
      const currentTime = Date.parse(existing.submittedAt || '');
      if (Number.isFinite(nextTime) && (!Number.isFinite(currentTime) || nextTime > currentTime)) {
        deduped.set(email, {
          email,
          submittedAt,
        });
      }
    }

    const hasNextPage = Boolean(payload?.pagination?.has_next_page);
    const nextCursor = String(payload?.pagination?.end_cursor || '').trim() || null;
    if (!hasNextPage || !nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  return [...deduped.values()].sort((a, b) => {
    const aTime = Date.parse(a.submittedAt || '');
    const bTime = Date.parse(b.submittedAt || '');
    if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
    if (!Number.isFinite(aTime)) return 1;
    if (!Number.isFinite(bTime)) return -1;
    return bTime - aTime;
  });
}

async function getKitFormSubscribers({ apiKey, formId, maxPages = 30, perPage = 500 }) {
  return collectKitSubscribers({
    apiKey,
    maxPages,
    perPage,
    buildPath: (params) => `/forms/${formId}/subscribers?${params.toString()}`,
  });
}

async function getKitTagSubscribers({ apiKey, tagId, maxPages = 30, perPage = 500 }) {
  return collectKitSubscribers({
    apiKey,
    maxPages,
    perPage,
    buildPath: (params) => `/tags/${tagId}/subscribers?${params.toString()}`,
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!pair) {
      continue;
    }

    const key = pair[1];
    let value = pair[2].trim();
    value = stripWrappingQuotes(value);

    if (value === 'true') {
      data[key] = true;
    } else if (value === 'false') {
      data[key] = false;
    } else {
      data[key] = value;
    }
  }

  return data;
}

function toIsoDate(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function getLatestLessons(perSection = 3) {
  const lessonsDir = path.join(process.cwd(), 'src', 'content', 'lessons');
  const files = await readdir(lessonsDir);
  const all = [];

  for (const fileName of files) {
    if (!fileName.endsWith('.md')) continue;

    const fullPath = path.join(lessonsDir, fileName);
    const content = await readFile(fullPath, 'utf8');
    const frontmatter = parseFrontmatter(content);

    if (frontmatter.draft === true) continue;

    const dateIso = toIsoDate(frontmatter.date);
    if (!dateIso) continue;

    const slug = fileName.replace(/\.md$/, '');
    const category = String(frontmatter.category || '').trim();
    if (!category) continue;

    all.push({
      title: String(frontmatter.title || slug).trim(),
      excerpt: String(frontmatter.excerpt || '').trim(),
      category,
      level: String(frontmatter.level || '').trim(),
      heroTip: String(frontmatter.heroTip || '').trim(),
      slug,
      dateIso,
    });
  }

  all.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());

  const buckets = { celpip: [], ielts: [], grammar: [], vocab: [] };
  for (const lesson of all) {
    const section = classifyLesson(lesson);
    if (section && buckets[section].length < perSection) {
      buckets[section].push(lesson);
    }
  }

  return [...buckets.celpip, ...buckets.ielts, ...buckets.grammar, ...buckets.vocab];
}

function resolveStateFilePath() {
  const configured = process.env.NEWSLETTER_STATE_FILE?.trim() || DEFAULT_STATE_FILE;
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

async function loadState(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore
  }

  return { lastSentAt: null };
}

async function saveState(filePath, state) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function buildLessonUrl(siteUrl, lesson) {
  return `${siteUrl}/lessons/${lesson.category}/${lesson.slug}/`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function classifyLesson(lesson) {
  const title = String(lesson.title || '').toUpperCase();
  if (title.includes('CELPIP')) return 'celpip';
  if (title.includes('IELTS')) return 'ielts';
  if (lesson.category === 'vocabulary') return 'vocab';
  if (lesson.category === 'grammar') return 'grammar';
  return null;
}

function groupLessonsBySection(lessons) {
  const sections = { celpip: [], ielts: [], grammar: [], vocab: [] };
  for (const lesson of lessons) {
    const section = classifyLesson(lesson);
    if (section) sections[section].push(lesson);
  }
  return sections;
}

function buildLessonCell(siteUrl, lesson) {
  const url = buildLessonUrl(siteUrl, lesson);
  const body = escapeHtml(lesson.excerpt || lesson.heroTip || 'Open the lesson for the full explanation.');
  return `
    <!--[if mso]><td width="213" valign="top" style="padding:0 5px 10px;"><![endif]-->
    <div class="lesson-cell">
      <div style="background:#fbf8f4;border:1px solid rgba(20,22,23,0.1);border-radius:14px;padding:18px 18px 16px;height:100%;box-sizing:border-box;">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:#d94848;margin-bottom:7px;">${escapeHtml(lesson.category)}</div>
        <div style="font-size:15px;font-weight:700;color:#141617;line-height:1.35;margin-bottom:8px;">${escapeHtml(lesson.title)}</div>
        <div style="font-size:13px;line-height:1.7;color:#4f565d;margin-bottom:15px;">${body}</div>
        <a href="${url}" style="display:inline-block;background:#d94848;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:8px 14px;font-size:12px;">Open lesson</a>
      </div>
    </div>
    <!--[if mso]></td><![endif]-->`;
}

function buildSectionHtml(siteUrl, label, lessons) {
  if (!lessons.length) return '';
  const cells = lessons.map((l) => buildLessonCell(siteUrl, l)).join('');
  return `
    <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:#4f565d;margin-bottom:10px;padding:0 5px;">${escapeHtml(label)}</div>
    <!--[if mso]><table role="presentation" width="100%"><tr><![endif]-->
    <div class="lesson-grid">${cells}</div>
    <!--[if mso]></tr></table><![endif]-->`;
}

function buildProductCell(price, title, body, ctaLabel, ctaHref) {
  return `
    <!--[if mso]><td width="213" valign="top" style="padding:0 5px 10px;"><![endif]-->
    <div class="product-cell">
      <div style="background:#1c2328;border-radius:14px;padding:22px 20px 20px;height:100%;box-sizing:border-box;">
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:#f2c14e;margin-bottom:10px;">${escapeHtml(price)}</div>
        <div style="font-size:16px;font-weight:700;color:#fbf8f4;line-height:1.3;margin-bottom:10px;">${escapeHtml(title)}</div>
        <div style="font-size:13px;line-height:1.75;color:rgba(251,248,244,0.6);margin-bottom:18px;">${escapeHtml(body)}</div>
        <a href="${ctaHref}" style="display:inline-block;background:#d94848;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:9px 16px;font-size:13px;">${escapeHtml(ctaLabel)}</a>
      </div>
    </div>
    <!--[if mso]></td><![endif]-->`;
}


function buildHtmlEmail({
  siteUrl,
  lessons,
  youtubeChannelUrl,
  telegramChannelUrl,
  instagramUrl,
}) {
  const sections = groupLessonsBySection(lessons);

  const celpipHtml = buildSectionHtml(siteUrl, 'CELPIP', sections.celpip);
  const ieltsHtml = buildSectionHtml(siteUrl, 'IELTS', sections.ielts);
  const grammarHtml = buildSectionHtml(siteUrl, 'Grammar', sections.grammar);
  const vocabHtml = buildSectionHtml(siteUrl, 'Vocabulary', sections.vocab);

  const writingProduct = buildProductCell(
    'CA$5 / month',
    'Find out what your CELPIP writing score actually is.',
    'Write your Task 1 or Task 2 response, submit it, and get a CLB score with feedback. You will see exactly where your marks are coming from and what to fix. No waiting. No guessing.',
    'Yes, score my writing',
    `${siteUrl}/celpip/writing/ai-feedback/`,
  );
  const readingProduct = buildProductCell(
    'CA$20 / month',
    'Practice CELPIP reading with tests built like the real exam.',
    'Most practice tests online are not real CELPIP format. These ones are. Four parts, timed, scored by CLB level. Test 01 is completely free. The subscription gives you Tests 02, 03, and 04.',
    'Take the free test first',
    `${siteUrl}/celpip/reading/`,
  );
  const ebookProduct = buildProductCell(
    'CA$49.50 · one time',
    'The CELPIP speaking book that shows what a high score sounds like.',
    '109 pages. 24 sample answers with scores. 30 patterns that examiners reward. Written by Dr. Kara Abdolmaleki. You read real answers and see why each one gets the mark it gets.',
    'Get the book',
    'https://buy.stripe.com/aFa14m4Kq11q3ap7nSgMw03',
  );

  const socialLinks = [
    youtubeChannelUrl ? `<a href="${youtubeChannelUrl}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border-radius:8px;border:1px solid rgba(20,22,23,0.12);background:#fbf8f4;color:#141617;font-weight:600;text-decoration:none;font-size:12px;">YouTube</a>` : '',
    telegramChannelUrl ? `<a href="${telegramChannelUrl}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border-radius:8px;border:1px solid rgba(20,22,23,0.12);background:#fbf8f4;color:#141617;font-weight:600;text-decoration:none;font-size:12px;">Telegram</a>` : '',
    instagramUrl ? `<a href="${instagramUrl}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border-radius:8px;border:1px solid rgba(20,22,23,0.12);background:#fbf8f4;color:#141617;font-weight:600;text-decoration:none;font-size:12px;">Instagram</a>` : '',
  ].filter(Boolean).join('');

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;}
body{margin:0;padding:20px 12px;background:#f2ede6;font-family:Arial,sans-serif;color:#141617;}
.wrapper{max-width:860px;margin:0 auto;}
.lesson-grid,.product-grid{font-size:0;margin:0 -5px;}
.lesson-cell,.product-cell{display:inline-block;vertical-align:top;width:100%;font-size:14px;padding:0 5px 10px;}
@media(min-width:600px){
  .lesson-cell,.product-cell{width:33.33%;}
}
</style>
</head>
<body>
<div class="wrapper">

  <div style="padding:0 5px 22px;">
    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:#d94848;margin-bottom:10px;">IELTS Corner</div>
    <div style="font-size:26px;line-height:1.15;font-weight:800;color:#141617;margin-bottom:8px;">New lessons this week</div>
    <div style="font-size:14px;line-height:1.7;color:#4f565d;">Here is what is new. Open the ones that match your goal right now.</div>
  </div>

  ${celpipHtml}

  <div style="border-top:1px solid rgba(20,22,23,0.1);margin:24px 5px;"></div>

  <div style="padding:0 5px 16px;">
    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:#d94848;margin-bottom:6px;">Want to move faster?</div>
    <div style="font-size:20px;font-weight:800;color:#141617;line-height:1.2;">Three things that can help.</div>
  </div>
  <!--[if mso]><table role="presentation" width="100%"><tr><![endif]-->
  <div class="product-grid">
    ${writingProduct}
    ${readingProduct}
    ${ebookProduct}
  </div>
  <!--[if mso]></tr></table><![endif]-->

  ${ieltsHtml ? `<div style="border-top:1px solid rgba(20,22,23,0.1);margin:24px 5px;"></div><div style="margin-top:0;">${ieltsHtml}</div>` : ''}
  ${grammarHtml ? `<div style="margin-top:18px;">${grammarHtml}</div>` : ''}
  ${vocabHtml ? `<div style="margin-top:18px;">${vocabHtml}</div>` : ''}

  <div style="border-top:1px solid rgba(20,22,23,0.1);margin:24px 5px;"></div>

  <div style="padding:0 5px;">
    <div style="font-size:13px;font-weight:700;color:#141617;margin-bottom:12px;">More practice on our channels</div>
    ${socialLinks}
  </div>

  <div style="padding:22px 5px 8px;font-size:12px;line-height:1.8;color:#6a727a;">You are receiving this because you subscribed on ieltscorner.ca.</div>

</div>
</body>
</html>`;
}

function buildTextEmail({
  siteUrl,
  lessons,
  youtubeChannelUrl,
  telegramChannelUrl,
  instagramUrl,
}) {
  const sections = groupLessonsBySection(lessons);

  const sectionLines = [];

  if (sections.celpip.length) {
    sectionLines.push('CELPIP');
    for (const l of sections.celpip) {
      const url = buildLessonUrl(siteUrl, l);
      const body = l.excerpt || l.heroTip || '';
      sectionLines.push(`- ${l.title}${body ? `\n  ${body}` : ''}\n  ${url}`);
    }
  }

  sectionLines.push('');
  sectionLines.push('Want to move faster?');
  sectionLines.push(`Writing Score Lab (CA$5/month): ${siteUrl}/celpip/writing/ai-feedback/`);
  sectionLines.push(`Reading Simulator (CA$20/month): ${siteUrl}/celpip/reading/`);
  sectionLines.push('Speaking eBook (CA$49.50): https://buy.stripe.com/aFa14m4Kq11q3ap7nSgMw03');

  if (sections.ielts.length) {
    sectionLines.push('');
    sectionLines.push('IELTS');
    for (const l of sections.ielts) {
      const url = buildLessonUrl(siteUrl, l);
      const body = l.excerpt || l.heroTip || '';
      sectionLines.push(`- ${l.title}${body ? `\n  ${body}` : ''}\n  ${url}`);
    }
  }

  if (sections.grammar.length) {
    sectionLines.push('');
    sectionLines.push('Grammar');
    for (const l of sections.grammar) {
      const url = buildLessonUrl(siteUrl, l);
      const body = l.excerpt || l.heroTip || '';
      sectionLines.push(`- ${l.title}${body ? `\n  ${body}` : ''}\n  ${url}`);
    }
  }

  if (sections.vocab.length) {
    sectionLines.push('');
    sectionLines.push('Vocabulary');
    for (const l of sections.vocab) {
      const url = buildLessonUrl(siteUrl, l);
      const body = l.excerpt || l.heroTip || '';
      sectionLines.push(`- ${l.title}${body ? `\n  ${body}` : ''}\n  ${url}`);
    }
  }

  const channels = [
    youtubeChannelUrl ? `YouTube: ${youtubeChannelUrl}` : '',
    telegramChannelUrl ? `Telegram: ${telegramChannelUrl}` : '',
    instagramUrl ? `Instagram: ${instagramUrl}` : '',
  ].filter(Boolean).join('\n');

  return `IELTS Corner - New lessons this week

${sectionLines.join('\n')}

More practice on our channels:
${channels}

You are receiving this because you subscribed on ieltscorner.ca.`;
}

function extractBodyContent(html) {
  const raw = String(html || '').trim();
  if (!raw) return '';
  const match = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) return raw;
  return match[1].trim();
}

function buildSubscriberFilter({ digestTagId, digestSegmentId }) {
  if (digestTagId) {
    return [
      {
        all: [
          {
            type: 'tag',
            ids: [digestTagId],
          },
        ],
        any: null,
        none: null,
      },
    ];
  }

  if (digestSegmentId) {
    return [
      {
        all: [
          {
            type: 'segment',
            ids: [digestSegmentId],
          },
        ],
        any: null,
        none: null,
      },
    ];
  }

  throw new Error('Missing digest audience filter: set KIT_DIGEST_TAG_ID or KIT_DIGEST_SEGMENT_ID');
}

function buildBroadcastDescription({ latestLessonTitle, latestLessonDate }) {
  const lessonTitle = String(latestLessonTitle || '').trim() || 'Weekly digest';
  const lessonDate = String(latestLessonDate || '').trim() || new Date().toISOString().slice(0, 10);
  return `Automated IELTS Corner digest | ${lessonDate} | ${lessonTitle}`.slice(0, 180);
}

async function createKitBroadcast({
  apiKey,
  subject,
  previewText,
  html,
  digestTagId,
  digestSegmentId,
  emailTemplateId,
  emailAddress,
  isPublic,
  sendDelayMinutes,
  latestLessonTitle,
  latestLessonDate,
}) {
  const now = new Date();
  const sendAt = new Date(now.getTime() + sendDelayMinutes * 60 * 1000).toISOString();
  const publishedAt = now.toISOString();
  const content = extractBodyContent(html);
  const subscriberFilter = buildSubscriberFilter({ digestTagId, digestSegmentId });

  const payload = {
    content,
    description: buildBroadcastDescription({
      latestLessonTitle,
      latestLessonDate,
    }),
    public: Boolean(isPublic),
    published_at: publishedAt,
    send_at: sendAt,
    preview_text: previewText,
    subject,
    subscriber_filter: subscriberFilter,
  };

  if (emailTemplateId) {
    payload.email_template_id = emailTemplateId;
  }
  if (emailAddress) {
    payload.email_address = emailAddress;
  }

  const response = await kitRequest({
    apiKey,
    pathName: '/broadcasts',
    method: 'POST',
    body: payload,
  });

  return {
    sendAt,
    publishedAt,
    broadcast: response.body?.broadcast || null,
  };
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/$/, '');
  const youtubeChannelUrl = (process.env.YOUTUBE_CHANNEL_URL || DEFAULT_YOUTUBE_CHANNEL_URL).trim();
  const telegramChannelUrl = normalizeAbsoluteUrl(process.env.TELEGRAM_CHANNEL_URL || DEFAULT_TELEGRAM_CHANNEL_URL);
  const instagramUsername = (process.env.INSTAGRAM_USERNAME || DEFAULT_INSTAGRAM_USERNAME).trim().replace(/^@/, '');
  const instagramUrl = `https://www.instagram.com/${instagramUsername}/`;

  const lessons = await getLatestLessons(3);

  const leadTitle = lessons[0]?.title || 'fresh lessons';
  const subject = `New lessons on IELTS Corner: ${leadTitle}`;
  const previewText = 'New lessons are ready. Open the ones that match your goal right now.';
  const html = buildHtmlEmail({
    siteUrl,
    lessons,
    youtubeChannelUrl,
    telegramChannelUrl,
    instagramUrl,
  });
  const text = buildTextEmail({
    siteUrl,
    lessons,
    youtubeChannelUrl,
    telegramChannelUrl,
    instagramUrl,
  });

  if (options.preview) {
    const previewDir = path.join(process.cwd(), '.cache');
    const previewHtmlPath = path.join(previewDir, 'newsletter-preview.html');
    const previewTextPath = path.join(previewDir, 'newsletter-preview.txt');
    await mkdir(previewDir, { recursive: true });
    await writeFile(previewHtmlPath, `${html}\n`, 'utf8');
    await writeFile(previewTextPath, `${text}\n`, 'utf8');

    console.log(`[preview] Subject: ${subject}`);
    console.log('[preview] Lessons:', lessons.map((item) => item.title));
    console.log(`[preview] HTML file: ${previewHtmlPath}`);
    console.log(`[preview] Text file: ${previewTextPath}`);
    console.log('\n[preview] Text email:\n');
    console.log(text);
    console.log('\n[preview] HTML email:\n');
    console.log(html);
    return;
  }

  const kitApiKey = (process.env.KIT_API_KEY || '').trim();
  const digestTagId = parseOptionalInteger(process.env.KIT_DIGEST_TAG_ID);
  const digestSegmentId = parseOptionalInteger(process.env.KIT_DIGEST_SEGMENT_ID);
  const digestFormId = parseOptionalInteger(process.env.KIT_DIGEST_FORM_ID)
    || parseOptionalInteger(process.env.KIT_FORM_ID)
    || DEFAULT_DIGEST_FORM_ID;
  const emailTemplateId = parseOptionalInteger(process.env.KIT_DIGEST_TEMPLATE_ID);
  const emailAddress = String(process.env.KIT_BROADCAST_EMAIL_ADDRESS || '').trim() || null;
  const sendDelayMinutes = parsePositiveInteger(
    process.env.KIT_BROADCAST_SEND_DELAY_MINUTES,
    DEFAULT_SEND_DELAY_MINUTES,
  );
  const publicFlag = parseOptionalBoolean(process.env.KIT_BROADCAST_PUBLIC);
  const isPublic = publicFlag === true;
  const stateFilePath = resolveStateFilePath();

  if (!kitApiKey) {
    throw new Error('Missing KIT_API_KEY');
  }
  if (!digestTagId && !digestSegmentId && !digestFormId) {
    throw new Error('Missing digest audience configuration');
  }

  const state = await loadState(stateFilePath);
  const subscribers = digestTagId
    ? await getKitTagSubscribers({
      apiKey: kitApiKey,
      tagId: digestTagId,
    })
    : await getKitFormSubscribers({
      apiKey: kitApiKey,
      formId: digestFormId,
    });
  if (subscribers.length === 0) {
    console.log('[info] No newsletter subscribers found.');
    return;
  }

  if (lessons.length === 0) {
    console.log('[info] No published lessons found.');
    return;
  }

  if (digestTagId) {
    console.log(`[info] Kit digest audience tag: ${digestTagId}`);
  } else if (digestSegmentId) {
    console.log(`[info] Kit digest audience segment: ${digestSegmentId}`);
  } else {
    console.log(`[info] Kit digest form: ${digestFormId}`);
  }
  console.log(`[info] Subscribers: ${subscribers.length}`);
  console.log(`[info] Latest subscriber: ${subscribers[0]?.submittedAt || 'unknown'}`);
  console.log(`[info] Latest lessons selected: ${lessons.length}`);
  console.log(`[info] Last sent at: ${state.lastSentAt || 'never'}`);

  if (options.dryRun) {
    console.log('[dry-run] First recipients:', subscribers.slice(0, 5).map((item) => item.email));
    console.log('[dry-run] Subject:', subject);
    console.log('[dry-run] Lesson titles:', lessons.map((item) => item.title));
    console.log('[dry-run] Kit send mode:', digestTagId ? 'tag' : digestSegmentId ? 'segment' : 'form-only (cannot send)');
    console.log('[dry-run] Kit template id:', emailTemplateId || '(account default)');
    console.log('[dry-run] Kit send delay minutes:', sendDelayMinutes);
    return;
  }

  if (!digestTagId && !digestSegmentId) {
    throw new Error(
      'Kit broadcast sending requires KIT_DIGEST_TAG_ID or KIT_DIGEST_SEGMENT_ID. '
      + 'Form-only audience targeting is not supported for broadcasts.'
    );
  }

  const created = await createKitBroadcast({
    apiKey: kitApiKey,
    subject,
    previewText,
    html,
    digestTagId,
    digestSegmentId,
    emailTemplateId,
    emailAddress,
    isPublic,
    sendDelayMinutes,
    latestLessonTitle: lessons[0]?.title || '',
    latestLessonDate: lessons[0]?.dateIso || '',
  });

  const newestLessonDate = lessons[0]?.dateIso || new Date().toISOString();
  await saveState(stateFilePath, {
    lastSentAt: newestLessonDate,
    lastRunAt: new Date().toISOString(),
    lastSentCount: subscribers.length,
    lastSubscriberCount: subscribers.length,
    lastBroadcastId: created.broadcast?.id || null,
    lastBroadcastSendAt: created.broadcast?.send_at || created.sendAt,
    lastBroadcastSubject: created.broadcast?.subject || subject,
    lastBroadcastPublicUrl: created.broadcast?.public_url || null,
  });

  console.log(`[ok] Kit broadcast created: ${created.broadcast?.id || '(unknown id)'}`);
  console.log(`[ok] Scheduled send time: ${created.broadcast?.send_at || created.sendAt}`);
  console.log(`[ok] Audience size snapshot: ${subscribers.length}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
