#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {
  getFormSubmissions,
  getNetlifyFormMatch,
  getNetlifySiteInfo,
} from './lib/newsletter-audience.mjs';

const DEFAULT_FORM_NAME = 'subscription-cancel-feedback';
const DEFAULT_STATE_FILE = '.cache/cancellation-feedback-state.json';
const DEFAULT_REPORT_DIR = '.cache/cancellation-feedback-reports';
function stripWrappingQuotes(value) {
  const trimmed = String(value || '').trim();
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
    dryRun: false,
    month: '',
    force: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--month') {
      options.month = String(argv[index + 1] || '').trim();
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.month && !/^\d{4}-\d{2}$/.test(options.month)) {
    throw new Error('--month must use YYYY-MM format');
  }

  return options;
}

function toMonthKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getPreviousMonthKey(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const monthIndex = referenceDate.getUTCMonth();
  const previousMonth = new Date(Date.UTC(year, monthIndex - 1, 1));
  return toMonthKey(previousMonth);
}

function getMonthRange(monthKey) {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

function normalizeText(value, max = 420) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeCode(value) {
  return normalizeText(value, 80).toLowerCase().replace(/\s+/g, '_');
}

function normalizeSubmission(row) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};
  const createdAt = String(row?.createdAt || '').trim();
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  const reasonCode = normalizeCode(data.reason_code || data.reason || 'not_specified') || 'not_specified';
  const improvementPriority = normalizeCode(data.improvement_priority || 'not_specified') || 'not_specified';
  const usageFrequency = normalizeCode(data.usage_frequency || 'not_specified') || 'not_specified';
  const reasonDetail = normalizeText(data.reason_detail || data.reason || '', 420);
  const keepYou = normalizeText(data.what_would_keep_you || '', 600);
  const sourcePage = normalizeText(data.source_page || '', 120);
  const flowVersion = normalizeText(data.cancel_flow_version || '', 80);

  const scoreRaw = normalizeText(data.satisfaction_score || '', 8);
  const scoreMatch = scoreRaw.match(/[1-5]/);
  const satisfactionScore = scoreMatch ? Number(scoreMatch[0]) : null;

  return {
    createdAt,
    createdDate,
    reasonCode,
    improvementPriority,
    usageFrequency,
    reasonDetail,
    keepYou,
    sourcePage,
    flowVersion,
    satisfactionScore,
  };
}

function incrementCount(map, key) {
  const normalized = normalizeCode(key || 'not_specified') || 'not_specified';
  map.set(normalized, (map.get(normalized) || 0) + 1);
}

function topEntries(map, limit = 6) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function summarizeData(rows) {
  const reasonCounts = new Map();
  const priorityCounts = new Map();
  const usageCounts = new Map();
  const sourceCounts = new Map();
  const flowCounts = new Map();
  const comments = [];
  const keepRequests = [];
  const scores = [];

  for (const row of rows) {
    incrementCount(reasonCounts, row.reasonCode);
    incrementCount(priorityCounts, row.improvementPriority);
    incrementCount(usageCounts, row.usageFrequency);
    incrementCount(sourceCounts, row.sourcePage || 'unknown');
    incrementCount(flowCounts, row.flowVersion || 'unknown');

    if (row.reasonDetail) comments.push(row.reasonDetail);
    if (row.keepYou) keepRequests.push(row.keepYou);
    if (Number.isFinite(row.satisfactionScore)) scores.push(row.satisfactionScore);
  }

  const averageSatisfaction = scores.length
    ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2))
    : null;

  return {
    total: rows.length,
    averageSatisfaction,
    reasonCounts: topEntries(reasonCounts),
    priorityCounts: topEntries(priorityCounts),
    usageCounts: topEntries(usageCounts),
    sourceCounts: topEntries(sourceCounts),
    flowCounts: topEntries(flowCounts),
    comments: comments.slice(0, 30),
    keepRequests: keepRequests.slice(0, 30),
  };
}

function fallbackActionPlan(summary) {
  const topReason = summary.reasonCounts[0]?.key || 'not_specified';
  const topPriority = summary.priorityCounts[0]?.key || 'not_specified';
  const topUsage = summary.usageCounts[0]?.key || 'not_specified';
  const lowSatisfaction = typeof summary.averageSatisfaction === 'number' && summary.averageSatisfaction <= 3.2;

  return {
    executiveSummary: `Most cancellations are driven by "${topReason}" and users most often ask for "${topPriority}".`,
    actionItems: [
      `Run a focused quality fix sprint for "${topPriority}" and ship at least one measurable change this month.`,
      `Publish a concise product update post to address "${topReason}" and set clear expectations.`,
      `Add in-product guidance for users with usage pattern "${topUsage}" so value is visible earlier.`,
      lowSatisfaction
        ? 'Satisfaction is low: review the full cancellation journey and reduce friction in setup and first use.'
        : 'Maintain quality baseline and monitor whether the top cancellation reasons change next month.',
    ],
    experiments: [
      'A/B test a short onboarding checklist that points to one high-value task on day 1.',
      'Test clearer messaging around what the CA$5 plan includes and does not include.',
      'Track whether lesson recommendations reduce repeat cancellation reasons.',
    ],
  };
}

function generateActionPlan(summary) {
  return fallbackActionPlan(summary);
}

function formatCountLines(rows) {
  if (!rows.length) return '- none';
  return rows.map((item) => `- ${item.key}: ${item.count}`).join('\n');
}

function formatSampleLines(lines, limit = 8) {
  const selected = lines.map((line) => normalizeText(line, 220)).filter(Boolean).slice(0, limit);
  if (!selected.length) return '- none';
  return selected.map((line) => `- ${line}`).join('\n');
}

