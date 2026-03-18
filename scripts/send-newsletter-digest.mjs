#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {
  getNetlifyFormMatch,
  getNetlifySiteInfo,
  getSubscriberRecords,
} from './lib/newsletter-audience.mjs';
import {
  getLatestInstagramPost,
  getLatestYouTubeVideo,
  getTelegramChannelSnapshot,
} from './lib/social-feed.mjs';

const DEFAULT_SITE_URL = 'https://ieltscorner.ca';
const DEFAULT_FORM_NAME = 'newsletter';
const DEFAULT_STATE_FILE = '.cache/newsletter-state.json';
const DEFAULT_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@KaraAbdolmaleki';
const DEFAULT_TELEGRAM_CHANNEL_URL = 'https://t.me/Kaysenglishcorner';
const DEFAULT_INSTAGRAM_USERNAME = 'ieltscorner.ca';

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
      heroTip: String(frontmatter.heroTip || '').trim(),
      slug,
      dateIso,
    });
  }

  lessons.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
  return lessons.slice(0, limit);
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
  const normalized = String(level || '').trim().toUpperCase();
  if (normalized === 'A1' || normalized === 'A2') return 'Basic';
  if (normalized === 'B1' || normalized === 'B2') return 'Intermediate';
  return 'Advanced';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildLessonCards(siteUrl, lessons) {
  return lessons
    .map((lesson) => {
      const url = buildLessonUrl(siteUrl, lesson);
      const eyebrow = `${lesson.category.toUpperCase()} | ${getLessonTier(lesson.level)}`;
      const body = lesson.excerpt || lesson.heroTip || 'Open the lesson for the full explanation and interactive practice.';
      return `
        <tr>
          <td style="padding: 0 0 16px;">
            <table role="presentation" width="100%" style="border-collapse: collapse; background: #ffffff; border: 1px solid #eadfd2; border-radius: 18px;">
              <tr>
                <td style="padding: 18px 18px 16px;">
                  <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; color: #8d4d21; margin-bottom: 8px;">${escapeHtml(eyebrow)}</div>
                  <div style="font-size: 21px; line-height: 1.25; font-weight: 800; color: #1f2b37; margin-bottom: 8px;">${escapeHtml(lesson.title)}</div>
                  <div style="font-size: 14px; line-height: 1.7; color: #495566; margin-bottom: 12px;">${escapeHtml(body)}</div>
                  <div style="font-size: 13px; color: #7a8491; margin-bottom: 14px;">${escapeHtml(formatShortDate(lesson.dateIso))}</div>
                  <a href="${url}" style="display: inline-block; background: #d94848; color: #ffffff; text-decoration: none; font-weight: 800; border-radius: 999px; padding: 10px 16px;">Open lesson</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');
}

function buildSocialCards({ youtubeVideo, telegramPost, instagramPost, youtubeChannelUrl, telegramChannelUrl, instagramUrl }) {
  const cards = [];

  if (youtubeVideo) {
    cards.push(`
      <td width="33.33%" valign="top" style="padding: 0 8px 12px 0;">
        <table role="presentation" width="100%" style="border-collapse: collapse; background: #fff7f1; border: 1px solid #ead9ca; border-radius: 18px; overflow: hidden;">
          <tr>
            <td style="padding: 14px 14px 0;">
              <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; color: #8d4d21;">YouTube</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px 14px;">
              <a href="${youtubeVideo.url}" style="text-decoration: none; color: inherit;">
                <img src="${youtubeVideo.thumbnailUrl}" alt="${escapeHtml(youtubeVideo.title)}" style="display: block; width: 100%; height: auto; border-radius: 12px; border: 1px solid #e6d4c6;" />
                <div style="font-size: 16px; line-height: 1.4; font-weight: 800; color: #1f2b37; margin-top: 12px;">${escapeHtml(youtubeVideo.title)}</div>
                <div style="font-size: 13px; line-height: 1.6; color: #586577; margin-top: 8px;">Watch the newest lesson and keep your practice current.</div>
              </a>
            </td>
          </tr>
        </table>
      </td>
    `);
  }

  if (telegramPost) {
    const subscriberLine = telegramPost.subscriberCount
      ? `Channel size: ${escapeHtml(telegramPost.subscriberCount)} subscribers`
      : 'Daily teaching post on Telegram';

    cards.push(`
      <td width="33.33%" valign="top" style="padding: 0 8px 12px 0;">
        <table role="presentation" width="100%" style="border-collapse: collapse; background: #f4f8ff; border: 1px solid #dbe6f5; border-radius: 18px;">
          <tr>
            <td style="padding: 14px 14px 0;">
              <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; color: #24507d;">Telegram</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px 14px;">
              <div style="font-size: 15px; line-height: 1.5; font-weight: 800; color: #1f2b37;">${escapeHtml(telegramPost.title || "Kay's English Corner")}</div>
              <div style="font-size: 13px; line-height: 1.6; color: #586577; margin-top: 8px;">${escapeHtml(telegramPost.preview || 'Open the latest channel post for a short daily lesson.')}</div>
              <div style="font-size: 12px; line-height: 1.6; color: #6d7785; margin-top: 10px;">${subscriberLine}</div>
              <a href="${telegramPost.url || telegramChannelUrl}" style="display: inline-block; margin-top: 12px; color: #24507d; font-weight: 800; text-decoration: none;">Open latest post</a>
            </td>
          </tr>
        </table>
      </td>
    `);
  }

  if (instagramPost || instagramUrl) {
    const instagramHref = instagramPost?.url || instagramUrl;
    const imageMarkup = instagramPost?.imageUrl
      ? `<img src="${instagramPost.imageUrl}" alt="Latest Instagram post" style="display: block; width: 100%; height: auto; border-radius: 12px; border: 1px solid #ead9e8;" />`
      : '';

    cards.push(`
      <td width="33.33%" valign="top" style="padding: 0 0 12px 0;">
        <table role="presentation" width="100%" style="border-collapse: collapse; background: #fff5fa; border: 1px solid #efd8e6; border-radius: 18px; overflow: hidden;">
          <tr>
            <td style="padding: 14px 14px 0;">
              <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; color: #8b3f63;">Instagram</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px 14px;">
              <a href="${instagramHref}" style="text-decoration: none; color: inherit;">
                ${imageMarkup}
                <div style="font-size: 15px; line-height: 1.6; color: #1f2b37; font-weight: 700; margin-top: ${imageMarkup ? '12px' : '0'};">${escapeHtml(instagramPost?.preview || 'Open the Instagram page for quick study visuals and short explanations.')}</div>
                <div style="font-size: 13px; line-height: 1.6; color: #586577; margin-top: 8px;">Tap through for the latest reels, captions, and visual study posts.</div>
              </a>
            </td>
          </tr>
        </table>
      </td>
    `);
  }

  if (cards.length === 0) {
    return '';
  }

  return `
    <table role="presentation" width="100%" style="border-collapse: separate; border-spacing: 0;">
      <tr>
        ${cards.join('')}
      </tr>
    </table>
  `;
}

function buildHtmlEmail({
  siteUrl,
  lessons,
  youtubeVideo,
  telegramPost,
  instagramPost,
  youtubeChannelUrl,
  telegramChannelUrl,
  instagramUrl,
}) {
  const lessonCards = buildLessonCards(siteUrl, lessons);
  const socialCards = buildSocialCards({
    youtubeVideo,
    telegramPost,
    instagramPost,
    youtubeChannelUrl,
    telegramChannelUrl,
    instagramUrl,
  });

  return `<!doctype html>
<html>
  <body style="margin: 0; padding: 24px 12px; background: #f7f1ea; font-family: Arial, sans-serif; color: #1f2b37;">
    <table role="presentation" width="100%" style="border-collapse: collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 720px; border-collapse: collapse; background: #fffaf5; border: 1px solid #eadfd2; border-radius: 28px; overflow: hidden;">
            <tr>
              <td style="padding: 34px 34px 26px; background: linear-gradient(135deg, #fff0df 0%, #fff8f1 50%, #f4f8ff 100%);">
                <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 800; color: #8d4d21; margin-bottom: 10px;">IELTS Corner Weekly Digest</div>
                <div style="font-size: 34px; line-height: 1.15; font-weight: 800; color: #1f2b37; margin-bottom: 12px;">Fresh lessons, clear study steps, and the newest channel updates.</div>
                <div style="font-size: 16px; line-height: 1.7; color: #4e5a6b; max-width: 560px;">This week&apos;s digest is built to help you choose one useful lesson, one social post, and one next action instead of collecting random tips.</div>
              </td>
            </tr>

            <tr>
              <td style="padding: 30px 34px 12px;">
                <div style="font-size: 24px; line-height: 1.25; font-weight: 800; color: #1f2b37; margin-bottom: 8px;">Start with these new lessons</div>
                <div style="font-size: 15px; line-height: 1.7; color: #586577; margin-bottom: 20px;">Open one lesson, do the interactive practice, and save the rest for later. Each lesson now follows the same clearer teacher-style structure.</div>
                <table role="presentation" width="100%" style="border-collapse: collapse;">
                  ${lessonCards}
                </table>
              </td>
            </tr>

            ${socialCards ? `
            <tr>
              <td style="padding: 12px 34px 16px;">
                <div style="font-size: 24px; line-height: 1.25; font-weight: 800; color: #1f2b37; margin-bottom: 8px;">Latest on our channels</div>
                <div style="font-size: 15px; line-height: 1.7; color: #586577; margin-bottom: 20px;">If you want short study boosts between lessons, use the newest post from each channel below.</div>
                ${socialCards}
              </td>
            </tr>
            ` : ''}

            <tr>
              <td style="padding: 12px 34px 34px;">
                <table role="presentation" width="100%" style="border-collapse: collapse; background: linear-gradient(135deg, #173656 0%, #274c73 100%); border-radius: 22px; overflow: hidden;">
                  <tr>
                    <td style="padding: 24px;">
                      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 800; color: #ffd68d; margin-bottom: 10px;">Need direct feedback?</div>
                      <div style="font-size: 28px; line-height: 1.2; font-weight: 800; color: #ffffff; margin-bottom: 10px;">Work with a teacher, not just a worksheet.</div>
                      <div style="font-size: 15px; line-height: 1.7; color: #d8e6f4; margin-bottom: 18px;">Choose the support that matches your goal this week: essay correction, a private class, the writing score lab, or the live webinar.</div>
                      <a href="${siteUrl}/tutoring/" style="display: inline-block; background: #ffd68d; color: #173656; text-decoration: none; font-weight: 800; border-radius: 999px; padding: 11px 18px; margin-right: 10px;">Book tutoring</a>
                      <a href="${siteUrl}/essay-correction/" style="display: inline-block; background: rgba(255,255,255,0.14); color: #ffffff; text-decoration: none; font-weight: 800; border-radius: 999px; padding: 11px 18px; margin-top: 10px;">Essay correction</a>
                    </td>
                  </tr>
                </table>

                <div style="font-size: 13px; line-height: 1.7; color: #7a8491; margin-top: 18px;">
                  More ways to study:
                  <a href="${siteUrl}/celpip/writing/ai-feedback/" style="color: #24507d; font-weight: 700; text-decoration: underline;">writing score lab</a>,
                  <a href="${siteUrl}/webinar/" style="color: #24507d; font-weight: 700; text-decoration: underline;">weekly webinar</a>,
                  <a href="${youtubeChannelUrl}" style="color: #24507d; font-weight: 700; text-decoration: underline;">YouTube</a>,
                  <a href="${telegramChannelUrl}" style="color: #24507d; font-weight: 700; text-decoration: underline;">Telegram</a>,
                  <a href="${instagramUrl}" style="color: #24507d; font-weight: 700; text-decoration: underline;">Instagram</a>.
                </div>

                <div style="font-size: 12px; line-height: 1.7; color: #8d96a2; margin-top: 14px;">You are receiving this because you subscribed on ieltscorner.ca.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTextEmail({
  siteUrl,
  lessons,
  youtubeVideo,
  telegramPost,
  instagramPost,
  youtubeChannelUrl,
  telegramChannelUrl,
  instagramUrl,
}) {
  const lessonLines = lessons.map((lesson) => {
    const url = buildLessonUrl(siteUrl, lesson);
    const support = lesson.excerpt || lesson.heroTip || '';
    return `- ${lesson.title} (${lesson.category}, ${getLessonTier(lesson.level)})\n  ${url}${support ? `\n  ${support}` : ''}`;
  }).join('\n\n');

  const socialLines = [
    youtubeVideo ? `YouTube: ${youtubeVideo.title}\n${youtubeVideo.url}` : `YouTube: ${youtubeChannelUrl}`,
    telegramPost ? `Telegram: ${telegramPost.preview}\n${telegramPost.url || telegramChannelUrl}` : `Telegram: ${telegramChannelUrl}`,
    instagramPost ? `Instagram: ${instagramPost.preview}\n${instagramPost.url || instagramUrl}` : `Instagram: ${instagramUrl}`,
  ].join('\n\n');

  return `IELTS Corner Weekly Digest

Fresh lessons, clear study steps, and the newest channel updates.

Start with these new lessons:

${lessonLines}

Latest on our channels:

${socialLines}

Need direct feedback?
- Tutoring: ${siteUrl}/tutoring/
- Essay correction: ${siteUrl}/essay-correction/
- Writing score lab: ${siteUrl}/celpip/writing/ai-feedback/
- Weekly webinar: ${siteUrl}/webinar/

You are receiving this because you subscribed on ieltscorner.ca.`;
}

async function sendDigestEmails({
  subscribers,
  gmailUser,
  gmailPassword,
  html,
  text,
  subject,
}) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  let sentCount = 0;
  for (const subscriber of subscribers) {
    await transporter.sendMail({
      from: `IELTS Corner <${gmailUser}>`,
      to: subscriber.email,
      subject,
      text,
      html,
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
  const telegramChannelUrl = normalizeAbsoluteUrl(process.env.TELEGRAM_CHANNEL_URL || DEFAULT_TELEGRAM_CHANNEL_URL);
  const instagramUsername = (process.env.INSTAGRAM_USERNAME || DEFAULT_INSTAGRAM_USERNAME).trim().replace(/^@/, '');
  const instagramUrl = `https://www.instagram.com/${instagramUsername}/`;

  const [lessons, youtubeVideo, telegramPost, instagramPost] = await Promise.all([
    getLatestLessons(5),
    getLatestYouTubeVideo(youtubeChannelUrl),
    getTelegramChannelSnapshot(telegramChannelUrl),
    getLatestInstagramPost(instagramUsername),
  ]);

  const subject = `IELTS Corner weekly digest: ${lessons.length} fresh lessons and study links`;
  const html = buildHtmlEmail({
    siteUrl,
    lessons,
    youtubeVideo,
    telegramPost,
    instagramPost,
    youtubeChannelUrl,
    telegramChannelUrl,
    instagramUrl,
  });
  const text = buildTextEmail({
    siteUrl,
    lessons,
    youtubeVideo,
    telegramPost,
    instagramPost,
    youtubeChannelUrl,
    telegramChannelUrl,
    instagramUrl,
  });

  if (options.preview) {
    console.log(`[preview] Subject: ${subject}`);
    console.log('[preview] Lessons:', lessons.map((item) => item.title));
    console.log('[preview] YouTube:', youtubeVideo?.title || 'not found');
    console.log('[preview] Telegram:', telegramPost?.preview || 'not found');
    console.log('[preview] Instagram:', instagramPost?.preview || 'not found');
    console.log('\n[preview] Text email:\n');
    console.log(text);
    console.log('\n[preview] HTML email:\n');
    console.log(html);
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

  const subscribers = await getSubscriberRecords({ formId: formMatch.formId, accessToken });
  if (subscribers.length === 0) {
    console.log('[info] No newsletter subscribers found.');
    return;
  }

  if (lessons.length === 0) {
    console.log('[info] No published lessons found.');
    return;
  }

  console.log(`[info] Subscribers: ${subscribers.length}`);
  console.log(`[info] Latest subscriber: ${subscribers[0]?.submittedAt || 'unknown'}`);
  console.log(`[info] Latest lessons selected: ${lessons.length}`);
  console.log(`[info] Last sent at: ${state.lastSentAt || 'never'}`);
  console.log(`[info] Social found: YouTube=${youtubeVideo ? 'yes' : 'no'} | Telegram=${telegramPost ? 'yes' : 'no'} | Instagram=${instagramPost ? 'yes' : 'no'}`);

  if (options.dryRun) {
    console.log('[dry-run] First recipients:', subscribers.slice(0, 5).map((item) => item.email));
    console.log('[dry-run] Subject:', subject);
    console.log('[dry-run] Lesson titles:', lessons.map((item) => item.title));
    return;
  }

  const sentCount = await sendDigestEmails({
    subscribers,
    gmailUser,
    gmailPassword,
    html,
    text,
    subject,
  });

  const newestLessonDate = lessons[0]?.dateIso || new Date().toISOString();
  await saveState(stateFilePath, {
    lastSentAt: newestLessonDate,
    lastRunAt: new Date().toISOString(),
    lastSentCount: sentCount,
    lastSubscriberCount: subscribers.length,
  });

  console.log(`[ok] Newsletter sent to ${sentCount} subscribers.`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
