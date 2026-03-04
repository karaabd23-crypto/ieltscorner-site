#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
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
    // ignore
  }
}

async function loadEnvFiles() {
  const root = process.cwd();
  await loadEnvFile(path.join(root, '.env'));
  await loadEnvFile(path.join(root, '.env.local'));
}

function parseArgs(argv) {
  const options = {
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL ?? '',
    secret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
    dropPending: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') {
      options.webhookUrl = String(argv[i + 1] ?? '');
      i += 1;
    } else if (arg === '--secret') {
      options.secret = String(argv[i + 1] ?? '');
      i += 1;
    } else if (arg === '--drop-pending') {
      options.dropPending = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main() {
  await loadEnvFiles();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }

  const options = parseArgs(process.argv);
  if (!options.webhookUrl) {
    throw new Error('Missing webhook URL. Set TELEGRAM_WEBHOOK_URL or pass --url.');
  }

  const payload = {
    url: options.webhookUrl,
    drop_pending_updates: options.dropPending,
    allowed_updates: ['message', 'callback_query', 'my_chat_member'],
  };

  if (options.secret) {
    payload.secret_token = options.secret;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`setWebhook failed: ${JSON.stringify(data)}`);
  }

  const infoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const infoData = await infoResponse.json();

  if (!infoResponse.ok || !infoData.ok) {
    throw new Error(`getWebhookInfo failed: ${JSON.stringify(infoData)}`);
  }

  console.log(JSON.stringify({ ok: true, webhook: infoData.result }, null, 2));
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
