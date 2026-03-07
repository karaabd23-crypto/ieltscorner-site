#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';

const DEFAULT_SITE_URL = 'https://ieltscorner.ca';
const DEFAULT_FORM_NAME = 'newsletter';
const DEFAULT_STATE_FILE = '.cache/newsletter-state.json';

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
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
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

async function getLessonsAfter(isoTimestamp) {
  const lessonsDir = path.join(process.cwd(), 'src', 'content', 'lessons');
  const files = await readdir(lessonsDir);
  const threshold = isoTimestamp ? new Date(isoTimestamp).getTime() : 0;

  const lessons = [];
  for (const fileName of files) {
    if (!fileName.endsWith('.md')) {
      continue;
    }

    const fullPath = path.join(lessonsDir, fileName);
    const content = await readFile(fullPath, 'utf8');
    const frontmatter = parseFrontmatter(content);

    if (frontmatter.draft === true) {
      continue;
    }

    const dateIso = toIsoDate(frontmatter.date);
    if (!dateIso) {
      continue;
    }

    const dateValue = new Date(dateIso).getTime();
    if (dateValue <= threshold) {
      continue;
    }

    const slug = fileName.replace(/\.md$/, '');
    const category = String(frontmatter.category || '').trim();
    if (!category) {
      continue;
    }

    lessons.push({
      title: String(frontmatter.title || slug).trim(),
      excerpt: String(frontmatter.excerpt || '').trim(),
      category,
      slug,
      dateIso,
    });
  }

  lessons.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
  return lessons;
}

