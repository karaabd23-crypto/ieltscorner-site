import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const memoryDir = path.join(repoRoot, 'memory');
const outputJsonPath = path.join(memoryDir, 'session-catalog.json');
const outputMdPath = path.join(memoryDir, 'session-catalog.md');

const homeDir = process.env.USERPROFILE || os.homedir();
const appDataDir = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');

const codexRoot = path.join(homeDir, '.codex');
const codexSessionIndexPath = path.join(codexRoot, 'session_index.jsonl');
const codexSessionsRoot = path.join(codexRoot, 'sessions');
const vscodeWorkspaceStorageRoot = path.join(appDataDir, 'Code', 'User', 'workspaceStorage');

const IGNORED_VSCODE_VALUE_KINDS = new Set([
  'thinking',
  'toolInvocationSerialized',
  'codeblockUri',
  'undoStop',
  'inlineReference',
  'textEditGroup',
]);

const command = process.argv[2] || 'sync';

if (command === 'show') {
  await showSession(process.argv.slice(3).join(' ').trim());
} else {
  await syncCatalog();
}

async function syncCatalog() {
  const codexSessionIndex = await readJsonlFile(codexSessionIndexPath);
  const codexIndexById = new Map(
    codexSessionIndex
      .filter((entry) => entry && entry.id)
      .map((entry) => [entry.id, entry]),
  );

  const [codexFiles, vscodeFiles] = await Promise.all([
    findJsonlFiles(codexSessionsRoot),
    findVsCodeChatSessionFiles(vscodeWorkspaceStorageRoot),
  ]);

  const [codexSessions, vscodeSessions] = await Promise.all([
    Promise.all(codexFiles.map((filePath) => parseCodexSession(filePath, codexIndexById))),
    Promise.all(vscodeFiles.map((filePath) => parseVsCodeChatSession(filePath))),
  ]);

  const sessions = [...codexSessions, ...vscodeSessions]
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));

  const catalog = {
    generatedAt: new Date().toISOString(),
    sources: {
      codex: {
        root: codexRoot,
        sessionsRoot: codexSessionsRoot,
        sessionIndex: codexSessionIndexPath,
      },
      vscode: {
        workspaceStorageRoot: vscodeWorkspaceStorageRoot,
      },
    },
    counts: {
      total: sessions.length,
      codex: sessions.filter((session) => session.source === 'codex').length,
      vscode: sessions.filter((session) => session.source === 'vscode-chat').length,
    },
    sessions,
  };

  await fs.mkdir(memoryDir, { recursive: true });
  await Promise.all([
    fs.writeFile(outputJsonPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8'),
    fs.writeFile(outputMdPath, renderCatalogMarkdown(catalog), 'utf8'),
  ]);

  console.log(
    `Wrote ${catalog.counts.total} sessions to ${outputJsonPath} and ${outputMdPath}`,
  );
}

async function showSession(query) {
  if (!query) {
    console.error('Usage: node scripts/session-catalog.mjs show <session-id-or-title-fragment>');
    process.exitCode = 1;
    return;
  }

  const catalog = await loadCatalog();
  const loweredQuery = query.toLowerCase();
  const matches = catalog.sessions.filter((session) =>
    [
      session.id,
      session.title,
      session.initialPrompt,
      session.finalAnswer,
      session.filePath,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(loweredQuery)),
  );

  if (!matches.length) {
    console.error(`No session matched "${query}".`);
    process.exitCode = 1;
    return;
  }

  for (const session of matches.slice(0, 10)) {
    console.log(`Source: ${session.source}`);
    console.log(`Title: ${session.title || '(untitled)'}`);
    console.log(`ID: ${session.id}`);
    console.log(`Created: ${session.createdAt || 'unknown'}`);
    console.log(`Updated: ${session.updatedAt || 'unknown'}`);
    console.log(`Path: ${session.filePath}`);
    if (session.cwd) console.log(`CWD: ${session.cwd}`);
    if (session.initialPrompt) console.log(`Prompt: ${session.initialPrompt}`);
    if (session.finalAnswer) console.log(`Final: ${session.finalAnswer}`);
    console.log('');
  }
}

