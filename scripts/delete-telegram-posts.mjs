#!/usr/bin/env node

/**
 * Delete Telegram channel posts by message ID
 * Usage: node scripts/delete-telegram-posts.mjs <message_id1> <message_id2> ...
 * Or: node scripts/delete-telegram-posts.mjs --last N (deletes last N posts)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadEnvFiles() {
  const envPath = join(__dirname, '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    // .env file is optional
  }
}

function resolveChatId(chatId, channelUrl) {
  if (chatId?.trim()) {
    return chatId.trim();
  }

  if (!channelUrl?.trim()) {
    return '';
  }

  const normalized = channelUrl.replace(/^https?:\/\//i, '').replace(/^t\.me\//i, '');
  const slug = normalized.split(/[/?#]/)[0]?.trim();
  if (!slug) {
    return '';
  }

  return slug.startsWith('@') ? slug : `@${slug}`;
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
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
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

async function getChannelInfo(botToken, chatId) {
  try {
    const chat = await telegramRequest(botToken, 'getChat', {
      chat_id: chatId,
    });
    return chat;
  } catch (error) {
    console.warn(`[warn] Could not get channel info: ${error.message}`);
    return null;
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const messageIds = [];
  const options = { dryRun: false, lastN: 0 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--last' && args[i + 1]) {
      options.lastN = parseInt(args[i + 1], 10);
      i++;
    } else if (/^\d+$/.test(arg)) {
      messageIds.push(parseInt(arg, 10));
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/delete-telegram-posts.mjs [options] <message_id1> <message_id2> ...

Options:
  --dry-run          Show what would be deleted without actually deleting
  --last N           Delete the last N posts from the channel
  --help, -h         Show this help message

Examples:
  # Delete specific messages
  node scripts/delete-telegram-posts.mjs 123 124 125

  # Delete last 5 posts (dry-run first!)
  node scripts/delete-telegram-posts.mjs --last 5 --dry-run
  node scripts/delete-telegram-posts.mjs --last 5

Note: You need a message ID to delete it. Message IDs are visible when you forward
a message or use the Telegram Bot API getUpdates method.
`);
      process.exit(0);
    }
  }

  return { messageIds, ...options };
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

  // Get channel info
  const channelInfo = await getChannelInfo(botToken, chatId);
  if (channelInfo) {
    console.log(`[info] Channel: ${channelInfo.title || chatId}`);
  }

  // Determine which messages to delete
  let messageIds = options.messageIds;

  if (options.lastN > 0) {
    console.log(`\n[info] --last ${options.lastN} was specified`);
    console.log('[warn] Note: Telegram Bot API does not provide a way to list channel posts.');
    console.log('[warn] You need to manually get message IDs from your channel.');
    console.log('[warn] Option 1: Forward posts to @userinfobot to get message IDs');
    console.log('[warn] Option 2: Use getUpdates if bot has admin access');
    console.log('[warn] Option 3: Check Telegram Web and note the message numbers in URLs\n');
    
    if (messageIds.length === 0) {
      console.log('[error] No message IDs provided. Please specify message IDs manually.');
      process.exit(1);
    }
  }

  if (messageIds.length === 0) {
    console.log('[error] No message IDs specified.');
    console.log('[tip] Usage: node scripts/delete-telegram-posts.mjs <message_id1> <message_id2> ...');
    console.log('[tip] Or use --help for more options');
    process.exit(1);
  }

  console.log(`\n[info] Messages to delete: ${messageIds.join(', ')}`);

  if (options.dryRun) {
    console.log('\n🏃 DRY-RUN MODE: No actual deletions will be performed\n');
    messageIds.forEach((id) => {
      console.log(`[dry-run] Would delete message ${id}`);
    });
    console.log('\n✅ Dry-run complete. Remove --dry-run to actually delete.');
    return;
  }

  // Confirm before deletion
  console.log('\n⚠️  WARNING: This will PERMANENTLY delete these posts!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Delete messages
  const results = [];
  for (const messageId of messageIds) {
    console.log(`[deleting] Message ${messageId}...`);
    const result = await deleteMessage(botToken, chatId, messageId);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Deleted message ${messageId}`);
    } else {
      console.log(`❌ Failed to delete message ${messageId}: ${result.error}`);
    }
    
    // Small delay between deletions to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n📊 Summary:`);
  console.log(`✅ Deleted: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${results.length}`);
}

main().catch((error) => {
  console.error('[error]', error.message);
  process.exit(1);
});
