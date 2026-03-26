#!/usr/bin/env node

/**
 * Cleanup duplicate Telegram channel posts by scraping the public channel page.
 * Works even when a webhook is active (does not use getUpdates).
 *
 * Usage:
 *   node scripts/cleanup-telegram-duplicates.mjs            # dry-run
 *   node scripts/cleanup-telegram-duplicates.mjs --apply    # actually delete
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  htmlToPlainText,
  resolvePublicChannelSlug,
  toCanonicalPostText,
} from './lib/telegram-dedupe.mjs';

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
    // ignore missing env files
  }
}

async function loadEnvFiles() {
  const root = process.cwd();
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.env.local'));
}

function parseArgs(argv) {
  const options = { apply: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/cleanup-telegram-duplicates.mjs [--apply]\n\nDry-run by default. Use --apply to delete duplicates.');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function resolveChatId(explicitChatId, channelUrl) {
  const direct = explicitChatId?.trim();
  if (direct) return direct;
  const url = channelUrl?.trim();
  if (!url) return '';
  const normalized = url.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) return '';
  return slug.startsWith('@') ? slug : `@${slug}`;
}

/**
 * Scrape the public channel preview page and extract messages with IDs.
 * Paginates backwards using ?before=MSG_ID to load older posts.
 * Returns array of { messageId: number, text: string, textPreview: string }
 */
async function scrapeChannelMessages(slug, { maxPages = 10 } = {}) {
  if (!slug) return [];

  const allMessages = [];
  let beforeId = null;

  for (let page = 0; page < maxPages; page += 1) {
    const url = beforeId
      ? `https://t.me/s/${slug}?before=${beforeId}`
      : `https://t.me/s/${slug}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (page === 0) {
        throw new Error(`Failed to fetch channel page: HTTP ${response.status}`);
      }
      break;
    }

    const html = await response.text();

    // Each message block has a data-post attribute like "kaysenglishcorner/123"
    const messagePattern = /<div[^>]+class="tgme_widget_message_wrap[^"]*"[^>]*>[\s\S]*?<div[^>]+class="tgme_widget_message[^"]*"[^>]+data-post="[^/]+\/(\d+)"[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;

    const pageMessages = [];
    let match;
    while ((match = messagePattern.exec(html)) !== null) {
      const messageId = Number.parseInt(match[1], 10);
      const rawHtml = match[2];
      const plainText = toCanonicalPostText(htmlToPlainText(rawHtml), { stripSignature: true });
      if (plainText && Number.isFinite(messageId)) {
        pageMessages.push({
          messageId,
          text: plainText,
          textPreview: plainText.slice(0, 120).replace(/\n/g, ' '),
        });
      }
    }

    if (pageMessages.length === 0) break;

    allMessages.push(...pageMessages);

    // Find lowest messageId on this page for pagination
    const lowestId = Math.min(...pageMessages.map((m) => m.messageId));
    if (beforeId !== null && lowestId >= beforeId) break; // no progress
    beforeId = lowestId;

    // Brief delay between page fetches
    if (page < maxPages - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Deduplicate by messageId (pages may overlap)
  const seen = new Set();
  return allMessages.filter((msg) => {
    if (seen.has(msg.messageId)) return false;
    seen.add(msg.messageId);
    return true;
  });
}

/**
 * Group messages by normalized text and return duplicates to delete
 * (keeps the newest message in each group, marks older ones for deletion).
 */
function findDuplicates(messages) {
  const groups = new Map();

  for (const msg of messages) {
    const key = msg.text;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(msg);
  }

  const toDelete = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // Sort by messageId descending — keep the newest
    group.sort((a, b) => b.messageId - a.messageId);
    // Mark all but the first (newest) for deletion
    for (let i = 1; i < group.length; i += 1) {
      toDelete.push(group[i]);
    }
  }

  return toDelete.sort((a, b) => a.messageId - b.messageId);
}

async function telegramRequest(botToken, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API error (${method}): ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function deleteMessage(botToken, chatId, messageId) {
  try {
    await telegramRequest(botToken, 'deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
    return { success: true, messageId };
  } catch (error) {
    return { success: false, messageId, error: error.message };
  }
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const channelUrl = process.env.TELEGRAM_CHANNEL_URL ?? '';
  const chatId = resolveChatId(process.env.TELEGRAM_CHAT_ID, channelUrl);

  if (!botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }
  if (!chatId) {
    throw new Error('Missing target channel (TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_URL)');
  }

  const slug = resolvePublicChannelSlug(channelUrl, chatId);
  if (!slug) {
    throw new Error('Cannot resolve public channel slug from TELEGRAM_CHANNEL_URL or TELEGRAM_CHAT_ID');
  }

  console.log(`[info] Target channel: ${chatId} (public slug: ${slug})`);
  console.log('[info] Scraping recent channel posts from t.me/s/...');

  const messages = await scrapeChannelMessages(slug);
  console.log(`[info] Found ${messages.length} text posts in the public channel preview.`);

  if (messages.length === 0) {
    console.log('[warn] No posts found. The channel may be private or empty.');
    return;
  }

  const duplicates = findDuplicates(messages);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate posts found.');
    return;
  }

  console.log(`\n[info] Found ${duplicates.length} duplicate post(s) to delete:`);
  for (const dup of duplicates) {
    console.log(`  - message_id=${dup.messageId} | ${dup.textPreview}`);
  }

  if (!options.apply) {
    console.log('\n[dry-run] No deletions performed. Re-run with --apply to delete.');
    return;
  }

  console.log('\n[apply] Deleting duplicates...');
  let deleted = 0;
  let failed = 0;

  for (const dup of duplicates) {
    const result = await deleteMessage(botToken, chatId, dup.messageId);
    if (result.success) {
      deleted += 1;
      console.log(`  ✅ Deleted message_id=${dup.messageId}`);
    } else {
      failed += 1;
      console.log(`  ❌ Failed message_id=${dup.messageId}: ${result.error}`);
    }
    // Brief delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n[summary] deleted=${deleted} failed=${failed}`);
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
