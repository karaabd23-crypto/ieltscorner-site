#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getDigestAudienceSnapshot,
  getKitFormSubscribers,
  parseOptionalInteger,
} from './lib/kit-newsletter-audience.mjs';

const DEFAULT_SITE_URL = 'https://ieltscorner.ca';
const DEFAULT_SITE_NAME = 'IELTS Corner';
const DEFAULT_READING_FORM_ID = 9278286;

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
    json: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const kitApiKey = (process.env.KIT_API_KEY || '').trim();
  const digestTagId = parseOptionalInteger(process.env.KIT_DIGEST_TAG_ID);
  const digestFormId = parseOptionalInteger(process.env.KIT_DIGEST_FORM_ID);
  const kitFormId = parseOptionalInteger(process.env.KIT_FORM_ID);
  const readingFormId = parseOptionalInteger(process.env.KIT_READING_GUIDE_FORM_ID)
    || DEFAULT_READING_FORM_ID;
  const siteName = (process.env.SITE_NAME || DEFAULT_SITE_NAME).trim();
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).trim();

  if (!kitApiKey) {
    throw new Error('Missing KIT_API_KEY');
  }

  const digest = await getDigestAudienceSnapshot({
    apiKey: kitApiKey,
    digestTagId,
    digestFormId,
    kitFormId,
  });
  const latestSignup = digest.subscribers[0]?.submittedAt || '';

  let readingGuideSubscriberCount = null;
  if (readingFormId && !(digest.audienceType === 'form' && digest.audienceId === readingFormId)) {
    const readingSubscribers = await getKitFormSubscribers({
      apiKey: kitApiKey,
      formId: readingFormId,
    });
    readingGuideSubscriberCount = readingSubscribers.length;
  }

  if (options.json) {
    console.log(JSON.stringify({
      site: {
        name: siteName,
        url: siteUrl,
      },
      audience: {
        type: digest.audienceType,
        id: digest.audienceId,
        label: digest.audienceLabel,
      },
      subscribers: digest.subscribers.length,
      latestSignup,
      recentSubscriberEmails: digest.subscribers.slice(0, 5).map((item) => item.email),
      segmentation: {
        readingGuideFormId: readingFormId,
        readingGuideSubscriberCount,
      },
    }, null, 2));
    return;
  }

  console.log(`Site: ${siteName}`);
  console.log(`URL: ${siteUrl}`);
  console.log(`Digest audience: ${digest.audienceLabel}`);
  console.log(`Subscribers: ${digest.subscribers.length}`);
  console.log(`Latest signup: ${formatDate(latestSignup)}`);
  if (Number.isFinite(readingGuideSubscriberCount)) {
    console.log(`Reading guide form (${readingFormId}) subscribers: ${readingGuideSubscriberCount}`);
  }
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
