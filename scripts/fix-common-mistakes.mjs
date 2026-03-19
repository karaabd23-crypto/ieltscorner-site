#!/usr/bin/env node
/**
 * fix-common-mistakes.mjs
 *
 * Fixes two categories of cloned "Common Mistakes" blocks:
 *
 * TYPE A (13 speaking files) — The "Weak" examples are content-free filler
 *   (e.g., "Well, there are many sides..."). Replace the 3 generic cards with
 *   lesson-specific speaking errors tied to the actual lesson topic.
 *
 * TYPE B (47 writing/grammar files) — The 3 Common Mistakes cards are about
 *   generic "essay planning / transit funding" content. Replace with cards
 *   that target the actual grammar or writing skill in each lesson.
 *
 * Usage:
 *   node scripts/fix-common-mistakes.mjs [--dry-run]
 *
 * By default the script writes changes in-place. Pass --dry-run to see a list
 * of what would change without touching files.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LESSON_DIR = path.resolve('src/content/lessons');
const DRY_RUN = process.argv.includes('--dry-run');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build the HTML for a 3-card Common Mistakes grid
// ─────────────────────────────────────────────────────────────────────────────
function buildErrorGrid(cards) {
  const cardHtml = cards
    .map(
      ({ label, problem, weak, strong, fix }, i) => `<article class="lesson-error-card">
  <p class="lesson-card-label">Common problem ${i + 1}</p>
  <h3>${problem}</h3>
  <p class="lesson-line lesson-line-weak"><span>Weak</span>${weak}</p>
  <p class="lesson-line lesson-line-strong"><span>Strong</span>${strong}</p>
  <p class="lesson-fix-line"><strong>Fix:</strong> ${fix}</p>
</article>`,
    )
    .join('\n');

  return `## Common Mistakes\n<div class="lesson-error-grid">\n${cardHtml}\n</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE A — SPEAKING LESSONS (13 files)
// Every "Weak" example is pure filler with no content to improve. We replace
// the 3 cards with patterns specific to each lesson's actual speaking task.
// ─────────────────────────────────────────────────────────────────────────────

// Cards keyed by the *base slug* (without the -b1/-b2/-c1 suffix)
// Each entry is a function(level) → [card, card, card] so we can
// write slightly different examples by proficiency when needed.

const SPEAKING_CARDS = {
  'celpip-task1-experience': () => [
    {
      problem: 'opening with a vague comment instead of a direct answer',
      weak: 'Well, there are many sides to this experience and it is hard to say.',
      strong: 'My most memorable experience was working abroad for three months.',
      fix: 'Name the specific experience in your first sentence — do not delay.',
    },
    {
      problem: 'using empty filler phrases to buy time',
      weak: 'Like, you know, it is good because it is good for people.',
      strong: 'That job taught me to solve unexpected problems without panicking.',
      fix: 'Replace fillers with one concrete detail: a place, action, or result.',
    },
    {
      problem: 'ending with a trailing-off phrase instead of a clear close',
      weak: 'So yes, maybe, that is my idea.',
      strong: 'That experience shaped the way I handle challenges today.',
      fix: 'Prepare one short closing sentence that links back to how the experience matters.',
    },
  ],

  'celpip-task2-opinion': () => [
    {
      problem: 'hedging instead of stating your opinion directly',
      weak: 'Well, there are many sides to this question and it is hard to say.',
      strong: 'In my opinion, remote work is better for employees with long commutes.',
      fix: 'State your opinion clearly in the first sentence using "I think" or "In my opinion".',
    },
    {
      problem: 'giving circular reasons with no real content',
      weak: 'Like, you know, it is good because it is good for people.',
      strong: 'Remote work reduces commute stress, which improves focus during work hours.',
      fix: 'Replace the circular reason with a cause-and-effect chain: [change] → [specific benefit].',
    },
    {
      problem: 'finishing without a statement that closes your opinion',
      weak: 'So yes, maybe, that is my idea.',
      strong: 'That is why I believe this option leads to better outcomes overall.',
      fix: 'End with one sentence that restates your opinion in different words.',
    },
  ],

  'celpip-task3-interview': () => [
    {
      problem: 'stalling before giving a direct answer',
      weak: 'Well, there are many sides to this question and it is hard to say.',
      strong: 'I would choose the outdoor option because fresh air helps me focus.',
      fix: 'Answer the question directly in your opening sentence — pick a side.',
    },
    {
      problem: 'using vague filler instead of a real reason',
      weak: 'Like, you know, it is good because it is good for people.',
      strong: 'A shorter daily commute gives me an extra hour for exercise each morning.',
      fix: 'State one specific, personal reason — something observable or measurable.',
    },
    {
      problem: 'ending the turn with an unfinished-sounding phrase',
      weak: 'So yes, maybe, that is my idea.',
      strong: 'So that is why this choice fits my lifestyle better.',
      fix: 'Close with one confirming sentence that refers back to your reason.',
    },
  ],

  'paraphrasing-speaking': () => [
    {
      problem: 'repeating the question word-for-word instead of paraphrasing',
      weak: 'The question says we should talk about whether technology is good or bad.',
      strong: 'I will discuss the advantages and drawbacks of modern technology.',
      fix: 'Replace key nouns and verbs with synonyms — do not echo the question text.',
    },
    {
      problem: 'paraphrasing by only deleting words, leaving the sentence broken',
      weak: 'Technology is... good because... helps people a lot.',
      strong: 'Digital tools have transformed how people communicate and learn.',
      fix: 'Write a new sentence from scratch using the same idea in different words.',
    },
    {
      problem: 'using unnatural or overly formal vocabulary that sounds memorised',
      weak: 'The aforementioned technology is profoundly beneficial for all inhabitants.',
      strong: 'Technology benefits most people in their daily lives.',
      fix: 'Choose words you would say naturally — natural phrasing scores higher than memorised phrases.',
    },
  ],

  'topic-management': () => [
    {
      problem: 'changing the topic mid-answer without a clear transition',
      weak: 'I like reading. Also cooking is good. My city has parks.',
      strong: 'Reading helps me relax; similarly, cooking gives me a creative outlet at home.',
      fix: 'Finish one idea before introducing the next and use a linking phrase to connect them.',
    },
    {
      problem: 'losing the original question after the first sentence',
      weak: 'So, there are many things to say. And yes, it is hard to choose.',
      strong: 'Returning to the question — I think public parks matter most for families.',
      fix: 'After each supporting point, check that your sentence still relates to the question topic.',
    },
    {
      problem: 'piling up unconnected points without linking them',
      weak: 'And also there is this. And one more thing. And in addition also.',
      strong: 'First, traffic improves. As a result, fewer accidents happen downtown.',
      fix: 'Use one logical linker (because, so, however, as a result) between each pair of ideas.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE B — WRITING / GRAMMAR LESSONS (47 files)
// Cards keyed by the base slug (without level suffix).
// ─────────────────────────────────────────────────────────────────────────────

const WRITING_CARDS = {
  'active-voice-writing': () => [
    {
      problem: 'using passive voice when the doer is clear and important',
      weak: 'The report was written by the manager and it was sent to the team.',
      strong: 'The manager wrote the report and sent it to the team.',
      fix: 'If you know who does the action and it matters, put the doer first.',
    },
    {
      problem: 'stacking multiple passive verbs in one sentence',
      weak: 'Errors are found, they are reported, and then they are fixed by staff.',
      strong: 'Staff find errors, report them, and fix them the same day.',
      fix: 'Rebuild the sentence with one clear subject doing all the actions.',
    },
    {
      problem: 'choosing passive voice to sound formal and ending up vague',
      weak: 'Improvements have been made and results have been achieved.',
      strong: 'The team improved the process and reduced errors by 30%.',
      fix: 'Add a real subject and a measurable result — specificity reads as confident, not casual.',
    },
  ],

  'avoiding-repetition': () => [
    {
      problem: 'repeating the exact same noun in every sentence',
      weak: 'Education is important. Education helps people. Education creates opportunities.',
      strong: 'Education is important because it helps people and creates new opportunities.',
      fix: 'Combine repeated ideas into one sentence or replace the noun with a pronoun or synonym.',
    },
    {
      problem: 'using a pronoun whose reference is ambiguous',
      weak: 'Teachers help students because they know the subject.',
      strong: 'Teachers help students because teachers have specialised subject knowledge.',
      fix: 'If two nouns could match the pronoun, replace it with the exact noun you mean.',
    },
    {
      problem: 'echoing the task question word-for-word instead of paraphrasing',
      weak: 'Some people think that technology is good. Do you agree that technology is good?',
      strong: 'Some people argue that technology benefits society. I largely agree with this view.',
      fix: 'Paraphrase the question using synonyms and a different sentence structure.',
    },
  ],

  'comma-usage': () => [
    {
      problem: 'missing a comma after an introductory clause or phrase',
      weak: 'Although the deadline was close the team finished on time.',
      strong: 'Although the deadline was close, the team finished on time.',
      fix: 'Place a comma after any introductory clause (although, because, when, if…) before the main clause.',
    },
    {
      problem: 'using a comma instead of a semicolon to join two full sentences',
      weak: 'The results were positive, the team decided to continue.',
      strong: 'The results were positive; the team decided to continue.',
      fix: 'Two independent clauses need a semicolon, a conjunction (and, but, so), or a full stop — not a comma alone.',
    },
    {
      problem: 'adding an unnecessary comma between the subject and its verb',
      weak: 'The students who studied the hardest, passed the exam.',
      strong: 'The students who studied the hardest passed the exam.',
      fix: 'Do not put a comma between the subject and the main verb — even if the subject is long.',
    },
  ],

  'essay-body-paragraphs': () => [
    {
      problem: 'writing a body paragraph without a clear topic sentence',
      weak: 'There are many things to consider. People have different views. Some agree, others do not.',
      strong: 'One reason people prefer online learning is the flexibility it offers.',
      fix: 'Begin every body paragraph with one sentence that states its single main idea.',
    },
    {
      problem: 'adding a supporting point without an explanation or example',
      weak: 'Online learning is flexible. Many people use it.',
      strong: 'Online learning is flexible: students can pause and replay lectures, which suits different learning speeds.',
      fix: 'Follow each supporting point with a because, for example, or consequence explanation.',
    },
    {
      problem: 'introducing a new topic inside a paragraph that already has one',
      weak: 'Online learning is flexible. Also, it is cheaper. And teachers can use technology.',
      strong: 'Online learning is flexible and cheaper than traditional courses, making it accessible to more students.',
      fix: 'Keep each paragraph focused on one idea — move extra points to a new paragraph.',
    },
  ],

  'essay-conclusion': () => [
    {
      problem: 'ending the essay without restating the main position',
      weak: 'In conclusion, there are many points. It is a complex topic.',
      strong: 'In conclusion, urban cycling infrastructure is the most practical way to reduce city traffic.',
      fix: 'Restate your thesis in different words in the first sentence of the conclusion.',
    },
    {
      problem: 'introducing a brand-new argument in the conclusion',
      weak: 'In conclusion, public transport is important. Also, governments should tax cars more.',
      strong: 'In conclusion, public transport investment reduces congestion, as the evidence above shows.',
      fix: 'The conclusion should summarise, not introduce. Save new arguments for body paragraphs.',
    },
    {
      problem: 'copying the introduction almost word-for-word as the conclusion',
      weak: 'To conclude, technology has changed education in many ways, both positive and negative.',
      strong: 'To conclude, while technology creates distractions, its benefits for self-paced learning outweigh the costs.',
      fix: 'Paraphrase your introduction and add a forward-looking or evaluative remark.',
    },
  ],

  'essay-structure-intro': () => [
    {
      problem: 'starting the introduction with a dictionary definition',
      weak: 'Technology is defined as the application of scientific knowledge for practical purposes.',
      strong: 'Technology shapes how people work, learn, and communicate in the modern world.',
      fix: 'Open with a general, engaging statement about the topic — not a definition.',
    },
    {
      problem: 'failing to state your position clearly in the introduction',
      weak: 'There are advantages and disadvantages. Both sides have valid points.',
      strong: 'Although social media has downsides, its benefits for communication outweigh the risks.',
      fix: 'State your position in the final sentence of the introduction using a thesis statement.',
    },
    {
      problem: 'making the introduction too long by explaining all arguments',
      weak: 'First I will discuss cost. Then I will discuss time. After that, I will look at quality…',
      strong: 'This essay argues that cost and efficiency are the two most important factors.',
      fix: 'The introduction should give context and a thesis — keep the details for body paragraphs.',
    },
  ],

  'formal-vs-informal': () => [
    {
      problem: 'using informal contractions in a formal essay',
      weak: "It's clear that the government can't ignore this issue.",
      strong: 'It is clear that the government cannot ignore this issue.',
      fix: 'Expand all contractions (it\'s → it is, can\'t → cannot) in formal academic writing.',
    },
    {
      problem: 'using conversational filler phrases in a formal letter',
      weak: 'I just wanted to let you know that I am kind of unhappy with the service.',
      strong: 'I am writing to express my dissatisfaction with the service I received.',
      fix: 'Replace "just", "kind of", "sort of", and "wanted to" with precise, formal verbs.',
    },
    {
      problem: 'switching between formal and informal register in the same response',
      weak: "The policy has numerous benefits. But honestly, who's going to follow it?",
      strong: 'The policy has numerous benefits; however, enforcement remains a significant challenge.',
      fix: 'Choose one register and maintain it throughout. Formal writing avoids rhetorical questions.',
    },
  ],

  'hedging-in-opinion-writing': () => [
    {
      problem: 'hedging so much the position disappears entirely',
      weak: 'It could possibly be argued that this might perhaps be somewhat beneficial in some cases.',
      strong: 'While this policy may not suit every context, it generally improves service quality.',
      fix: 'Use one hedging word per claim (may, might, tend to) — stacking hedges weakens, not strengthens, the argument.',
    },
    {
      problem: 'using the same hedging phrase in every sentence',
      weak: 'This may be good. It may also save time. It may reduce costs.',
      strong: 'This policy may reduce costs and tends to improve response times across departments.',
      fix: 'Vary your hedging vocabulary: may, might, tends to, is likely to, appears to.',
    },
    {
      problem: 'using hedges in conclusions where a clear statement is expected',
      weak: 'In conclusion, this might possibly be a good idea perhaps.',
      strong: 'In conclusion, this approach is likely to improve outcomes for most users.',
      fix: 'Conclusions can use one confident hedge (likely, generally) — avoid stacking uncertain language.',
    },
  ],

  'paragraph-coherence': () => [
    {
      problem: 'listing points without linking them to the paragraph topic',
      weak: 'People exercise more. Diet is also important. Sleep matters too.',
      strong: 'Better fitness starts with exercise, but diet and sleep are equally essential for recovery.',
      fix: 'Connect each point back to the paragraph topic using a linking word or phrase.',
    },
    {
      problem: 'using transition words incorrectly, making the logic unclear',
      weak: 'Exercise is healthy. However, it reduces the risk of disease.',
      strong: 'Exercise is healthy; in fact, regular activity reduces the risk of several chronic diseases.',
      fix: 'Match the linker to the logic: "however" = contrast, "in fact" = emphasis, "therefore" = result.',
    },
    {
      problem: 'repeating the same sentence structure for every point',
      weak: 'Exercise is good. Diet is good. Sleep is good. Rest is good.',
      strong: 'Regular exercise, combined with a balanced diet and adequate sleep, supports long-term health.',
      fix: 'Vary sentence length and structure — combine short related points into one compound sentence.',
    },
  ],

  'punctuation-academic': () => [
    {
      problem: 'using a semicolon where a comma is correct',
      weak: 'The report covered three areas; cost; time; and quality.',
      strong: 'The report covered three areas: cost, time, and quality.',
      fix: 'Use a colon to introduce a list; use commas within the list — reserving semicolons for complex list items.',
    },
    {
      problem: 'omitting punctuation between two independent clauses',
      weak: 'The budget was approved the project started the following month.',
      strong: 'The budget was approved; the project started the following month.',
      fix: 'Two complete sentences joined without a conjunction need a semicolon or a full stop between them.',
    },
    {
      problem: 'using a comma after every "however" or "therefore" but not before them',
      weak: 'The plan was ready however the funding was delayed.',
      strong: 'The plan was ready; however, the funding was delayed.',
      fix: 'When "however" or "therefore" joins two clauses, put a semicolon before and a comma after.',
    },
  ],

  'reducing-wordiness': () => [
    {
      problem: 'using a long phrase where one precise word works',
      weak: 'Due to the fact that the budget was limited, the project was delayed.',
      strong: 'Because the budget was limited, the project was delayed.',
      fix: 'Replace "due to the fact that" with "because" and "in order to" with "to".',
    },
    {
      problem: 'repeating the same idea in different words in the same sentence',
      weak: 'The new innovation was completely unprecedented and had never been seen before.',
      strong: 'The innovation was unprecedented.',
      fix: 'Remove redundant pairs: "new innovation" → "innovation", "completely unprecedented" → "unprecedented".',
    },
    {
      problem: 'starting sentences with empty subject phrases',
      weak: 'It is the case that technology improves productivity.',
      strong: 'Technology improves productivity.',
      fix: 'Delete "It is clear that", "It is the case that", and "The fact is that" — lead with the real subject.',
    },
  ],

  'run-on-sentences-and-fragments': () => [
    {
      problem: 'joining two sentences with only a comma (comma splice)',
      weak: 'The exam was difficult, many students did not finish.',
      strong: 'The exam was difficult; many students did not finish.',
      fix: 'Replace the comma with a semicolon, a full stop, or add a conjunction (so, but, and).',
    },
    {
      problem: 'writing a dependent clause as if it were a complete sentence',
      weak: 'Because the deadline was moved forward.',
      strong: 'Production slowed because the deadline was moved forward.',
      fix: 'A clause starting with because, although, or when cannot stand alone — attach it to a main clause.',
    },
    {
      problem: 'stringing too many "and" clauses into one run-on sentence',
      weak: 'The team worked hard and they finished early and they submitted the report and the client was happy.',
      strong: 'The team worked hard and finished early. After submitting the report, they received positive feedback from the client.',
      fix: 'Break chains of "and" into two or three shorter sentences for easier reading.',
    },
  ],

  'topic-sentences': () => [
    {
      problem: 'starting a body paragraph with a fact instead of a controlling idea',
      weak: 'Many people use social media every day.',
      strong: 'Social media has changed how people maintain long-distance friendships.',
      fix: 'A topic sentence should state the paragraph\'s argument, not just a fact. Ask: "What point am I making?"',
    },
    {
      problem: 'writing a topic sentence that is too broad to focus the paragraph',
      weak: 'Technology affects many things in society.',
      strong: 'Smartphones have reduced the need for face-to-face interaction among teenagers.',
      fix: 'Narrow the topic sentence to the single idea you will develop in that paragraph.',
    },
    {
      problem: 'forgetting the topic sentence and starting with a detail',
      weak: 'For example, in 2023, a study showed a 20% drop in face-to-face socialization.',
      strong: 'Smartphone use has reduced face-to-face socialisation. For example, a 2023 study found a 20% drop among teenagers.',
      fix: 'Always write the main claim first, then the evidence or example that supports it.',
    },
  ],

  'ielts-task2-advantages': () => [
    {
      problem: 'listing advantages and disadvantages without developing either',
      weak: 'There are many advantages. Also there are disadvantages. It depends.',
      strong: 'The main advantage is increased efficiency: companies can automate routine tasks, freeing staff for creative work.',
      fix: 'For each advantage or disadvantage, add a "why" or "how" explanation before moving to the next.',
    },
    {
      problem: 'writing an unbalanced essay that only addresses one side',
      weak: 'There are so many advantages that it is hard to see any disadvantages.',
      strong: 'Although automation reduces some jobs, it creates new roles in maintenance and software development.',
      fix: 'Dedicate at least one paragraph to each side — use "although" or "however" to signal the contrast.',
    },
    {
      problem: "using general nouns ('people', 'society') instead of specific groups",
      weak: 'This helps people and society in many ways.',
      strong: 'Remote workers, in particular, benefit from reduced daily commute time.',
      fix: 'Replace "people" with a specific group: workers, students, elderly residents, local businesses.',
    },
  ],

  'ielts-task2-opinion': () => [
    {
      problem: 'failing to state a clear opinion in the introduction',
      weak: 'There are many views on this topic. Some agree, some disagree.',
      strong: 'I strongly believe that governments should invest in renewable energy rather than subsidise fossil fuels.',
      fix: 'State your opinion directly in the introduction using "I believe", "I think", or "In my view".',
    },
    {
      problem: 'writing "to some extent I agree" and then only arguing one side',
      weak: 'To some extent I agree. It is good because it helps people a lot.',
      strong: 'I partially agree: while the proposal reduces costs, it may disadvantage smaller businesses.',
      fix: 'If you partially agree, explain both what you agree with and what you disagree with.',
    },
    {
      problem: 'giving a personal example that sounds invented and lowers credibility',
      weak: 'For example, my friend became very successful after this policy changed.',
      strong: 'For example, countries that introduced free university tuition saw 15% higher graduate employment rates.',
      fix: 'Use general group-level examples (countries, industries, studies) rather than individual anecdotes.',
    },
  ],

  'ielts-task2-discussion': () => [
    {
      problem: 'treating a "discuss both views" as an opinion essay',
      weak: 'In my opinion, working from home is much better and everyone should do it.',
      strong: 'Proponents of remote work value its flexibility, while critics argue it reduces team cohesion.',
      fix: '"Discuss both views" means present both sides fairly — do not argue for one side from the start.',
    },
    {
      problem: 'using the same argument template for both views',
      weak: 'Some people think this. Others think the opposite. Both have good points.',
      strong: 'Some people prioritise economic growth, arguing that it funds public services. Others prioritise environmental health, contending that growth without sustainability causes long-term harm.',
      fix: 'Give each side its own specific argument and explanation — avoid mirroring the same structure.',
    },
    {
      problem: "forgetting to give your own opinion when the question asks for it",
      weak: 'Both sides have valid points. It is a complex issue with many factors.',
      strong: 'Considering both views, I believe the environmental argument is more compelling in the long term.',
      fix: 'Check the question. If it says "discuss and give your opinion", you must state and support your view.',
    },
  ],

  'ielts-task2-problem': () => [
    {
      problem: 'describing the problem without identifying its cause',
      weak: 'Traffic congestion is a big problem in many cities.',
      strong: 'Traffic congestion worsens in cities where public transport infrastructure has not kept pace with population growth.',
      fix: 'Add a cause clause (because, due to, as a result of) after naming the problem.',
    },
    {
      problem: 'proposing a solution without explaining how it solves the problem',
      weak: 'The government should invest more money. This will fix the problem.',
      strong: 'Investing in metro expansion would reduce private car use, which is the primary driver of congestion.',
      fix: 'Link your solution to the cause: [solution] → [how it addresses the cause] → [result].',
    },
    {
      problem: 'mixing causes and solutions in the same paragraph',
      weak: 'Traffic is caused by poor infrastructure. Also the government should build more roads. People cause traffic too.',
      strong: 'The main cause of congestion is reliance on private cars. To address this, governments could invest in affordable public transport.',
      fix: 'Separate causes and solutions: one paragraph for causes, one for solutions.',
    },
  ],

  'celpip-task1-covering-all-prompt-points': () => [
    {
      problem: 'addressing only the first bullet point and ignoring the rest',
      weak: 'I am writing about the meeting. It will be on Friday.',
      strong: 'I am writing to propose Friday at 2 p.m. for our project meeting. Please confirm if the main boardroom is available and let me know if you need any materials prepared in advance.',
      fix: 'Before writing, read all bullet points. Draft one sentence per bullet to make sure each is covered.',
    },
    {
      problem: 'mentioning a bullet point with a single vague word',
      weak: 'The date is Friday. The place is the office. The topic is discussed.',
      strong: 'I suggest we meet on Friday 14th in the third-floor conference room to finalise the project timeline.',
      fix: 'Expand each point with specific details — dates, names, reasons, or next steps.',
    },
    {
      problem: 'covering bullet points out of the logical order in the email',
      weak: 'I want to bring snacks. The time is 3 p.m. Also the reason is to discuss the project.',
      strong: 'I am writing to schedule a project discussion for Friday at 3 p.m. Please let me know if you can join, and I will arrange refreshments.',
      fix: 'Order your points logically: purpose → details → action required. Readers expect this structure.',
    },
  ],

  'celpip-task1-purpose-and-tone': () => [
    {
      problem: 'using informal language in a formal email context',
      weak: "Hey! Just wanted to check if u got my stuff. Let me know ASAP!",
      strong: 'I am writing to confirm whether my documents have been received. I would appreciate a response at your earliest convenience.',
      fix: 'Match the tone to the audience: formal register for supervisors, clients, or landlords; informal only for close friends.',
    },
    {
      problem: 'failing to state the purpose of the email in the first sentence',
      weak: 'I hope you are doing well. The weather has been nice lately.',
      strong: 'I am writing to request a one-week extension on my project submission.',
      fix: 'State the email\'s purpose in the first sentence — do not lead with pleasantries in a formal task.',
    },
    {
      problem: 'mixing formal and informal tone in the same email',
      weak: "I am writing to formally request a refund. Also, this is super annoying and I can't believe it happened.",
      strong: 'I am writing to request a refund for the damaged item I received. I was disappointed by the condition of the package upon delivery.',
      fix: 'Choose one tone and maintain it throughout. Formal complaints use measured, factual language.',
    },
  ],

  'celpip-task2-support-and-examples': () => [
    {
      problem: 'giving a reason without explaining why it is true',
      weak: 'Working from home is better. It helps people and saves time.',
      strong: 'Working from home eliminates daily commutes, which gives employees an average of 90 extra minutes per day.',
      fix: 'After each reason, add a "because" or "since" clause that explains the mechanism.',
    },
    {
      problem: 'using the word "example" but not actually giving one',
      weak: 'For example, many people prefer this option and it is popular.',
      strong: 'For example, a 2022 company survey found that 70% of remote workers reported higher job satisfaction.',
      fix: 'A real example includes a who, where, when, or measurable result — not just a general statement.',
    },
    {
      problem: 'repeating the same example in different words across the essay',
      weak: 'People are happier working from home. Also, employees have more happiness at home. Workers are more satisfied remotely.',
      strong: 'Remote workers report higher job satisfaction; additionally, companies see lower staff turnover when flexible arrangements are offered.',
      fix: 'Each paragraph should introduce a new piece of evidence or a different aspect of the same point.',
    },
  ],

  'advanced-argument-structure-in-formal-essays': () => [
    {
      problem: 'presenting a claim with no warrant or logical connection to the evidence',
      weak: 'Universities are expensive. Therefore, students are less creative.',
      strong: 'High tuition fees force students to work part-time, leaving less time for exploratory projects and creative pursuits.',
      fix: 'Add the logical bridge between evidence and conclusion: show HOW the evidence leads to the claim.',
    },
    {
      problem: 'countering an opposing view by dismissing it rather than refuting it',
      weak: 'Some people say automation is bad. They are wrong and do not understand the issue.',
      strong: 'While critics argue that automation displaces workers, evidence suggests those workers shift to higher-skilled roles over time.',
      fix: 'Acknowledge the opposing view fairly (While others argue…), then provide evidence that undermines it.',
    },
    {
      problem: 'overloading a body paragraph with multiple separate arguments',
      weak: 'Education improves income. Also, it reduces crime. And it increases voter participation.',
      strong: 'Higher education correlates with increased earnings: graduates earn, on average, 65% more than non-graduates over their careers.',
      fix: 'Each body paragraph makes ONE argument. Move other claims to their own paragraphs.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FILE-TO-CARDS MAP
// Maps filename → card-builder function for every affected lesson.
// ─────────────────────────────────────────────────────────────────────────────

function getCardsForFile(filename) {
  // Strip .md
  const slug = filename.replace(/\.md$/, '');

  // Remove level suffix: -b1, -b2, -c1, etc.
  const baseSlug = slug.replace(/[-_](a1|a2|b1|b2|c1|c2)$/, '');

  const speakingFn = SPEAKING_CARDS[baseSlug];
  if (speakingFn) return speakingFn();

  const writingFn = WRITING_CARDS[baseSlug];
  if (writingFn) return writingFn();

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLACEMENT LOGIC
// Finds the Common Mistakes block and replaces it.
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_MISTAKES_RE = /## Common Mistakes\n<div class="lesson-error-grid">[\s\S]*?<\/div>/;

function replaceCommonMistakes(content, newBlock) {
  return content.replace(COMMON_MISTAKES_RE, newBlock);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(LESSON_DIR)).filter((f) => f.endsWith('.md'));

  const AFFECTED_FILES = [
    // Type A — speaking filler
    'celpip-task1-experience-b1.md',
    'celpip-task1-experience-b2.md',
    'celpip-task2-opinion-b1.md',
    'celpip-task2-opinion-b2.md',
    'celpip-task2-opinion-c1.md',
    'celpip-task3-interview-b1.md',
    'celpip-task3-interview-b2.md',
    'celpip-task3-interview-c1.md',
    'paraphrasing-speaking-b1.md',
    'paraphrasing-speaking-b2.md',
    'paraphrasing-speaking-c1.md',
    'topic-management-b2.md',
    'topic-management-c1.md',
    // Type B — generic writing/essay planning template
    'active-voice-writing-b1.md',
    'active-voice-writing-b2.md',
    'active-voice-writing-c1.md',
    'avoiding-repetition-b1.md',
    'avoiding-repetition-b2.md',
    'avoiding-repetition-c1.md',
    'comma-usage-b1.md',
    'comma-usage-b2.md',
    'essay-body-paragraphs-b1.md',
    'essay-body-paragraphs-b2.md',
    'essay-body-paragraphs-c1.md',
    'essay-conclusion-b1.md',
    'essay-conclusion-b2.md',
    'essay-conclusion-c1.md',
    'essay-structure-intro-b1.md',
    'essay-structure-intro-b2.md',
    'formal-vs-informal-b1.md',
    'formal-vs-informal-b2.md',
    'formal-vs-informal-c1.md',
    'hedging-in-opinion-writing.md',
    'ielts-task2-advantages-b1.md',
    'ielts-task2-advantages-b2.md',
    'ielts-task2-advantages-c1.md',
    'ielts-task2-discussion-b2.md',
    'ielts-task2-discussion-c1.md',
    'ielts-task2-opinion-b1.md',
    'ielts-task2-opinion-b2.md',
    'ielts-task2-opinion-c1.md',
    'ielts-task2-problem-b1.md',
    'ielts-task2-problem-b2.md',
    'ielts-task2-problem-c1.md',
    'paragraph-coherence-b1.md',
    'paragraph-coherence-b2.md',
    'paragraph-coherence-c1.md',
    'punctuation-academic-b1.md',
    'punctuation-academic-b2.md',
    'punctuation-academic-c1.md',
    'reducing-wordiness-b1.md',
    'reducing-wordiness-b2.md',
    'reducing-wordiness-c1.md',
    'run-on-sentences-and-fragments-b2.md',
    'topic-sentences-b1.md',
    'topic-sentences-b2.md',
    'celpip-task1-covering-all-prompt-points-b2.md',
    'celpip-task1-purpose-and-tone-b2.md',
    'celpip-task2-support-and-examples-b2.md',
    'advanced-argument-structure-in-formal-essays.md',
  ];

  let changed = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const filename of AFFECTED_FILES) {
    if (!files.includes(filename)) {
      console.warn(`  [SKIP] ${filename} — not found in ${LESSON_DIR}`);
      skipped++;
      continue;
    }

    const cards = getCardsForFile(filename);
    if (!cards) {
      console.warn(`  [SKIP] ${filename} — no card data defined`);
      skipped++;
      continue;
    }

    const filePath = path.join(LESSON_DIR, filename);
    const original = await readFile(filePath, 'utf8');

    if (!COMMON_MISTAKES_RE.test(original)) {
      console.warn(`  [NO MATCH] ${filename} — Common Mistakes block not found`);
      noMatch++;
      continue;
    }

    const newBlock = buildErrorGrid(cards);
    const updated = replaceCommonMistakes(original, newBlock);

    if (updated === original) {
      console.log(`  [UNCHANGED] ${filename}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would update: ${filename}`);
    } else {
      await writeFile(filePath, updated, 'utf8');
      console.log(`  [UPDATED] ${filename}`);
    }
    changed++;
  }

  console.log(`\nDone. Changed: ${changed} | Skipped: ${skipped} | No match: ${noMatch}`);
  if (DRY_RUN) console.log('(Dry run — no files were written)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
