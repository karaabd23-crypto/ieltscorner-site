#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  htmlToPlainText,
  resolvePublicChannelSlug,
} from './lib/telegram-dedupe.mjs';
import {
  appendTelegramSignature,
  formatTelegramSignatureLine,
} from './lib/telegram-signature.mjs';

const BOT_DIRECT_URL = 'https://t.me/Ewithkpaybot';
const NEW_SIGNATURE_LINES = [
  '🌈 Kay’s English Corner 🇨🇦',
  '📅 Book your free consultation: 👉 https://calendar.app.google/nzoni849GjBUfEac6',
  '📲 WhatsApp (direct support): 👉 https://wa.me/17789942315',
  `🤖 Ask the robot anything: grammar, vocabulary, sentence fixes, and quick study help 👉 ${BOT_DIRECT_URL}`,
  '🌐 https://celpipcorner.ca',
  '📢 Channel: https://whatsapp.com/channel/0029VbBlsh87tkjFAkYchn19',
  '📸 IG: https://instagram.com/ieltscorner.ca',
];

const SCREENSHOT_SIGNATURE_HEADER = "➖➖➖🇨🇦 K A Y ' S    E N G L I S H    C O R N E R 🇨🇦➖➖➖";
const SCREENSHOT_SIGNATURE_LINKS = [
  {
    text: '📅   Book your free consultation',
    href: 'https://calendar.app.google/nzoni849GjBUfEac6',
  },
  {
    text: '📲   Question? Ask us on WhatsApp',
    href: 'https://wa.me/17789942315',
  },
  {
    text: '🤖   Use the Channel Robot',
    href: BOT_DIRECT_URL,
  },
  {
    text: '🌐   Website: CELPIPcorner.ca',
    href: 'https://ieltscorner.ca',
  },
  {
    text: '📢   Follow our WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029VbBlsh87tkjFAkYchn19',
  },
  {
    text: '📸   Instagram',
    href: 'https://instagram.com/ieltscorner.ca',
  },
];
const SCREENSHOT_SIGNATURE_LINES = [
  SCREENSHOT_SIGNATURE_HEADER,
  ...SCREENSHOT_SIGNATURE_LINKS.map((item) => item.text),
];

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = stripWrappingQuotes(line.slice(separatorIndex + 1));
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

async function loadEnvFiles() {
  await loadEnvFile(path.join(process.cwd(), '.env'));
  await loadEnvFile(path.join(process.cwd(), '.env.local'));
}

function parseArgs(argv) {
  const options = {
    apply: false,
    count: 20,
    force: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--count') {
      options.count = Math.max(1, Number.parseInt(argv[i + 1] ?? '20', 10) || 20);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/update-telegram-channel-signatures.mjs [--count 20] [--apply] [--force]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveChatId(explicitChatId, channelUrl) {
  const direct = String(explicitChatId ?? '').trim();
  if (direct) return direct;

  const url = String(channelUrl ?? '').trim();
  if (!url) return '';
  const normalized = url.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) return '';
  return slug.startsWith('@') ? slug : `@${slug}`;
}

function parseMessagesFromHtml(html) {
  const messages = [];
  const chunks = String(html ?? '').split('<div class="tgme_widget_message_wrap');

  for (const chunk of chunks) {
    if (!chunk.includes('data-post=')) continue;
    if (!chunk.includes('tgme_widget_message_text')) continue;

    const idMatch = chunk.match(/data-post="[^/]+\/(\d+)"/);
    const textMatch = chunk.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!idMatch || !textMatch) continue;

    const messageId = Number.parseInt(idMatch[1], 10);
    const rawHtml = textMatch[1];
    const plainText = String(htmlToPlainText(rawHtml) ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!plainText || !Number.isFinite(messageId)) continue;
    messages.push({
      messageId,
      plainText,
      preview: plainText.split('\n').find((line) => line.trim()) || '',
    });
  }

  return messages;
}

async function scrapeRecentTextMessages(slug, count, maxPages = 6) {
  const collected = [];
  const seen = new Set();
  let beforeId = null;

  for (let page = 0; page < maxPages && collected.length < count; page += 1) {
    const url = beforeId
      ? `https://t.me/s/${slug}?before=${beforeId}`
      : `https://t.me/s/${slug}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch channel page: HTTP ${response.status}`);
    }

    const html = await response.text();
    const pageMessages = parseMessagesFromHtml(html)
      .sort((a, b) => b.messageId - a.messageId);

    if (pageMessages.length === 0) {
      break;
    }

    for (const message of pageMessages) {
      if (seen.has(message.messageId)) continue;
      seen.add(message.messageId);
      collected.push(message);
      if (collected.length >= count) break;
    }

    const lowestId = Math.min(...pageMessages.map((item) => item.messageId));
    if (!Number.isFinite(lowestId) || (beforeId !== null && lowestId >= beforeId)) {
      break;
    }
    beforeId = lowestId;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return collected
    .sort((a, b) => b.messageId - a.messageId)
    .slice(0, count);
}

function escapeTelegramHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripExistingSignature(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const separatorPattern = /^[\s\u00A0]*➖{5,}[\s\u00A0]*$/u;
  const headingPattern = /Kay.?s English Corner/i;
  const spacedHeadingPattern = /K\s*A\s*Y\s*'\s*S[\s\u00A0]+E\s*N\s*G\s*L\s*I\s*S\s*H/i;
  const customHeadingPattern = /KAY'\s*S\s+ENGLISH\s+CORNER/i;

  const signatureStart = lines.findIndex((line, index) => {
    if (headingPattern.test(line) || spacedHeadingPattern.test(line) || customHeadingPattern.test(line)) {
      return true;
    }

    if (!separatorPattern.test(line)) {
      return false;
    }
    return true;
  });
  const bodyLines = signatureStart >= 0 ? lines.slice(0, signatureStart) : lines;
  return bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function legacyFormatTelegramLine(line, lineIndex) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return '';

  if (lineIndex === 0) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  if (/^(📅|📲|📘|🤖|🌐|📢|📸)/u.test(trimmed)) {
    return `<u>${escapeTelegramHtml(trimmed)}</u>`;
  }

  if (/^[^.!?]{1,90}:$/.test(trimmed)) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  if (/^#/.test(trimmed)) {
    return escapeTelegramHtml(trimmed);
  }

  return escapeTelegramHtml(trimmed);
}

function formatTelegramPost(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((line, index) => formatTelegramLine(line, index))
    .join('\n');
}

function formatTelegramLine(line, lineIndex) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return '';

  if (lineIndex === 0) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  const formattedSignatureLine = formatTelegramSignatureLine(trimmed, escapeTelegramHtml);
  if (formattedSignatureLine) {
    return formattedSignatureLine;
  }

  if (/^[^.!?]{1,90}:$/.test(trimmed)) {
    return `<b>${escapeTelegramHtml(trimmed)}</b>`;
  }

  if (/^#/.test(trimmed)) {
    return escapeTelegramHtml(trimmed);
  }

  return escapeTelegramHtml(trimmed);
}

function legacyBuildEditedPost(plainText) {
  const body = stripExistingSignature(plainText);
  const nextPlainText = appendTelegramSignature(body);
  const nextHtml = formatTelegramPost(nextPlainText);
  return {
    nextPlainText,
    nextHtml,
  };
}

function buildEditedPost(plainText) {
  const body = stripExistingSignature(plainText);
  const nextPlainText = appendTelegramSignature(body);
  const nextHtml = formatTelegramPost(nextPlainText);
  return {
    nextPlainText,
    nextHtml,
  };
}

async function telegramRequest(botToken, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function editMessage(botToken, chatId, messageId, htmlText) {
  try {
    return await telegramRequest(botToken, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (error) {
    if (!/there is no text in the message to edit/i.test(error.message)) {
      throw error;
    }

    return telegramRequest(botToken, 'editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: htmlText,
      parse_mode: 'HTML',
    });
  }
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL ?? '';
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);
  const slug = resolvePublicChannelSlug(channelUrl, chatId);

  if (!botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }
  if (!chatId) {
    throw new Error('Missing target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL)');
  }
  if (!slug) {
    throw new Error('Unable to resolve public Telegram channel slug');
  }

  const messages = await scrapeRecentTextMessages(slug, options.count);
  if (messages.length === 0) {
    throw new Error('No recent text messages found in public channel preview');
  }

  const candidates = messages.map((message) => {
    const { nextPlainText, nextHtml } = buildEditedPost(message.plainText);
    return {
      ...message,
      nextPlainText,
      nextHtml,
      changed: message.plainText !== nextPlainText,
    };
  });
  const updates = options.force ? candidates : candidates.filter((item) => item.changed);

  console.log(`[info] Found ${messages.length} recent text post(s). ${updates.length} need a signature update.`);
  for (const item of updates) {
    console.log(`- message_id=${item.messageId} | ${item.preview.slice(0, 90)}`);
  }

  if (!options.apply) {
    console.log('[dry-run] No messages were edited. Re-run with --apply to update them live.');
    return;
  }

  let edited = 0;
  let failed = 0;
  for (const item of updates) {
    try {
      await editMessage(botToken, chatId, item.messageId, item.nextHtml);
      edited += 1;
      console.log(`[ok] Updated message_id=${item.messageId}`);
    } catch (error) {
      if (/message is not modified/i.test(error.message)) {
        console.log(`[skip] message_id=${item.messageId} already matches target signature`);
        continue;
      }
      failed += 1;
      console.log(`[error] Failed message_id=${item.messageId}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(`[summary] edited=${edited} failed=${failed}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