function buildReportMarkdown({
  monthKey,
  generatedAt,
  siteInfo,
  formName,
  summary,
  actionPlan,
}) {
  const satisfactionLine = typeof summary.averageSatisfaction === 'number'
    ? `${summary.averageSatisfaction}/5`
    : 'not enough data';

  return `# Monthly Cancellation Insights (${monthKey})

- Generated at: ${generatedAt}
- Site: ${siteInfo.name || '(unknown)'} (${siteInfo.id})
- Form: ${formName}
- Total cancellations captured: ${summary.total}
- Average satisfaction before cancel: ${satisfactionLine}

## Top Cancellation Reasons
${formatCountLines(summary.reasonCounts)}

## Top Requested Improvements
${formatCountLines(summary.priorityCounts)}

## Usage Frequency Before Cancel
${formatCountLines(summary.usageCounts)}

## Flow Sources
${formatCountLines(summary.sourceCounts)}

## Representative Reason Notes
${formatSampleLines(summary.comments, 10)}

## What Would Keep Users
${formatSampleLines(summary.keepRequests, 10)}

## Monthly Action Plan
- Summary: ${actionPlan.executiveSummary || 'No AI summary available.'}

### Priority Actions
${formatSampleLines(actionPlan.actionItems || [], 6)}

### Suggested Experiments
${formatSampleLines(actionPlan.experiments || [], 4)}
`;
}

function resolveStateFilePath() {
  const configured = process.env.CANCEL_FEEDBACK_STATE_FILE?.trim() || DEFAULT_STATE_FILE;
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function resolveReportDirPath() {
  const configured = process.env.CANCEL_FEEDBACK_REPORT_DIR?.trim() || DEFAULT_REPORT_DIR;
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

async function loadState(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore
  }

  return { lastReportedMonth: null, lastRunAt: null };
}

async function saveState(filePath, state) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function maybeEmailReport({ subject, text }) {
  const gmailUser = process.env.GMAIL_USER || '';
  const gmailPassword = process.env.GMAIL_PASSWORD || '';
  const reportTo = (process.env.CANCEL_FEEDBACK_REPORT_TO || process.env.GMAIL_USER || '').trim();

  if (!gmailUser || !gmailPassword || !reportTo) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  await transporter.sendMail({
    from: `IELTS Corner <${gmailUser}>`,
    to: reportTo,
    subject,
    text,
  });

  return true;
}

async function main() {
  await loadEnvFiles();
  const options = parseArgs(process.argv);

  const accessToken = process.env.NETLIFY_ACCESS_TOKEN || '';
  const siteId = process.env.NETLIFY_SITE_ID || '';
  const formName = (process.env.CANCEL_FEEDBACK_FORM_NAME || DEFAULT_FORM_NAME).trim();
  const monthKey = options.month || getPreviousMonthKey();
  const stateFile = resolveStateFilePath();
  const reportDir = resolveReportDirPath();
  const state = await loadState(stateFile);

  if (!accessToken || !siteId) {
    throw new Error('Missing NETLIFY_ACCESS_TOKEN and/or NETLIFY_SITE_ID');
  }

  if (!options.force && state.lastReportedMonth === monthKey) {
    console.log(`[info] Month ${monthKey} is already reported. Use --force to regenerate.`);
    return;
  }

  const siteInfo = await getNetlifySiteInfo({ siteId, accessToken });
  const formMatch = await getNetlifyFormMatch({ siteId, accessToken, formName });

  if (!formMatch.formId) {
    const available = formMatch.availableFormNames.length
      ? formMatch.availableFormNames.join(', ')
      : '(none found)';
    throw new Error(`Cancellation feedback form "${formName}" not found. Available forms: ${available}`);
  }

  const { start, end } = getMonthRange(monthKey);
  const allSubmissions = await getFormSubmissions({ formId: formMatch.formId, accessToken, maxPages: 40, perPage: 100 });
  const normalizedRows = allSubmissions
    .map(normalizeSubmission)
    .filter(Boolean)
    .filter((row) => row.createdDate >= start && row.createdDate < end);

  const summary = summarizeData(normalizedRows);
  let actionPlan = fallbackActionPlan(summary);

  try {
    actionPlan = generateActionPlan(summary);
  } catch (error) {
    console.log(`[warn] AI action plan unavailable. Using fallback plan. Reason: ${error.message}`);
  }

  const generatedAt = new Date().toISOString();
  const reportText = buildReportMarkdown({
    monthKey,
    generatedAt,
    siteInfo,
    formName: formMatch.formName || formName,
    summary,
    actionPlan,
  });

  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${monthKey}.md`);
  await writeFile(reportPath, `${reportText}\n`, 'utf8');

  console.log(`[info] Site: ${siteInfo.name || '(unknown)'} (${siteInfo.id})`);
  console.log(`[info] Form used: ${formMatch.formName || formName} (${formMatch.formId})`);
  console.log(`[info] Submissions analyzed for ${monthKey}: ${summary.total}`);
  console.log(`[info] Report saved: ${reportPath}`);

  if (!options.dryRun) {
    const emailed = await maybeEmailReport({
      subject: `IELTS Corner monthly cancellation insights (${monthKey})`,
      text: reportText,
    });

    await saveState(stateFile, {
      lastReportedMonth: monthKey,
      lastRunAt: generatedAt,
      lastSubmissionCount: summary.total,
      emailedReport: emailed,
    });

    console.log(`[ok] Monthly cancellation insights complete. Email sent: ${emailed ? 'yes' : 'no'}`);
  } else {
    console.log('[dry-run] State file not updated.');
  }

  console.log('\n----- REPORT START -----\n');
  console.log(reportText);
  console.log('\n----- REPORT END -----\n');
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
});
