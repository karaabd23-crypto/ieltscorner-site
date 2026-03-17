import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_HISTORY_FILE = '.cache/telegram-post-history.json';
const DEFAULT_CLAIMS_DIR = '.cache/telegram-post-claims';
const HISTORY_MAX_ITEMS = 5000;
const DEFAULT_TOPIC_DEDUPE_DAYS = 60;

export function htmlToPlainText(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function normalizeForDedupe(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripSignatureForDedupe(text) {
  return String(text ?? '')
    .replace(/\n?\s*[^\n]*Kay's English Corner[^\n]*\n(?:[^\n]*\n){0,3}?https:\/\/t\.me\/Kaysenglishcorner/gi, '')
    .trim();
}

export function toCanonicalPostText(text, options = {}) {
  const { stripSignature = true } = options;
  const prepared = stripSignature ? stripSignatureForDedupe(text) : String(text ?? '');
  return normalizeForDedupe(prepared);
}

export function createContentFingerprint(text, options = {}) {
  const normalized = toCanonicalPostText(text, options);
  return createHash('sha256').update(normalized).digest('hex');
}

export function createTopicKey(topic) {
  return normalizeForDedupe(String(topic ?? '')).toLowerCase();
}

export function resolveHistoryFilePath() {
  const configured = process.env.TELEGRAM_HISTORY_FILE?.trim();
  if (!configured) {
    return path.join(process.cwd(), DEFAULT_HISTORY_FILE);
  }

  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

export async function loadPostHistory(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch {
    // ignore missing/invalid history file
  }

  return { items: [] };
}

export function hasFingerprint(history, fingerprint) {
  return Array.isArray(history?.items) && history.items.some((item) => item?.fingerprint === fingerprint);
}

export function hasRecentTopic(history, topic, options = {}) {
  const { kind = '', maxAgeDays = DEFAULT_TOPIC_DEDUPE_DAYS } = options;
  const topicKey = createTopicKey(topic);
  if (!topicKey || !Array.isArray(history?.items)) {
    return false;
  }

  const lookbackDays = Number.isFinite(maxAgeDays) && maxAgeDays > 0 ? maxAgeDays : DEFAULT_TOPIC_DEDUPE_DAYS;
  const cutoff = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);

  return history.items.some((item) => {
    if (!item || typeof item !== 'object') return false;
    if (kind && item.kind !== kind) return false;

    const itemTopicKey = item.topicKey || createTopicKey(item.topic);
    if (itemTopicKey !== topicKey) return false;

    const createdAtMs = Date.parse(item.createdAt ?? '');
    if (!Number.isFinite(createdAtMs)) {
      return true;
    }

    return createdAtMs >= cutoff;
  });
}

export function rememberFingerprint(history, fingerprint, meta = {}) {
  const next = {
    fingerprint,
    kind: String(meta.kind ?? 'post'),
    topic: String(meta.topic ?? ''),
    topicKey: meta.topicKey || createTopicKey(meta.topic),
    createdAt: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(meta).filter(([key]) => !['kind', 'topic', 'topicKey'].includes(key))
    ),
  };

  history.items.push(next);
  if (history.items.length > HISTORY_MAX_ITEMS) {
    history.items = history.items.slice(history.items.length - HISTORY_MAX_ITEMS);
  }
}

export async function savePostHistory(filePath, history) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
}

export function resolvePublicChannelSlug(channelUrl, chatId) {
  const fromUrl = String(channelUrl ?? '').trim();
  if (fromUrl) {
    const normalized = fromUrl
      .replace(/^https?:\/\//i, '')
      .replace(/^t\.me\//i, '')
      .replace(/^s\//i, '');
    const slug = normalized.split(/[/?#]/)[0]?.trim();
    if (slug && !slug.startsWith('+')) {
      return slug.replace(/^@/, '');
    }
  }

  const fromChat = String(chatId ?? '').trim();
  if (fromChat.startsWith('@')) {
    return fromChat.slice(1);
  }

  return '';
}

export async function fetchRecentChannelTexts(slug, options = {}) {
  if (!slug) {
    return [];
  }

  try {
    const response = await fetch(`https://t.me/s/${slug}`);
    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const blocks = [...html.matchAll(/<div class="tgme_widget_message_text[\s\S]*?>([\s\S]*?)<\/div>/g)];
    return blocks
      .map((match) => toCanonicalPostText(htmlToPlainText(match[1] ?? ''), options))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function resolveClaimsDirPath() {
  const configured = process.env.TELEGRAM_CLAIMS_DIR?.trim();
  if (!configured) {
    return path.join(process.cwd(), DEFAULT_CLAIMS_DIR);
  }

  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function claimFileName(label, value) {
  const hash = createHash('sha256').update(String(value ?? '')).digest('hex');
  return `${label}-${hash}.json`;
}

async function createClaimFile(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

export async function claimPostOwnership(meta = {}) {
  const kind = String(meta.kind ?? 'post');
  const fingerprint = String(meta.fingerprint ?? '').trim();
  const topic = String(meta.topic ?? '').trim();
  const topicKey = createTopicKey(topic);
  const dirPath = resolveClaimsDirPath();
  const fileSpecs = [
    { label: `${kind}-fingerprint`, value: fingerprint || `${kind}-missing-fingerprint` },
  ];

  if (topicKey) {
    fileSpecs.push({ label: `${kind}-topic`, value: topicKey });
  }

  await mkdir(dirPath, { recursive: true });

  const claimedFiles = [];
  for (const spec of fileSpecs) {
    const filePath = path.join(dirPath, claimFileName(spec.label, spec.value));
    try {
      await createClaimFile(filePath, {
        kind,
        fingerprint,
        topic,
        topicKey,
        createdAt: new Date().toISOString(),
      });
      claimedFiles.push(filePath);
    } catch (error) {
      if (error?.code === 'EEXIST') {
        await Promise.all(claimedFiles.map((claimedFile) => rm(claimedFile, { force: true })));
        return { claimed: false, kind, fingerprint, topicKey, filePath };
      }
      throw error;
    }
  }

  return { claimed: true, kind, fingerprint, topicKey, filePaths: claimedFiles };
}

export async function releasePostOwnershipClaim(claim) {
  const filePaths = Array.isArray(claim?.filePaths)
    ? claim.filePaths
    : (claim?.filePath ? [claim.filePath] : []);

  await Promise.all(filePaths.map((filePath) => rm(filePath, { force: true })));
}
