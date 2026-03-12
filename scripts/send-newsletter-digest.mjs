#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';

const DEFAULT_SITE_URL = 'https://ieltscorner.ca';
const DEFAULT_FORM_NAME = 'newsletter';
const DEFAULT_STATE_FILE = '.cache/newsletter-state.json';
const DEFAULT_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@KaraAbdolmaleki';

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function resolveYouTubeChannelId(channelUrl) {
  const envChannelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
  if (envChannelId) {
    return envChannelId;
  }

  const directMatch = String(channelUrl || '').match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  try {
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IELTSCornerDigest/1.0)',
      },
    });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();
    const channelMatch = html.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
    return channelMatch?.[1] || '';
  } catch {
    return '';
  }
}

async function getLatestYouTubeVideo(channelUrl) {
  const channelId = await resolveYouTubeChannelId(channelUrl);
  if (!channelId) {
    return null;
  }

  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(feedUrl);
    if (!response.ok) {
      return null;
    }

    const xml = await response.text();
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
    if (!entryMatch) {
      return null;
    }

    const entry = entryMatch[1];
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1]?.trim();
    const titleRaw = entry.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || 'Latest YouTube lesson';
    const title = decodeXmlEntities(titleRaw);
    const url = entry.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim()
      || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : channelUrl);

    if (!videoId) {
      return null;
    }

    return {
      title,
      url,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
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

async function getLatestLessons(limit = 5) {
  const lessonsDir = path.join(process.cwd(), 'src', 'content', 'lessons');
  const files = await readdir(lessonsDir);

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

    const slug = fileName.replace(/\.md$/, '');
    const category = String(frontmatter.category || '').trim();
    if (!category) {
      continue;
    }

    lessons.push({
      title: String(frontmatter.title || slug).trim(),
      excerpt: String(frontmatter.excerpt || '').trim(),
      category,
      level: String(frontmatter.level || '').trim(),
      slug,
      dateIso,
    });
  }

  lessons.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
  return lessons.slice(0, limit);
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

function getLessonTier(level) {
  const n = String(level || '').trim().toUpperCase();
  if (n === 'A1' || n === 'A2') return 'Basic';
  if (n === 'B1' || n === 'B2') return 'Intermediate';
  return 'Advanced';
}

function getPublicLessonTitle(title, level) {
  const cleaned = String(title || '')
    .replace(/\s*\((A1|A2|B1|B2|C1|C2)\)\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const normalizedLevel = String(level || '').trim().toUpperCase();
  const isEarlyLevel = normalizedLevel === 'A1' || normalizedLevel === 'A2' || normalizedLevel === 'B1';

  let baseTitle = cleaned;

  if (isEarlyLevel) {
    if (/(conditional|if[-\s]?sentence|if[-\s]?statement)/i.test(cleaned)) {
      baseTitle = 'How to use "if"';
    } else {
      const shortTitle = cleaned
        .replace(/^How to\s+/i, '')
        .replace(/^Using\s+/i, '')
        .replace(/\s+for\s+.*$/i, '')
        .replace(/\s+in\s+.*$/i, '')
        .replace(/\s*[:\-–—]\s*.*/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (shortTitle.length >= 8) {
        baseTitle = shortTitle;
      }
    }
  }

  if (normalizedLevel) {
    return `${baseTitle} – ${getLessonTier(normalizedLevel)}`;
  }

  return baseTitle;
}

function buildHtmlEmail({ siteUrl, lessons, latestYouTubeVideo, youtubeChannelUrl }) {
  const listItems = lessons
    .map((lesson) => {
      const url = buildLessonUrl(siteUrl, lesson);
      const title = getPublicLessonTitle(lesson.title, lesson.level);
      const excerpt = lesson.excerpt ? `<p style="margin:6px 0 0;color:#555;">${lesson.excerpt}</p>` : '';
      return `<li style="margin:0 0 14px;"><a href="${url}" style="color:#d94848;font-weight:700;text-decoration:none;">${title}</a>${excerpt}</li>`;
    })
    .join('');

  const latestVideoBlock = latestYouTubeVideo
    ? `
        <h3 style="margin:0 0 8px;color:#1f1f1f;">Latest YouTube lesson</h3>
        <a href="${latestYouTubeVideo.url}" style="display:block;text-decoration:none;margin:0 0 16px;">
          <img src="${latestYouTubeVideo.thumbnailUrl}" alt="${latestYouTubeVideo.title}" style="width:100%;max-width:560px;height:auto;border-radius:10px;border:1px solid #e9e1dc;display:block;" />
          <p style="margin:8px 0 0;color:#d94848;font-weight:700;">${latestYouTubeVideo.title}</p>
          <p style="margin:4px 0 0;color:#555;">Watch now on YouTube →</p>
        </a>`
    : '';

  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f6f4f3;padding:16px;">
    <table role="presentation" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e9e1dc;border-radius:10px;padding:18px;">
      <tr><td>
        <h2 style="margin:0 0 8px;color:#1f1f1f;">Latest IELTS Corner Lessons</h2>
        <p style="margin:0 0 16px;color:#444;">Here are the 5 most recent lessons:</p>
        <ul style="padding-left:18px;margin:0 0 18px;">${listItems}</ul>
        ${latestVideoBlock}
        <h3 style="margin:0 0 8px;color:#1f1f1f;">Keep improving this week</h3>
        <ul style="padding-left:18px;margin:0 0 18px;">
          <li style="margin:0 0 8px;"><a href="${siteUrl}/webinar/" style="color:#d94848;font-weight:700;text-decoration:none;">Join the weekly webinar</a> for live score-raising strategies.</li>
          <li style="margin:0 0 8px;"><a href="${youtubeChannelUrl}" style="color:#d94848;font-weight:700;text-decoration:none;">Watch YouTube lessons</a> for quick exam tips and practice.</li>
          <li style="margin:0 0 8px;"><a href="https://t.me/Kaysenglishcorner" style="color:#d94848;font-weight:700;text-decoration:none;">Join our Telegram channel</a> for daily short tips and updates.</li>
          <li style="margin:0;"><a href="${siteUrl}/tutoring/" style="color:#d94848;font-weight:700;text-decoration:none;">Book a private lesson</a> for personalized feedback.</li>
        </ul>
        <p style="margin:0;color:#666;">You are receiving this because you subscribed on ieltscorner.ca.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildTextEmail({ siteUrl, lessons, latestYouTubeVideo, youtubeChannelUrl }) {
  const lines = lessons.map((lesson) => {
    const url = buildLessonUrl(siteUrl, lesson);
    const title = getPublicLessonTitle(lesson.title, lesson.level);
    const excerpt = lesson.excerpt ? `\n${lesson.excerpt}` : '';
    return `- ${title}\n${url}${excerpt}`;
  }).join('\n\n');

  const latestVideoText = latestYouTubeVideo
    ? `\n\nLatest YouTube lesson:\n- ${latestYouTubeVideo.title}\n${latestYouTubeVideo.url}`
    : '';

  return `Latest IELTS Corner Lessons\n\n${lines}${latestVideoText}\n\nKeep improving this week:\n- Weekly webinar: ${siteUrl}/webinar/\n- YouTube lessons: ${youtubeChannelUrl}\n- Telegram channel: https://t.me/Kaysenglishcorner\n- Private lessons: ${siteUrl}/tutoring/\n\nYou are receiving this because you subscribed on ieltscorner.ca.`;
}

async function sendDigestEmails({ subscribers, lessons, gmailUser, gmailPassword, siteUrl, latestYouTubeVideo, youtubeChannelUrl }) {
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
      subject: `Your IELTS Corner update: latest ${lessons.length} lessons`,
      text: buildTextEmail({ siteUrl, lessons, latestYouTubeVideo, youtubeChannelUrl }),
      html: buildHtmlEmail({ siteUrl, lessons, latestYouTubeVideo, youtubeChannelUrl }),
    });

    sentCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return sentCount;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/$/, '');
  const youtubeChannelUrl = (process.env.YOUTUBE_CHANNEL_URL || DEFAULT_YOUTUBE_CHANNEL_URL).trim();
  const latestYouTubeVideo = await getLatestYouTubeVideo(youtubeChannelUrl);

  if (options.preview) {
    const lessons = await getLatestLessons(5);
    if (lessons.length === 0) {
      console.log('[preview] No published lessons found.');
      return;
    }

    console.log(`[preview] Subject: Your IELTS Corner update: latest ${lessons.length} lessons`);
    console.log('[preview] Lesson titles:', lessons.map((item) => item.title));
    console.log('[preview] Latest YouTube video:', latestYouTubeVideo ? latestYouTubeVideo.title : 'not found');
    console.log('\n[preview] Text email:\n');
    console.log(buildTextEmail({ siteUrl, lessons, latestYouTubeVideo, youtubeChannelUrl }));
    console.log('\n[preview] HTML email:\n');
    console.log(buildHtmlEmail({ siteUrl, lessons, latestYouTubeVideo, youtubeChannelUrl }));
    return;
  }

  const accessToken = process.env.NETLIFY_ACCESS_TOKEN || '';
  const siteId = process.env.NETLIFY_SITE_ID || '';
  const formName = (process.env.NEWSLETTER_FORM_NAME || DEFAULT_FORM_NAME).trim();
  const gmailUser = process.env.GMAIL_USER || '';
  const gmailPassword = process.env.GMAIL_PASSWORD || '';
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

  const lessons = await getLatestLessons(5);
  if (lessons.length === 0) {
    console.log('[info] No published lessons found.');
    return;
  }

  console.log(`[info] Subscribers: ${subscribers.length}`);
  console.log(`[info] Latest lessons selected: ${lessons.length}`);
  console.log(`[info] Last sent at: ${state.lastSentAt || 'never'}`);

  if (options.dryRun) {
    console.log('[dry-run] First recipients:', subscribers.slice(0, 5));
    console.log('[dry-run] Lesson titles:', lessons.map((item) => item.title));
    console.log('[dry-run] Latest YouTube video:', latestYouTubeVideo ? latestYouTubeVideo.title : 'not found');
    return;
  }

  const sentCount = await sendDigestEmails({
    subscribers,
    lessons,
    gmailUser,
    gmailPassword,
    siteUrl,
    latestYouTubeVideo,
    youtubeChannelUrl,
  });

  const newestLessonDate = lessons[0]?.dateIso || new Date().toISOString();
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
