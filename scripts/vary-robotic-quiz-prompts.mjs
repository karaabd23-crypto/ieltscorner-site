// One-off maintenance script: de-duplicate the machine-generated quiz prompts
// that are repeated verbatim across ~146 root lesson .md files. These identical
// prompts ("What should you check first when editing <Title>?" etc.) are a
// strong low-effort / unhelpful-content signal for Google and read as robotic.
//
// SAFETY: This ONLY rewrites the `prompt:` text. It never touches `options:`,
// `correctIndex:`, `explanation:`, or any body content, so every quiz answer
// stays correct. Run with --apply to write; default is a dry run that prints a
// summary and a sample diff.
//
//   node scripts/vary-robotic-quiz-prompts.mjs           (dry run)
//   node scripts/vary-robotic-quiz-prompts.mjs --apply   (write changes)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, "..", "src", "content", "lessons");
const APPLY = process.argv.includes("--apply");

// A deterministic picker so reruns are stable: choose a variant by hashing the
// file name, not at random. Keeps the build reproducible.
const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// Each rule matches a templated prompt and offers natural rephrasings. `$1` is
// the captured lesson-topic phrase. Options/answers are unaffected, so the
// rephrasings must remain answerable by the SAME option set.
const rules = [
  {
    name: "check-first",
    re: /^(\s*- prompt:\s*")What should you check first when editing (.+?)\?(")/,
    variants: (topic) => [
      `Before you fix ${topic} in your answer, what comes first?`,
      `When you review ${topic}, what should you look at before anything else?`,
      `What is the first thing to settle when you work on ${topic}?`,
      `Editing ${topic}: where should you start?`,
    ],
  },
  {
    name: "which-sentence-correct",
    re: /^(\s*- prompt:\s*")Which sentence uses (.+?) correctly\?(")/,
    variants: (topic) => [
      `Which sentence handles ${topic} the right way?`,
      `Which option shows ${topic} used correctly?`,
      `Pick the sentence that gets ${topic} right.`,
      `Which version uses ${topic} accurately?`,
    ],
  },
  {
    name: "which-edit-fixes",
    re: /^(\s*- prompt:\s*")Which edit fixes a common (.+?) mistake\?(")/,
    variants: (topic) => [
      `Which edit repairs a typical ${topic} error?`,
      `Which change fixes a frequent ${topic} mistake?`,
      `Which correction solves a common ${topic} slip?`,
      `Which fix addresses a usual ${topic} error?`,
    ],
  },
];

const files = readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".md"));
let changedFiles = 0;
let changedPrompts = 0;
let sampleDiff = null;

for (const file of files) {
  const path = join(LESSONS_DIR, file);
  const original = readFileSync(path, "utf8");
  const lines = original.split("\n");
  let fileChanged = false;

  const newLines = lines.map((line, idx) => {
    for (const rule of rules) {
      const m = line.match(rule.re);
      if (m) {
        const [, pre, topic, post] = m;
        const options = rule.variants(topic);
        // Vary by file+rule+line so the three prompts in one file differ too.
        const choice = options[hash(file + rule.name + idx) % options.length];
        const replaced = `${pre}${choice}${post}`;
        if (replaced !== line) {
          fileChanged = true;
          changedPrompts++;
          if (!sampleDiff) {
            sampleDiff = { file, before: line.trim(), after: replaced.trim() };
          }
        }
        return replaced;
      }
    }
    return line;
  });

  if (fileChanged) {
    changedFiles++;
    if (APPLY) writeFileSync(path, newLines.join("\n"), "utf8");
  }
}

console.log(`Mode: ${APPLY ? "APPLY (files written)" : "DRY RUN (no changes written)"}`);
console.log(`Files scanned: ${files.length}`);
console.log(`Files changed: ${changedFiles}`);
console.log(`Prompts rewritten: ${changedPrompts}`);
if (sampleDiff) {
  console.log(`\nSample (${sampleDiff.file}):`);
  console.log(`  - ${sampleDiff.before}`);
  console.log(`  + ${sampleDiff.after}`);
}
