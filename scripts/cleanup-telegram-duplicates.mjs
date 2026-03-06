#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

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
    apply: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/cleanup-telegram-duplicates.mjs [--apply]\n\nDefault mode is dry-run.\nUse --apply to actually delete duplicate messages.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveChatId(explicitChatId, channelUrl) {
  const direct = explicitChatId?.trim();
  if (direct) {
    return direct;
  }

  const url = channelUrl?.trim();
  if (!url) {
    return '';
  }

  const normalized = url.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) {
    return '';
  }

  return slug.startsWith('@') ? slug : `@${slug}`;
}

function normalizeForDedupe(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chatMatches(updateChat, targetChatId) {
  const target = String(targetChatId ?? '').trim();
  if (!updateChat || !target) {
    return false;
  }

  const updateId = String(updateChat.id ?? '').trim();
  if (target === updateId) {
    return true;
  }

  if (target.startsWith('@')) {
    return `@${String(updateChat.username ?? '').trim()}`.toLowerCase() === target.toLowerCase();
  }

  return false;
}

async function telegramRequest(botToken, method, payload) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
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

function findDuplicateMessages(updates, targetChatId) {
  const map = new Map();
  const candidates = [];

  for (const item of updates) {
    const message = item?.channel_post;
    if (!message) {
      continue;
    }

    if (!chatMatches(message.chat, targetChatId)) {
      continue;
    }

    const contentText = normalizeForDedupe(message.text || message.caption || '');
    if (!contentText) {
      continue;
    }

    const key = contentText;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, message);
      continue;
    }

    const existingScore = Number(existing.message_id ?? 0);
    const currentScore = Number(message.message_id ?? 0);

    if (currentScore > existingScore) {
      candidates.push(existing);
      map.set(key, message);
    } else {
      candidates.push(message);
    }
  }

  return candidates
    .sort((a, b) => Number(a.message_id ?? 0) - Number(b.message_id ?? 0))
    .map((msg) => ({
      messageId: msg.message_id,
      textPreview: normalizeForDedupe(msg.text || msg.caption || '').slice(0, 120),
    }));
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

  console.log(`[info] Target channel: ${chatId}`);
  console.log('[info] Fetching recent updates visible to the bot...');

  const updates = await telegramRequest(botToken, 'getUpdates', {
    allowed_updates: ['channel_post', 'edited_channel_post'],
    limit: 100,
    timeout: 0,
  });

  const duplicates = findDuplicateMessages(updates, chatId);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate text posts found in current update window.');
    return;
  }

  console.log(`\n[info] Found ${duplicates.length} duplicate messages:`);
  duplicates.forEach((item) => {
    console.log(`- message_id=${item.messageId} | ${item.textPreview}`);
  });

  if (!options.apply) {
    console.log('\n[dry-run] No deletions were performed. Re-run with --apply to delete.');
    return;
  }

  console.log('\n[apply] Deleting duplicates...');
  let deleted = 0;
  let failed = 0;

  for (const item of duplicates) {
    const result = await deleteMessage(botToken, chatId, item.messageId);
    if (result.success) {
      deleted += 1;
      console.log(`✅ Deleted message_id=${item.messageId}`);
    } else {
      failed += 1;
      console.log(`❌ Failed message_id=${item.messageId}: ${result.error}`);
    }
  }

  console.log(`\n[summary] deleted=${deleted} failed=${failed}`);
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
