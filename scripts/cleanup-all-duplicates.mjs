#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
    dryRun: true,
    preview: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      options.dryRun = false;
    } else if (arg === '--preview') {
      options.preview = true;
    } else if (arg === '--help') {
      console.log(`Usage: node scripts/cleanup-all-duplicates.mjs [--apply] [--preview]\n\nDefault mode is dry-run.\nUse --apply to actually delete duplicate messages.\nUse --preview to see what would be deleted without applying.`);
      process.exit(0);
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

function htmlToPlainText(value) {
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

function normalizeForDedupe(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createContentFingerprint(text) {
  const normalized = normalizeForDedupe(text);
  return createHash('sha256').update(normalized).digest('hex');
}

async function fetchAllChannelMessages(slug) {
  if (!slug) {
    return [];
  }

  try {
    const response = await fetch(`https://t.me/s/${slug}`);
    if (!response.ok) {
      console.log(`[warn] Failed to fetch channel: HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    
    // Extract all message divs with structure: <div class="tgme_widget_message_day" ... contains multiple messages
    const dayBlocks = [...html.matchAll(/<div class="tgme_widget_message_day"[\s\S]*?<\/div>/g)];
    
    const messages = [];
    for (const dayBlock of dayBlocks) {
      // Extract individual message IDs and text from each day block
      const dayHtml = dayBlock[0];
      
      // Find message IDs in data-post attributes
      const postMatches = [...dayHtml.matchAll(/data-post="[^"]*\/(\d+)"/g)];
      const textMatches = [...dayHtml.matchAll(/<div class="tgme_widget_message_text[\s\S]*?>([\s\S]*?)<\/div>/g)];
      
      postMatches.forEach((match, idx) => {
        const messageId = match[1];
        const textContent = textMatches[idx]?.[1] ?? '';
        if (messageId && textContent) {
          messages.push({
            messageId: String(messageId),
            text: htmlToPlainText(textContent),
          });
        }
      });
    }

    return messages;
  } catch (error) {
    console.log(`[warn] Error fetching channel: ${error.message}`);
    return [];
  }
}

async function deleteMessage(botToken, chatId, messageId) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return { success: false, messageId, error: data.description || 'Unknown error' };
    }

    return { success: true, messageId };
  } catch (error) {
    return { success: false, messageId, error: error.message };
  }
}

function findAllDuplicates(messages) {
  const fingerprints = new Map();
  const duplicates = [];

  for (const msg of messages) {
    const fingerprint = createContentFingerprint(msg.text);
    const existing = fingerprints.get(fingerprint);

    if (!existing) {
      fingerprints.set(fingerprint, msg);
      continue;
    }

    // Keep the first occurrence, mark later ones as duplicates
    duplicates.push({
      messageId: Number(msg.messageId),
      textPreview: msg.text.slice(0, 100).replace(/\n/g, ' '),
      fingerprint,
    });
  }

  return duplicates.sort((a, b) => a.messageId - b.messageId);
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

  const slug = chatId.startsWith('@') ? chatId.slice(1) : chatId;
  console.log(`[info] Target channel: ${chatId}`);
  console.log(`[info] Scanning all messages from t.me/s/${slug}...\n`);

  const messages = await fetchAllChannelMessages(slug);
  console.log(`[info] Found ${messages.length} total messages in channel history\n`);

  if (messages.length === 0) {
    console.log('⚠️  No messages found. Channel may be empty or inaccessible.');
    return;
  }

  const duplicates = findAllDuplicates(messages);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate text posts found in channel history.');
    return;
  }

  console.log(`[info] Found ${duplicates.length} duplicate messages to remove:\n`);
  duplicates.forEach((item, idx) => {
    console.log(`${idx + 1}. message_id=${item.messageId}`);
    console.log(`   "${item.textPreview}..."\n`);
  });

  if (options.preview || options.dryRun) {
    console.log('[dry-run] No deletions were performed. Re-run with --apply to delete.');
    return;
  }

  console.log(`\n[apply] Deleting ${duplicates.length} duplicate messages...\n`);
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
