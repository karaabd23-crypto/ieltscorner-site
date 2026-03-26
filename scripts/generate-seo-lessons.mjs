#!/usr/bin/env node
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const LESSON_DIR = path.resolve("src/content/lessons");

const IELTS_TOPICS = [
  { skill: "writing", level: "B2", title: "IELTS Task 2 Opinion Essay Framework", description: "Build a clear opinion essay with strong paragraph control and examiner-friendly logic." },
  { skill: "writing", level: "B2", title: "IELTS Task 2 Discussion Essay Structure", description: "Handle both views and your position without losing coherence." },
  { skill: "writing", level: "C1", title: "IELTS Task 2 Problem Solution Response Blueprint", description: "Present problems and solutions with precise linking and relevant support." },
  { skill: "writing", level: "B2", title: "IELTS Task 1 Academic Overview Sentences", description: "Write accurate overview statements that capture key chart trends." },
  { skill: "writing", level: "B2", title: "IELTS Task 1 Data Comparison Language", description: "Compare data clearly using high-scoring comparative structures." },
  { skill: "writing", level: "C1", title: "IELTS Cohesion Techniques for Band 7+", description: "Improve flow with references, connectors, and paragraph control." },
  { skill: "writing", level: "B2", title: "IELTS Grammar Accuracy Under Time Pressure", description: "Reduce grammar errors when writing quickly in exam conditions." },
  { skill: "writing", level: "C1", title: "IELTS Lexical Resource Upgrade Plan", description: "Use precise vocabulary naturally without forcing memorized phrases." },
  { skill: "speaking", level: "B2", title: "IELTS Speaking Part 1 High-Score Answer Pattern", description: "Deliver natural Part 1 answers with clear expansion and vocabulary control." },
  { skill: "speaking", level: "B2", title: "IELTS Speaking Part 2 Story Development Strategy", description: "Plan and deliver a two-minute cue card response with confidence." },
  { skill: "speaking", level: "C1", title: "IELTS Speaking Part 3 Argument Depth Technique", description: "Build deeper answers with examples, contrast, and precise reasoning." },
  { skill: "speaking", level: "B2", title: "IELTS Fluency and Coherence Repair Methods", description: "Stay fluent when ideas pause by using controlled recovery language." },
  { skill: "speaking", level: "B2", title: "IELTS Pronunciation Clarity for Band 7", description: "Improve intonation and stress to increase speaking clarity and confidence." },
  { skill: "speaking", level: "C1", title: "IELTS Speaking Grammar Range Without Risk", description: "Use complex grammar safely in live speaking responses." },
  { skill: "reading", level: "B2", title: "IELTS Reading True False Not Given Logic", description: "Use evidence mapping to avoid common T/F/NG traps." },
  { skill: "reading", level: "B2", title: "IELTS Matching Headings Fast-Scan Method", description: "Identify paragraph purpose quickly to choose headings accurately." },
  { skill: "reading", level: "B2", title: "IELTS Sentence Completion Precision Skills", description: "Find exact words and avoid grammar mismatch errors." },
  { skill: "reading", level: "C1", title: "IELTS Reading Time Management for 40 Questions", description: "Control pace section by section and protect final-question accuracy." },
  { skill: "reading", level: "B2", title: "IELTS Multiple Choice Elimination Strategy", description: "Eliminate distractors with keyword and meaning checks." },
  { skill: "reading", level: "C1", title: "IELTS Paragraph Mapping for Academic Passages", description: "Build passage maps that speed up answer location and verification." },
  { skill: "listening", level: "B2", title: "IELTS Listening Distractor Detection System", description: "Recognize correction language and avoid first-answer traps." },
  { skill: "listening", level: "B2", title: "IELTS Note-Taking Symbols for Section Speed", description: "Capture key details quickly with a practical shorthand system." },
  { skill: "listening", level: "B2", title: "IELTS Map and Diagram Listening Strategy", description: "Track movement language and location clues accurately." },
  { skill: "listening", level: "C1", title: "IELTS Lecture Listening Structure Prediction", description: "Predict lecture flow to improve Section 4 answer accuracy." },
  { skill: "listening", level: "B2", title: "IELTS Spelling and Number Accuracy Drills", description: "Improve detail accuracy in names, addresses, dates, and prices." },
];