async function fetchNetlifyJson(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Netlify API failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function getNetlifySiteInfo({ siteId, accessToken }) {
  const site = await fetchNetlifyJson(`https://api.netlify.com/api/v1/sites/${siteId}`, accessToken);
  return {
    id: String(site?.id || siteId),
    name: String(site?.name || ''),
    url: String(site?.url || site?.ssl_url || ''),
  };
}

function normalizeFormName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

async function getNetlifyFormMatch({ siteId, accessToken, formName }) {
  const forms = await fetchNetlifyJson(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, accessToken);
  const requested = normalizeFormName(formName);

  const exact = forms.find((item) => String(item?.name || '').trim() === formName);
  if (exact?.id) {
    return {
      formId: exact.id,
      formName: String(exact.name || formName),
      availableFormNames: forms.map((item) => String(item?.name || '').trim()).filter(Boolean),
    };
  }

  const normalizedMatch = forms.find((item) => normalizeFormName(item?.name) === requested);
  if (normalizedMatch?.id) {
    return {
      formId: normalizedMatch.id,
      formName: String(normalizedMatch.name || formName),
      availableFormNames: forms.map((item) => String(item?.name || '').trim()).filter(Boolean),
    };
  }

  const newsletterLike = forms.find((item) => normalizeFormName(item?.name).includes('newsletter'));
  if (newsletterLike?.id) {
    return {
      formId: newsletterLike.id,
      formName: String(newsletterLike.name || formName),
      availableFormNames: forms.map((item) => String(item?.name || '').trim()).filter(Boolean),
    };
  }

  return {
    formId: '',
    formName,
    availableFormNames: forms.map((item) => String(item?.name || '').trim()).filter(Boolean),
  };
}

async function getSubscribers({ formId, accessToken }) {
  const seen = new Set();
  const subscribers = [];

  for (let page = 1; page <= 10; page += 1) {
    const submissions = await fetchNetlifyJson(
      `https://api.netlify.com/api/v1/forms/${formId}/submissions?page=${page}&per_page=100`,
      accessToken,
    );

    if (!Array.isArray(submissions) || submissions.length === 0) {
      break;
    }

    for (const submission of submissions) {
      const rawEmail = submission?.data?.email ?? submission?.email;
      const email = String(rawEmail || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        continue;
      }

      if (seen.has(email)) {
        continue;
      }

      seen.add(email);
      subscribers.push(email);
    }
  }

  return subscribers;
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

function buildHtmlEmail({ siteUrl, lessons }) {
  const listItems = lessons
    .map((lesson) => {
      const url = buildLessonUrl(siteUrl, lesson);
      const excerpt = lesson.excerpt ? `<p style="margin:6px 0 0;color:#555;">${lesson.excerpt}</p>` : '';
      return `<li style="margin:0 0 14px;"><a href="${url}" style="color:#d94848;font-weight:700;text-decoration:none;">${lesson.title}</a>${excerpt}</li>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f6f4f3;padding:16px;">
    <table role="presentation" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e9e1dc;border-radius:10px;padding:18px;">
      <tr><td>
        <h2 style="margin:0 0 8px;color:#1f1f1f;">New IELTS Corner Lessons</h2>
        <p style="margin:0 0 16px;color:#444;">We published new lessons this week:</p>
        <ul style="padding-left:18px;margin:0 0 18px;">${listItems}</ul>
        <p style="margin:0;color:#666;">You are receiving this because you subscribed on ieltscorner.ca.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildTextEmail({ siteUrl, lessons }) {
  const lines = lessons.map((lesson) => {
    const url = buildLessonUrl(siteUrl, lesson);
    const excerpt = lesson.excerpt ? `\n${lesson.excerpt}` : '';
    return `- ${lesson.title}\n${url}${excerpt}`;
  }).join('\n\n');

  return `New IELTS Corner Lessons\n\n${lines}\n\nYou are receiving this because you subscribed on ieltscorner.ca.`;
}

async function sendDigestEmails({ subscribers, lessons, gmailUser, gmailPassword, siteUrl }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  let sentCount = 0;
  for (const to of subscribers) {
    await transporter.sendMail({
      from: `IELTS Corner <${gmailUser}>`,
      to,
      subject: `New IELTS lessons this week (${lessons.length})`,
      text: buildTextEmail({ siteUrl, lessons }),
      html: buildHtmlEmail({ siteUrl, lessons }),
    });

    sentCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return sentCount;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const accessToken = process.env.NETLIFY_ACCESS_TOKEN || '';
  const siteId = process.env.NETLIFY_SITE_ID || '';
  const formName = (process.env.NEWSLETTER_FORM_NAME || DEFAULT_FORM_NAME).trim();
  const gmailUser = process.env.GMAIL_USER || '';
  const gmailPassword = process.env.GMAIL_PASSWORD || '';
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/$/, '');
  const stateFilePath = resolveStateFilePath();

  if (!accessToken || !siteId) {
    throw new Error('Missing NETLIFY_ACCESS_TOKEN and/or NETLIFY_SITE_ID');
  }

  if (!options.dryRun && (!gmailUser || !gmailPassword)) {
    throw new Error('Missing GMAIL_USER and/or GMAIL_PASSWORD');
  }

  const siteInfo = await getNetlifySiteInfo({ siteId, accessToken });
  console.log(`[info] Netlify site: ${siteInfo.name || '(unknown)'} (${siteInfo.id}) ${siteInfo.url}`);

  const state = await loadState(stateFilePath);
  const formMatch = await getNetlifyFormMatch({ siteId, accessToken, formName });

  if (!formMatch.formId) {
    const available = formMatch.availableFormNames.length
      ? formMatch.availableFormNames.join(', ')
      : '(none found for this site)';
    console.log(`[warn] Netlify form not found: ${formName}`);
    console.log(`[warn] Available forms: ${available}`);
    console.log('[info] Skipping newsletter send. Submit the newsletter form once on production and re-run.');
    return;
  }

  if (formMatch.formName !== formName) {
    console.log(`[info] Using Netlify form: ${formMatch.formName} (requested: ${formName})`);
  }

  const subscribers = await getSubscribers({ formId: formMatch.formId, accessToken });

  if (subscribers.length === 0) {
    console.log('[info] No newsletter subscribers found.');
    return;
  }

  const lessons = await getLessonsAfter(state.lastSentAt);
  if (lessons.length === 0) {
    console.log('[info] No new lessons since last send.');
    return;
  }

  console.log(`[info] Subscribers: ${subscribers.length}`);
  console.log(`[info] New lessons: ${lessons.length}`);
  console.log(`[info] Last sent at: ${state.lastSentAt || 'never'}`);

  if (options.dryRun) {
    console.log('[dry-run] First recipients:', subscribers.slice(0, 5));
    console.log('[dry-run] Lesson titles:', lessons.map((item) => item.title));
    return;
  }

  const sentCount = await sendDigestEmails({
    subscribers,
    lessons,
    gmailUser,
    gmailPassword,
    siteUrl,
  });

  const newestLessonDate = lessons[lessons.length - 1]?.dateIso || new Date().toISOString();
  await saveState(stateFilePath, {
    lastSentAt: newestLessonDate,
    lastRunAt: new Date().toISOString(),
    lastSentCount: sentCount,
  });

  console.log(`[ok] Newsletter sent to ${sentCount} subscribers.`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