async function loadCatalog() {
  try {
    const raw = await fs.readFile(outputJsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    await syncCatalog();
    const raw = await fs.readFile(outputJsonPath, 'utf8');
    return JSON.parse(raw);
  }
}

async function parseCodexSession(filePath, indexById) {
  const entries = await readJsonlFile(filePath);
  if (!entries.length) return null;

  const meta = entries.find((entry) => entry?.type === 'session_meta')?.payload || {};
  const sessionId = meta.id || path.basename(filePath, '.jsonl');
  const indexEntry = indexById.get(sessionId) || {};

  const timestamps = entries
    .map((entry) => entry?.timestamp)
    .filter(Boolean);

  const userMessages = entries
    .filter(
      (entry) =>
        entry?.type === 'response_item' &&
        entry?.payload?.type === 'message' &&
        entry?.payload?.role === 'user',
    )
    .map((entry) => extractCodexMessageText(entry.payload.content))
    .map((text) => normalizeWhitespace(text))
    .filter((text) => text && !text.startsWith('<environment_context>'));

  const finalAnswers = entries
    .filter(
      (entry) =>
        entry?.type === 'event_msg' &&
        entry?.payload?.type === 'agent_message' &&
        entry?.payload?.phase === 'final_answer',
    )
    .map((entry) => normalizeWhitespace(entry.payload.message))
    .filter(Boolean);

  return {
    source: 'codex',
    id: sessionId,
    title: indexEntry.thread_name || sessionId,
    createdAt: meta.timestamp || timestamps[0] || null,
    updatedAt: indexEntry.updated_at || timestamps.at(-1) || null,
    cwd: meta.cwd || null,
    initialPrompt: clipText(userMessages[0] || ''),
    finalAnswer: clipText(finalAnswers.at(-1) || ''),
    filePath,
  };
}

async function parseVsCodeChatSession(filePath) {
  const entries = await readJsonlFile(filePath);
  if (!entries.length) return null;

  const firstEntry = entries.find((entry) => entry?.kind === 0)?.v || {};
  const creationDate = firstEntry.creationDate ? new Date(firstEntry.creationDate).toISOString() : null;
  const title =
    entries.find((entry) => Array.isArray(entry?.k) && entry.k.join('.') === 'customTitle')?.v ||
    firstEntry.sessionId ||
    path.basename(filePath, '.jsonl');

  const inputTexts = [
    firstEntry?.inputState?.inputText,
    ...entries
      .filter((entry) => Array.isArray(entry?.k) && entry.k.join('.') === 'inputState.inputText')
      .map((entry) => entry.v),
  ]
    .map((text) => normalizeWhitespace(text))
    .filter(Boolean);

  const assistantValues = [];
  for (const entry of entries) {
    if (Array.isArray(entry?.k) && entry.k[0] === 'requests') {
      collectVsCodeResponseValues(entry.v, assistantValues);
    }
  }

  const stat = await fs.stat(filePath);

  return {
    source: 'vscode-chat',
    id: firstEntry.sessionId || path.basename(filePath, '.jsonl'),
    title,
    createdAt: creationDate,
    updatedAt: stat.mtime.toISOString(),
    cwd: null,
    initialPrompt: clipText(inputTexts[0] || ''),
    finalAnswer: clipText(findLastUsefulAssistantValue(assistantValues)),
    filePath,
  };
}

function collectVsCodeResponseValues(node, values) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) collectVsCodeResponseValues(item, values);
    return;
  }

  if (typeof node !== 'object') return;

  if (
    typeof node.value === 'string' &&
    node.value.trim() &&
    !IGNORED_VSCODE_VALUE_KINDS.has(node.kind || '')
  ) {
    values.push(normalizeWhitespace(node.value));
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      collectVsCodeResponseValues(value, values);
    }
  }
}

function findLastUsefulAssistantValue(values) {
  return (
    [...values]
      .reverse()
      .find(
        (value) =>
          value &&
          value.length > 40 &&
          !value.startsWith('Reading [](') &&
          !value.startsWith('Generating patch') &&
          !value.startsWith('Created ') &&
          !value.startsWith('Completed: '),
      ) || ''
  );
}

function extractCodexMessageText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => item?.text || '')
    .join('\n')
    .trim();
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipText(text, maxLength = 220) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

async function findJsonlFiles(rootDir) {
  return walkFiles(rootDir, (filePath) => filePath.endsWith('.jsonl'));
}

async function findVsCodeChatSessionFiles(rootDir) {
  const result = [];
  for (const storageDir of await safeReadDir(rootDir)) {
    if (!storageDir.isDirectory()) continue;
    const chatDir = path.join(rootDir, storageDir.name, 'chatSessions');
    for (const filePath of await walkFiles(chatDir, (file) => file.endsWith('.jsonl'))) {
      result.push(filePath);
    }
  }
  return result;
}

async function walkFiles(rootDir, predicate) {
  const result = [];
  for (const entry of await safeReadDir(rootDir)) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(fullPath, predicate)));
    } else if (entry.isFile() && predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

async function safeReadDir(dirPath) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readJsonlFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function renderCatalogMarkdown(catalog) {
  const sections = [
    '# Session Catalog',
    '',
    `Generated: ${catalog.generatedAt}`,
    '',
    '## Counts',
    '',
    `- Total: ${catalog.counts.total}`,
    `- Codex: ${catalog.counts.codex}`,
    `- VS Code chat: ${catalog.counts.vscode}`,
    '',
    '## Sessions',
    '',
  ];

  for (const session of catalog.sessions) {
    sections.push(`### ${session.title || '(untitled)'}`);
    sections.push(`- Source: ${session.source}`);
    sections.push(`- ID: ${session.id}`);
    sections.push(`- Created: ${session.createdAt || 'unknown'}`);
    sections.push(`- Updated: ${session.updatedAt || 'unknown'}`);
    if (session.cwd) sections.push(`- CWD: ${session.cwd}`);
    if (session.initialPrompt) sections.push(`- Prompt: ${session.initialPrompt}`);
    if (session.finalAnswer) sections.push(`- Final: ${session.finalAnswer}`);
    sections.push(`- File: ${session.filePath}`);
    sections.push('');
  }

  return `${sections.join('\n')}\n`;
}