const CELPIP_TOPICS = [
  { skill: "writing", level: "B2", title: "CELPIP Task 1 Email Structure for CLB 9", description: "Write complete, organized email responses that cover every prompt point." },
  { skill: "writing", level: "B2", title: "CELPIP Task 1 Tone Control in Formal Emails", description: "Match tone and register correctly for complaint and request emails." },
  { skill: "writing", level: "B2", title: "CELPIP Task 2 Opinion Paragraph System", description: "Build clear opinion responses with reasons and focused support." },
  { skill: "writing", level: "C1", title: "CELPIP Task 2 Survey Response Coherence Plan", description: "Improve organization and transition quality for higher writing scores." },
  { skill: "writing", level: "B2", title: "CELPIP Writing Prompt Analysis in 60 Seconds", description: "Decode prompt requirements quickly before writing begins." },
  { skill: "writing", level: "B2", title: "CELPIP Writing Grammar Checklist for CLB 9", description: "Use a practical grammar review system before final submission." },
  { skill: "writing", level: "C1", title: "CELPIP Writing Sentence Variety Without Errors", description: "Increase range while keeping clarity and grammatical accuracy." },
  { skill: "writing", level: "B2", title: "CELPIP Writing Task Timing Allocation Strategy", description: "Split planning, writing, and review time for better completion quality." },
  { skill: "writing", level: "C1", title: "CELPIP Writing Vocabulary Upgrade for Score Bands", description: "Use precise words and collocations to strengthen lexical quality." },
  { skill: "writing", level: "B2", title: "CELPIP Writing Revision Routine for High Scores", description: "Apply a fast revision pass that catches common scoring mistakes." },
  { skill: "speaking", level: "B2", title: "CELPIP Speaking Task 1 Advice Structure", description: "Deliver organized advice with clear sequencing and useful language." },
  { skill: "speaking", level: "B2", title: "CELPIP Speaking Task 2 Storytelling Control", description: "Tell personal experience stories with beginning-middle-end clarity." },
  { skill: "speaking", level: "B2", title: "CELPIP Speaking Task 3 Scene Description Precision", description: "Describe scenes quickly with specific details and logical order." },
  { skill: "speaking", level: "C1", title: "CELPIP Speaking Task 4 Prediction Language", description: "Make predictions with confidence and clear supporting logic." },
  { skill: "speaking", level: "B2", title: "CELPIP Speaking Task 5 Comparison Framework", description: "Compare choices and justify recommendations with strong structure." },
  { skill: "speaking", level: "B2", title: "CELPIP Speaking Task 6 Difficult Situation Response", description: "Respond calmly with empathy, structure, and actionable advice." },
  { skill: "speaking", level: "C1", title: "CELPIP Speaking Task 7 Opinion Depth Strategy", description: "Develop opinion answers with clear reasons and balanced ideas." },
  { skill: "reading", level: "B2", title: "CELPIP Reading Keyword to Evidence Matching", description: "Find proof quickly and avoid keyword-only answer mistakes." },
  { skill: "reading", level: "B2", title: "CELPIP Reading Time Control by Question Type", description: "Allocate reading time based on task difficulty and scoring impact." },
  { skill: "reading", level: "B2", title: "CELPIP Reading Inference Question Strategy", description: "Infer meaning accurately from context and supporting details." },
  { skill: "reading", level: "C1", title: "CELPIP Reading Paragraph Purpose Recognition", description: "Identify writer purpose to improve difficult comprehension items." },
  { skill: "listening", level: "B2", title: "CELPIP Listening Note Capture Under Pressure", description: "Capture essential details while keeping pace with audio speed." },
  { skill: "listening", level: "B2", title: "CELPIP Listening Speaker Intention Signals", description: "Recognize tone and intention clues that drive correct answers." },
  { skill: "listening", level: "B2", title: "CELPIP Listening Recovery After Missed Detail", description: "Recover quickly after missing a point without losing the next answer." },
  { skill: "listening", level: "C1", title: "CELPIP Listening Prediction Before Audio Starts", description: "Predict likely content before each section to increase accuracy." },
];

