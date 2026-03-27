#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  fetchNetlifyJson,
  getFormSubmissions,
  getNetlifyFormMatch,
  getNetlifySiteInfo,
  normalizeSubscriberEmail,
} from './lib/newsletter-audience.mjs';

const DEFAULT_FORM_NAME = 'newsletter';
const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

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
    json: false,
    help: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/dedupe-newsletter-subscribers.mjs
  node scripts/dedupe-newsletter-subscribers.mjs --apply
  node scripts/dedupe-newsletter-subscribers.mjs --json

Default behavior is dry-run. Use --apply to permanently delete older duplicate submissions and keep the newest submission for each email.`);
}

function summarizeDuplicates(submissions) {
  const byEmail = new Map();

  for (const submission of submissions) {
    const email = normalizeSubscriberEmail(submission?.data?.email ?? '');
    if (!email || !email.includes('@')) {
      continue;
    }

    const createdAt = String(submission?.createdAt || '').trim();
    const existing = byEmail.get(email) || [];
    existing.push({
      id: String(submission?.id || ''),
      email,
      createdAt,
    });
    byEmail.set(email, existing);
  }

  const duplicateGroups = [];
  for (const [email, rows] of byEmail.entries()) {
    if (rows.length < 2) {
      continue;
    }

    rows.sort((a, b) => {
      const aTime = Date.parse(a.createdAt || '');
      const bTime = Date.parse(b.createdAt || '');
      if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
      if (!Number.isFinite(aTime)) return 1;
      if (!Number.isFinite(bTime)) return -1;
      return bTime - aTime;
    });

    duplicateGroups.push({
      email,
      keep: rows[0],
      remove: rows.slice(1),
    });
  }

  duplicateGroups.sort((a, b) => a.email.localeCompare(b.email));
  return duplicateGroups;
}

async function deleteSubmission({ submissionId, accessToken }) {
  const response = await fetch(`${NETLIFY_API_BASE}/submissions/${submissionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete submission ${submissionId} (${response.status}): ${text}`);
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    return;
  }

  await loadEnvFiles();

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

  const submissions = await getFormSubmissions({ formId: formMatch.formId, accessToken });
  const duplicateGroups = summarizeDuplicates(submissions);
  const duplicateSubmissionCount = duplicateGroups.reduce((total, group) => total + group.remove.length, 0);

  if (options.json) {
    console.log(JSON.stringify({
      site: siteInfo,
      formName: formMatch.formName,
      totalSubmissions: submissions.length,
      duplicateEmails: duplicateGroups.length,
      duplicateSubmissions: duplicateSubmissionCount,
      apply: options.apply,
      groups: duplicateGroups.map((group) => ({
        email: group.email,
        keep: group.keep,
        remove: group.remove,
      })),
    }, null, 2));
    return;
  }

  console.log(`Site: ${siteInfo.name || '(unknown)'} (${siteInfo.id})`);
  console.log(`Form: ${formMatch.formName}`);
  console.log(`Total submissions scanned: ${submissions.length}`);
  console.log(`Duplicate emails found: ${duplicateGroups.length}`);
  console.log(`Duplicate submissions removable: ${duplicateSubmissionCount}`);

  if (duplicateGroups.length === 0) {
    console.log('[ok] No duplicate newsletter submissions found.');
    return;
  }

  for (const group of duplicateGroups.slice(0, 20)) {
    console.log(`- ${group.email}: keep ${group.keep.id} (${group.keep.createdAt || 'unknown'}), remove ${group.remove.length}`);
  }
  if (duplicateGroups.length > 20) {
    console.log(`[info] ${duplicateGroups.length - 20} more duplicate email group(s) not shown.`);
  }

  if (!options.apply) {
    console.log('[dry-run] No submissions were deleted. Re-run with --apply to remove older duplicates.');
    return;
  }

  let deleted = 0;
  for (const group of duplicateGroups) {
    for (const row of group.remove) {
      await deleteSubmission({ submissionId: row.id, accessToken });
      deleted += 1;
    }
  }

  console.log(`[ok] Deleted ${deleted} duplicate newsletter submission(s).`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
