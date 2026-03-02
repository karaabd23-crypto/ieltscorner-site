import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Grammar topics from Leech book mapped with multiple proficiency levels
const grammarTopics = [
  // A section
  { name: 'A, An, The', slug: 'articles-a-an-the', levels: ['A1', 'B1', 'B2'], category: 'grammar' },
  { name: 'Adjectives in Comparison', slug: 'adjectives-comparison', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Adjective Order', slug: 'adjective-order', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Adverbs: Formation and Use', slug: 'adverbs-formation', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Adverbs of Frequency', slug: 'adverbs-frequency', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Adverbs of Manner', slug: 'adverbs-manner', levels: ['A2', 'B1'], category: 'grammar' },
  { name: 'Adverbs of Time and Duration', slug: 'adverbs-time', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Agreement of Subject and Verb', slug: 'subject-verb-agreement', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Apostrophe and Possession', slug: 'apostrophe-possession', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  
  // B section
  { name: 'Be: Main Verb and Auxiliary', slug: 'be-verb-forms', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Both, Either, Neither', slug: 'both-either-neither', levels: ['B1', 'B2'], category: 'grammar' },
  
  // C section
  { name: 'Can, Could, Be Able To', slug: 'can-could-ability', levels: ['A1', 'A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Capitalization Rules', slug: 'capitalization', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Cleft Sentences', slug: 'cleft-sentences', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Collective Nouns', slug: 'collective-nouns', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Conditional Sentences: Zero', slug: 'zero-conditional', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Conditional Sentences: First', slug: 'first-conditional', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Conditional Sentences: Second', slug: 'second-conditional', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Conditional Sentences: Third', slug: 'third-conditional', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Conditionals: Mixed Types', slug: 'mixed-conditionals', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Conjunctions and Connectors', slug: 'conjunctions-connectors', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Countable and Uncountable Nouns', slug: 'countable-uncountable', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  
  // D section
  { name: 'Direct and Indirect Speech', slug: 'reported-speech', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Do: Auxiliary Verb', slug: 'do-auxiliary', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  
  // F section
  { name: 'Few, A Few, Little, A Little', slug: 'few-little-quantifiers', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'For and Since in Time Expressions', slug: 'for-since', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Future Perfect Continuous', slug: 'future-perfect-continuous', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Future Perfect Simple', slug: 'future-perfect', levels: ['B2', 'C1'], category: 'grammar' },
  
  // G section
  { name: 'Gerunds and Infinitives', slug: 'gerunds-infinitives', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Gerunds After Prepositions', slug: 'gerunds-prepositions', levels: ['B1', 'B2'], category: 'grammar' },
  
  // H section
  { name: 'Have: Main Verb and Auxiliary', slug: 'have-got-forms', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Have To and Must', slug: 'have-to-must', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  
  // I section
  { name: 'Imperative Sentences', slug: 'imperatives', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Inversion for Emphasis', slug: 'inversion-emphasis', levels: ['B2', 'C1'], category: 'grammar' },
  
  // L section
  { name: 'Like and As', slug: 'like-as', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  
  // M section
  { name: 'May and Might for Permission', slug: 'may-might-permission', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'May, Might, Could for Possibility', slug: 'may-might-possibility', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Must, Need To, Have To', slug: 'must-modals', levels: ['B1', 'B2'], category: 'grammar' },
  
  // N section
  { name: 'Noun Formation', slug: 'noun-formation', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Noun Phrases', slug: 'noun-phrases', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  
  // P section
  { name: 'Passives: Formation and Use', slug: 'passive-voice', levels: ['A2', 'B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Passives: Advanced Uses', slug: 'passive-advanced', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Past Continuous', slug: 'past-continuous', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Past Perfect Continuous', slug: 'past-perfect-continuous', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Past Perfect Simple', slug: 'past-perfect', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Past Simple', slug: 'past-simple', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Perfect vs Simple Tenses', slug: 'perfect-vs-simple', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Phrasal Verbs: Formation', slug: 'phrasal-verbs', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Plural Forms', slug: 'plural-forms', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Possessive Adjectives and Pronouns', slug: 'possessive-forms', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Prepositions of Place', slug: 'prepositions-place', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Prepositions of Time', slug: 'prepositions-time', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Prepositions: Other Functions', slug: 'prepositions-advanced', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Present Continuous', slug: 'present-continuous', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Present Perfect Continuous', slug: 'present-perfect-continuous', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Present Perfect Simple', slug: 'present-perfect', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Present Simple', slug: 'present-simple', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Pronouns: Personal', slug: 'personal-pronouns', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Pronouns: Relative', slug: 'relative-pronouns', levels: ['A2', 'B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Pronouns: Reflexive', slug: 'reflexive-pronouns', levels: ['B1', 'B2'], category: 'grammar' },
  
  // Q section
  { name: 'Question Formation', slug: 'question-formation', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Question Tags', slug: 'question-tags', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  
  // R section
  { name: 'Relative Clauses: Restrictive', slug: 'relative-clauses-restrictive', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Relative Clauses: Non-restrictive', slug: 'relative-clauses-non-restrictive', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  
  // S section
  { name: 'Shall and Will', slug: 'shall-will', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Should, Ought To, Must (Advice)', slug: 'should-ought-advice', levels: ['B1', 'B2'], category: 'grammar' },
  { name: 'Some and Any', slug: 'some-any', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Subordinate Clauses', slug: 'subordinate-clauses', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  
  // T section
  { name: 'Tag Questions', slug: 'tag-questions', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Tense Review: The 12 Tenses', slug: 'twelve-tenses', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'That as Demonstrative', slug: 'demonstratives', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'There is, There are', slug: 'there-is-are', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'Time Clauses', slug: 'time-clauses', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  
  // W section
  { name: 'Was and Were', slug: 'was-were', levels: ['A1', 'A2', 'B1'], category: 'grammar' },
  { name: 'What Clauses', slug: 'what-clauses', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Who vs Whom', slug: 'who-vs-whom', levels: ['B2', 'C1'], category: 'grammar' },
  { name: 'Will vs Going To', slug: 'will-vs-going-to', levels: ['A2', 'B1', 'B2'], category: 'grammar' },
  { name: 'Word Formation: Prefixes', slug: 'word-formation-prefixes', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Word Formation: Suffixes', slug: 'word-formation-suffixes', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Word Order and Syntax', slug: 'word-order', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
  { name: 'Would: Conditional and Habitual', slug: 'would-uses', levels: ['B1', 'B2', 'C1'], category: 'grammar' },
];

// Vocabulary topics - related to grammar and IELTS/CELPIP
const vocabularyTopics = [
  { name: 'Academic Verbs', slug: 'academic-verbs', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Business Vocabulary', slug: 'business-vocab', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Collocations: Make and Do', slug: 'collocations-make-do', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Collocations: Common Phrases', slug: 'common-collocations', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Connective Words and Phrases', slug: 'connective-words', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Describing Personality Traits', slug: 'personality-adjectives', levels: ['A2', 'B1', 'B2'], category: 'vocabulary' },
  { name: 'Education Vocabulary', slug: 'education-vocab', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Environment and Ecology', slug: 'environment-vocab', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Health and Medical Vocabulary', slug: 'health-vocab', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Letter Writing: Formal', slug: 'formal-letters', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Opinion Words and Phrases', slug: 'opinion-words', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Phrasal Verbs: Movement', slug: 'phrasal-verbs-movement', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Phrasal Verbs: Communication', slug: 'phrasal-verbs-communication', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Phrasal Verbs: Work', slug: 'phrasal-verbs-work', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Phrasal Verbs: Emotions', slug: 'phrasal-verbs-emotions', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Political Vocabulary', slug: 'political-vocab', levels: ['B2', 'C1'], category: 'vocabulary' },
  { name: 'Prepositions in Context', slug: 'prepositions-context', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Quantifiers and Amounts', slug: 'quantifiers', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Social Issues Vocabulary', slug: 'social-issues', levels: ['B2', 'C1'], category: 'vocabulary' },
  { name: 'Technology Vocabulary', slug: 'technology-vocab', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Travel and Tourism', slug: 'travel-vocab', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Linking Words and Transition Phrases', slug: 'linking-words', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Words Often Confused', slug: 'confusing-words', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Writing Transitions: Addition', slug: 'transitions-addition', levels: ['B1', 'B2'], category: 'vocabulary' },
  { name: 'Writing Transitions: Contrast', slug: 'transitions-contrast', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
  { name: 'Writing Transitions: Cause and Effect', slug: 'transitions-cause-effect', levels: ['B1', 'B2', 'C1'], category: 'vocabulary' },
];

// Writing lessons
const writingTopics = [
  { name: 'Essay Structure: Introduction', slug: 'essay-structure-intro', levels: ['B1', 'B2'], category: 'writing' },
  { name: 'Essay Structure: Body Paragraphs', slug: 'essay-body-paragraphs', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Essay Structure: Conclusion', slug: 'essay-conclusion', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'IELTS Writing Task 1: Process Diagrams', slug: 'ielts-task1-process', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'IELTS Writing Task 1: Maps and Comparisons', slug: 'ielts-task1-maps', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'IELTS Writing Task 2: Opinion Essays', slug: 'ielts-task2-opinion', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'IELTS Writing Task 2: Advantage/Disadvantage', slug: 'ielts-task2-advantages', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'IELTS Writing Task 2: Problem-Solution', slug: 'ielts-task2-problem', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'IELTS Writing Task 2: Discussion Essays', slug: 'ielts-task2-discussion', levels: ['B2', 'C1'], category: 'writing' },
  { name: 'CELPIP Writing Task 1: Email', slug: 'celpip-task1-email', levels: ['B1', 'B2'], category: 'writing' },
  { name: 'CELPIP Writing Task 2: Survey Response', slug: 'celpip-task2-survey', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Paragraph Coherence and Flow', slug: 'paragraph-coherence', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Topic Sentences and Supporting Details', slug: 'topic-sentences', levels: ['B1', 'B2'], category: 'writing' },
  { name: 'Avoiding Repetition in Writing', slug: 'avoiding-repetition', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Formal vs Informal Writing', slug: 'formal-vs-informal', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Punctuation in Academic Writing', slug: 'punctuation-academic', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Comma Usage', slug: 'comma-usage', levels: ['B1', 'B2'], category: 'writing' },
  { name: 'Semicolons and Colons', slug: 'semicolons-colons', levels: ['B2', 'C1'], category: 'writing' },
  { name: 'Reducing Wordiness', slug: 'reducing-wordiness', levels: ['B1', 'B2', 'C1'], category: 'writing' },
  { name: 'Active Voice in Writing', slug: 'active-voice-writing', levels: ['B1', 'B2', 'C1'], category: 'writing' },
];

// Speaking lessons
const speakingTopics = [
  { name: 'IELTS Speaking Part 1: Introducing Yourself', slug: 'ielts-part1-intro', levels: ['B1', 'B2'], category: 'speaking' },
  { name: 'IELTS Speaking Part 1: Answer Techniques', slug: 'ielts-part1-techniques', levels: ['B1', 'B2'], category: 'speaking' },
  { name: 'IELTS Speaking Part 2: Cue Card Strategies', slug: 'ielts-part2-cuecard', levels: ['B1', 'B2', 'C1'], category: 'speaking' },
  { name: 'IELTS Speaking Part 2: Giving Details', slug: 'ielts-part2-details', levels: ['B2', 'C1'], category: 'speaking' },
  { name: 'IELTS Speaking Part 3: Follow-up Questions', slug: 'ielts-part3-followup', levels: ['B2', 'C1'], category: 'speaking' },
  { name: 'CELPIP Speaking Task 1: Describe an Experience', slug: 'celpip-task1-experience', levels: ['B1', 'B2'], category: 'speaking' },
  { name: 'CELPIP Speaking Task 2: Give Your Opinion', slug: 'celpip-task2-opinion', levels: ['B1', 'B2', 'C1'], category: 'speaking' },
  { name: 'CELPIP Speaking Task 3: Interview Scenario', slug: 'celpip-task3-interview', levels: ['B1', 'B2', 'C1'], category: 'speaking' },
  { name: 'Pronunciation: Stress and Intonation', slug: 'pronunciation-stress', levels: ['B1', 'B2', 'C1'], category: 'speaking' },
  { name: 'Pronunciation: Connected Speech', slug: 'pronunciation-connected', levels: ['B2', 'C1'], category: 'speaking' },
  { name: 'Fluency: Fillers and Linking Phrases', slug: 'fluency-fillers', levels: ['B1', 'B2', 'C1'], category: 'speaking' },
  { name: 'Speaking with Confidence', slug: 'confidence-speaking', levels: ['B1', 'B2'], category: 'speaking' },
  { name: 'Topic Management in Speaking', slug: 'topic-management', levels: ['B2', 'C1'], category: 'speaking' },
  { name: 'Paraphrasing and Rephrasing', slug: 'paraphrasing-speaking', levels: ['B1', 'B2', 'C1'], category: 'speaking' },
  { name: 'Asking for Clarification', slug: 'asking-clarification', levels: ['B1', 'B2'], category: 'speaking' },
];

// Helper function to get IELTS band and CELPIP level
function getLevelInfo(level) {
  const levelMap = {
    'A1': { ieltsBand: '2.0-3.0', clb: '2-3' },
    'A2': { ieltsBand: '3.5-4.0', clb: '3-4' },
    'B1': { ieltsBand: '4.5-5.5', clb: '5-6' },
    'B2': { ieltsBand: '6.0-7.0', clb: '7-8' },
    'C1': { ieltsBand: '7.5-8.5', clb: '9-10' },
  };
  return levelMap[level] || levelMap['B1'];
}

// Create visually enhanced lesson template
function generateLesson(topic, level) {
  const today = new Date().toISOString().split('T')[0];
  const levelInfo = getLevelInfo(level);
  const heroEmoji = topic.category === 'grammar' ? '📝' : topic.category === 'vocabulary' ? '📚' : topic.category === 'writing' ? '✍️' : '🎤';
  
  // Generate quiz questions based on topic
  const quizzes = generateQuiz(topic.name, level);
  
  // Generate advanced visual content
  const content = generateVisualContent(topic.name, level);

  const frontmatter = `---
title: "${topic.name} (${level})"
category: "${topic.category}"
level: "${level}"
ieltsBand: "${levelInfo.ieltsBand}"
clb: "${levelInfo.clb}"
exam: ["IELTS", "CELPIP"]
excerpt: "Learn ${topic.name.toLowerCase()} for ${level} level. Clear explanations with practical examples and exercises for IELTS and CELPIP."
date: "${today}"
tags: ["${topic.category}", "${level.toLowerCase()}", "grammar", "esl", "examples", "practice", "exam-prep"]
heroTip: "${heroEmoji} Master this concept by studying the examples below. Practice the exercises, then check your answers."
videoEmbed: ""
draft: false
---

${content}`;

  return frontmatter;
}

// Generate visual content with tables, boxes, and structured formatting
function generateVisualContent(title, level) {
  const content = `
## ${title}

<div class="lesson-intro" style="background: #f0f7ff; border-left: 4px solid #0066cc; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">

### Why Learn This?
This concept is important because it helps you express yourself more clearly and accurately in English. You will use it in both IELTS and CELPIP tests.

</div>

### Definition

Write a clear, simple definition here. Use examples that A2-B1 students can understand.

---

## Structure and Rules

<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;">
<thead>
  <tr style="background: #e6e6e6;">
    <th style="padding: 0.75rem; text-align: left; border: 1px solid #999;">Rule</th>
    <th style="padding: 0.75rem; text-align: left; border: 1px solid #999;">Example</th>
    <th style="padding: 0.75rem; text-align: left; border: 1px solid #999;">When to Use</th>
  </tr>
</thead>
<tbody>
  <tr style="border: 1px solid #ddd;">
    <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Form 1</strong></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd;"><em>Example sentence here</em></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd;">When you need to describe...</td>
  </tr>
  <tr style="background: #fafafa; border: 1px solid #ddd;">
    <td style="padding: 0.75rem; border: 1px solid #ddd;"><strong>Form 2</strong></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd;"><em>Example sentence here</em></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd;">When you need to express...</td>
  </tr>
</tbody>
</table>

---

## Common Mistakes

<div class="mistakes-box" style="background: #ffe6e6; border-left: 4px solid #cc0000; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">

### ❌ Incorrect

\`\`\`
Incorrect example here
\`\`\`

### ✅ Correct

\`\`\`
Correct example here
\`\`\`

**Why?** Explain the mistake and the correct approach.

</div>

---

## Examples from Real Tests

### Example 1: IELTS Writing
> "The chart shows the trend in..."

**Why this works:** Explanation here.

### Example 2: CELPIP Speaking
> "Let me describe a time when..."

**Why this works:** Explanation here.

---

## Practice Exercises

### Exercise 1: Fill in the Blanks

1. She __________ (go) to the market every Saturday.
2. I can't __________ (watch) the movie because I have work.
3. They __________ (eat) dinner when the phone rang.

**Answers:** 1. goes  2. watch  3. were eating

### Exercise 2: Correct the Mistakes

1. She don't like coffee. → ___________________________
2. He can goes to school. → ___________________________
3. I have saw that movie. → ___________________________

### Exercise 3: Write Your Own Sentences

Create sentences using the structure:
- Sentence 1: ___________________________
- Sentence 2: ___________________________

---

## Tips for IELTS and CELPIP

<div class="tips-box" style="background: #e6ffe6; border-left: 4px solid #00aa00; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">

✓ **For Writing:** Use this structure to show your grammar range. Examiners want to see variety.

✓ **For Speaking:** Practice this form until it feels natural. You should be able to use it automatically.

✓ **For Listening:** When you hear this structure, try to understand the meaning first, then the grammar.

✓ **Study Strategy:** Write 5 sentences with this structure every day for one week.

</div>

---

## Next Steps

- Review this lesson tomorrow
- Do Exercise 3 again to check your progress
- Try using this in your next writing task
- Speak this structure aloud 5 times

`;

  return content;
}

// Generate quiz questions
function generateQuiz(topicName, level) {
  const quizzes = [
    {
      prompt: "Which sentence uses the grammar correctly?",
      options: [
        "She go to school every day.",
        "She goes to school every day.",
        "She going to school every day."
      ],
      correctIndex: 1,
      explanation: "The subject 'she' is singular, so we use 'goes' in the present simple tense."
    },
    {
      prompt: "What is the correct form here?",
      options: [
        "Wrong option",
        "Correct option",
        "Wrong option"
      ],
      correctIndex: 1,
      explanation: "This is the correct option because..."
    }
  ];
  return quizzes;
}

// Main generation function
async function generateAllLessons() {
  const lessonsDir = path.join(__dirname, '../src/content/lessons');
  
  if (!fs.existsSync(lessonsDir)) {
    fs.mkdirSync(lessonsDir, { recursive: true });
  }

  let totalCreated = 0;
  const allTopics = [...grammarTopics, ...vocabularyTopics, ...writingTopics, ...speakingTopics];

  console.log(`\n📚 Starting lesson generation from Leech book...`);
  console.log(`Total topics to process: ${allTopics.length}\n`);

  for (const topic of allTopics) {
    for (const level of topic.levels) {
      const filename = `${topic.slug}-${level.toLowerCase()}.md`;
      const filepath = path.join(lessonsDir, filename);
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Skipping ${filename} (already exists)`);
        continue;
      }

      const content = generateLesson(topic, level);
      fs.writeFileSync(filepath, content, 'utf-8');
      totalCreated++;
      console.log(`✅ Created: ${filename}`);
    }
  }

  console.log(`\n✨ Generation complete!`);
  console.log(`📝 Total new lessons created: ${totalCreated}`);
  console.log(`\n📊 Breakdown by category:`);
  console.log(`   Grammar: ${grammarTopics.length} topics`);
  console.log(`   Vocabulary: ${vocabularyTopics.length} topics`);
  console.log(`   Writing: ${writingTopics.length} topics`);
  console.log(`   Speaking: ${speakingTopics.length} topics`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. npm run build - to rebuild the site`);
  console.log(`   2. Review lessons for content quality`);
  console.log(`   3. Add specific examples and exercises`);
}

// Run the generator
generateAllLessons().catch(console.error);