const LEVEL_MAP = {
  B2: { ieltsBand: "6.0-6.5", clb: "7-8" },
  C1: { ieltsBand: "7.0-8.0", clb: "9-10" },
  B1: { ieltsBand: "5.0-6.0", clb: "6-7" },
};

const parseArgs = (argv) => ({
  overwrite: argv.includes("--overwrite"),
  dryRun: argv.includes("--dry-run"),
});

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const escapeYaml = (value) => String(value).replace(/"/g, '\\"');

const buildBody = ({ test, skill, title }) => `## Intro
${title} is designed for ${test} candidates who want faster score growth through structured practice and feedback.

## Examiner Criteria
- Task response: address the prompt fully with clear purpose.
- Coherence and organization: sequence ideas logically with controlled transitions.
- Grammar and vocabulary: maintain accuracy while using flexible language.

## Common Mistakes
- Writing without a clear structure before starting.
- Repeating simple grammar patterns and making avoidable agreement errors.
- Finishing practice tasks without external feedback.

## Strategy
1. Spend two minutes planning your response outline.
2. Use one main idea per paragraph with direct support.
3. Reserve final minutes for grammar and clarity edits.

## Example
Weak sentence: "People have many problem and government should fix quickly."

Improved sentence: "Many communities face recurring housing problems, so local governments should introduce targeted rental support programs."

## Exercise
1. Write a short response using this lesson's structure.
2. Underline one grammar risk and rewrite it correctly.
3. Compare your final version with the examiner criteria above.`;

const renderLesson = ({ test, skill, title, description, level, date, index }) => {
  const scoreInfo = LEVEL_MAP[level] ?? LEVEL_MAP.B2;
  const category = skill;
  const slug = `seo-${date}-${String(index + 1).padStart(2, "0")}-${slugify(`${test} ${skill} ${title}`)}`;

  const frontmatter = `---
test: "${test}"
skill: "${skill}"
title: "${escapeYaml(title)}"
description: "${escapeYaml(description)}"
category: "${category}"
level: "${level}"
ieltsBand: "${scoreInfo.ieltsBand}"
clb: "${scoreInfo.clb}"
exam: ["${test}"]
excerpt: "${escapeYaml(description)}"
date: "${date}"
tags: ["${skill}", "${test.toLowerCase()}", "seo", "exam-prep"]
draft: false
---
`;

  return { slug, content: `${frontmatter}\n${buildBody({ test, skill, title })}\n` };
};

const ensureDoesNotExist = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  const date = new Date().toISOString().slice(0, 10);
  const lessonSpecs = [
    ...IELTS_TOPICS.map((item) => ({ test: "IELTS", ...item })),
    ...CELPIP_TOPICS.map((item) => ({ test: "CELPIP", ...item })),
  ];

  if (lessonSpecs.length !== 50) {
    throw new Error(`Expected 50 lesson specs, received ${lessonSpecs.length}.`);
  }

  await mkdir(LESSON_DIR, { recursive: true });

  let created = 0;
  let skipped = 0;

  for (const [index, lessonSpec] of lessonSpecs.entries()) {
    const lesson = renderLesson({ ...lessonSpec, date, index });
    const filePath = path.join(LESSON_DIR, `${lesson.slug}.md`);
    const exists = await ensureDoesNotExist(filePath);

    if (exists && !opts.overwrite) {
      skipped += 1;
      continue;
    }

    if (!opts.dryRun) {
      await writeFile(filePath, lesson.content, "utf8");
    }

    created += 1;
  }

  console.log(`SEO lesson generation complete. Created: ${created}. Skipped: ${skipped}. Total target: 50.`);
  if (opts.dryRun) {
    console.log("Dry run mode enabled: no files were written.");
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
