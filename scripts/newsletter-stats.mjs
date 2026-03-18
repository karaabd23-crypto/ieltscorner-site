#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getNetlifyFormMatch,
  getNetlifySiteInfo,
  getSubscriberRecords,
} from './lib/newsletter-audience.mjs';

const DEFAULT_FORM_NAME = 'newsletter';

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

  const accessToken = process.env.NETLIFY_ACCESS_TOKEN || '';
  const siteId = process.env.NETLIFY_SITE_ID || '';
  const formName = (process.env.NEWSLETTER_FORM_NAME || DEFAULT_FORM_NAME).trim();

  if (!accessToken || !siteId) {
    throw new Error('Missing NETLIFY_ACCESS_TOKEN and/or NETLIFY_SITE_ID');
  }

  const siteInfo = await getNetlifySiteInfo({ siteId, accessToken });
  const formMatch = await getNetlifyFormMatch({ siteId, accessToken, formName });

  if (!formMatch.formId) {
    throw new Error(`Netlify form not found: ${formName}`);
  }

  const subscribers = await getSubscriberRecords({ formId: formMatch.formId, accessToken });
  const latestSignup = subscribers[0]?.submittedAt || '';

  if (options.json) {
    console.log(JSON.stringify({
      site: siteInfo,
      formName: formMatch.formName,
      subscribers: subscribers.length,
      latestSignup,
    }, null, 2));
    return;
  }

  console.log(`Site: ${siteInfo.name || '(unknown)'} (${siteInfo.id})`);
  console.log(`Form: ${formMatch.formName}`);
  console.log(`Subscribers: ${subscribers.length}`);
  console.log(`Latest signup: ${formatDate(latestSignup)}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
