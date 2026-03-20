import fs from 'fs';
import path from 'path';

const toDelete = [
  "a-an-and-the.md",
  "articles-in-general-and-specific-meaning.md",
  "advanced-article-usage.md",
  "precision-with-determiners.md",
  "advanced-cohesion-through-grammar.md",
  "expert-grammar-essential.md",
  "countable-and-uncountable-nouns.md",
  "countable-vs-uncountable-accuracy.md",
  "vocabulary-for-food-and-shopping-words.md",
  "adverbs-of-frequency.md",
  "tag-questions.md",
  "question-tags-in-conversation.md",
  "reported-speech-basics.md",
  "gerunds-and-infinitives-after-common-verbs.md",
  "adjective-order-in-descriptions.md",
  "comparatives-and-superlatives.md",
  "passive-voice-in-common-contexts.md",
  "passive-advanced.md",
  "second-conditional-for-unreal-situations.md",
  "inversion-for-formal-emphasis.md",
  "cleft-sentences-for-emphasis.md",
  "vocabulary-for-time-and-routine-words.md",
  "vocabulary-for-work-and-study-words.md",
  "vocabulary-for-weather-and-seasons-words.md",
  "prepositions-of-place.md",
  "some-and-any-in-basic-sentences.md",
  "must-and-have-to.md",
  "have-to-must.md",
  "have-got-for-personal-information.md",
  "past-simple-regular-verbs.md",
  "past-simple-irregular-verbs.md",
  "defining-relative-clauses.md",
  "imperatives-for-instructions.md",
  "present-simple-for-daily-routines.md",
  "present-continuous-for-now.md",
  "may-might-possibility.md",
  "quantifiers-much-many-a-lot-of-plenty-of.md",
  "there-is-and-there-are.md",
  "linking-words-for-contrast-and-result.md",
];

const dir = 'src/content/lessons';
let deleted = 0;
let missing = 0;

for (const f of toDelete) {
  const fp = path.join(dir, f);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    deleted++;
    console.log(`Deleted: ${f}`);
  } else {
    missing++;
    console.log(`Missing: ${f}`);
  }
}

console.log(`\nDone: ${deleted} deleted, ${missing} missing`);
