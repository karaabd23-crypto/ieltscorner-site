import {
  CELPIP_READING_TEST_CATALOG,
  CELPIP_READING_TEST_CONTENT,
  CELPIP_READING_WORK_AREAS,
  flattenReadingQuestions,
} from '../src/lib/celpipReadingData.mjs';

const args = new Set(process.argv.slice(2));
const includeDrafts = args.has('--include-drafts');

const VALID_ACCESS = new Set(['free', 'premium']);
const VALID_STATUS = new Set(['draft', 'published']);
const VALID_TYPES = new Set(['single', 'multi', 'select', 'matching']);
const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);
const VALID_SKILLS = new Set(Object.keys(CELPIP_READING_WORK_AREAS));
const EXPECTED_PART_IDS = ['part-1', 'part-2', 'part-3', 'part-4'];
const EXPECTED_PART_COUNTS = {
  'part-1': 11,
  'part-2': 8,
  'part-3': 9,
  'part-4': 10,
};

const STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'among',
  'around',
  'because',
  'before',
  'being',
  'below',
  'between',
  'both',
  'could',
  'during',
  'every',
  'first',
  'from',
  'have',
  'into',
  'just',
  'many',
  'most',
  'much',
  'other',
  'over',
  'same',
  'should',
  'some',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'under',
  'very',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
]);

const errors = [];
const warnings = [];
const summaries = [];

const fail = (code, message) => errors.push(`[${code}] ${message}`);
const warn = (code, message) => warnings.push(`[${code}] ${message}`);

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const words = (value) => normalizeWhitespace(value).split(' ').filter(Boolean);
const normalizeStem = (value) => normalizeWhitespace(value).toLowerCase();

const tokenize = (value) =>
  normalizeStem(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));

function validateCatalog() {
  const ids = new Set();
  const orders = new Set();
  const freeEntries = CELPIP_READING_TEST_CATALOG.filter((entry) => entry.access === 'free');
  const premiumEntries = CELPIP_READING_TEST_CATALOG.filter((entry) => entry.access === 'premium');

  if (CELPIP_READING_TEST_CATALOG.length !== 10) {
    fail('catalog.count', `Expected exactly 10 reading tests, found ${CELPIP_READING_TEST_CATALOG.length}.`);
  }
  if (freeEntries.length !== 1) {
    fail('catalog.free-count', `Expected exactly 1 free reading test, found ${freeEntries.length}.`);
  }
  if (premiumEntries.length !== 9) {
    fail('catalog.premium-count', `Expected exactly 9 premium reading tests, found ${premiumEntries.length}.`);
  }

  for (const entry of CELPIP_READING_TEST_CATALOG) {
    if (!entry?.id || typeof entry.id !== 'string') {
      fail('catalog.id', 'Each catalog entry must include a string id.');
      continue;
    }
    if (ids.has(entry.id)) {
      fail('catalog.id-duplicate', `Duplicate catalog id: ${entry.id}.`);
    }
    ids.add(entry.id);

    if (!Number.isInteger(entry.order) || entry.order < 1) {
      fail('catalog.order', `Catalog entry ${entry.id} must have a positive integer order.`);
    } else if (orders.has(entry.order)) {
      fail('catalog.order-duplicate', `Duplicate catalog order: ${entry.order}.`);
    }
    orders.add(entry.order);

    if (!VALID_ACCESS.has(entry.access)) {
      fail('catalog.access', `Catalog entry ${entry.id} has invalid access value "${entry.access}".`);
    }
    if (!VALID_STATUS.has(entry.status)) {
      fail('catalog.status', `Catalog entry ${entry.id} has invalid status value "${entry.status}".`);
    }

    const expectedId = `reading-test-${String(entry.order).padStart(2, '0')}`;
    if (entry.id !== expectedId) {
      fail(
        'catalog.id-order',
        `Catalog entry order ${entry.order} should map to id "${expectedId}", found "${entry.id}".`,
      );
    }

    if (!normalizeWhitespace(entry.title)) {
      fail('catalog.title', `Catalog entry ${entry.id} must include a non-empty title.`);
    }
    if (!normalizeWhitespace(entry.focus)) {
      fail('catalog.focus', `Catalog entry ${entry.id} must include a non-empty focus field.`);
    }
    if (!normalizeWhitespace(entry.summary)) {
      fail('catalog.summary', `Catalog entry ${entry.id} must include a non-empty summary field.`);
    }
  }

  const sortedOrders = [...orders].sort((a, b) => a - b);
  sortedOrders.forEach((order, index) => {
    if (order !== index + 1) {
      fail('catalog.order-sequence', 'Catalog order values must be contiguous starting from 1.');
    }
  });

  const contentIds = Object.keys(CELPIP_READING_TEST_CONTENT);
  for (const testId of contentIds) {
    if (!ids.has(testId)) {
      fail('catalog.content-orphan', `Content exists for "${testId}" but this id is missing from catalog.`);
    }
  }

  const publishedIds = new Set(
    CELPIP_READING_TEST_CATALOG.filter((entry) => entry.status === 'published').map((entry) => entry.id),
  );
  for (const testId of publishedIds) {
    if (!CELPIP_READING_TEST_CONTENT[testId]) {
      fail('catalog.published-without-content', `Published test "${testId}" has no content object.`);
    }
  }

  for (const entry of CELPIP_READING_TEST_CATALOG) {
    if (entry.status === 'draft' && !CELPIP_READING_TEST_CONTENT[entry.id]) {
      warn('catalog.draft-without-content', `Draft test "${entry.id}" has no content yet (expected while authoring).`);
    }
  }
}

function validateQuestion(question, context) {
  const { testId, sectionId, questionIdSet, optionTextSet } = context;

  if (!question?.id || typeof question.id !== 'string') {
    fail('question.id', `${testId}/${sectionId} has a question without a string id.`);
    return;
  }
  if (questionIdSet.has(question.id)) {
    fail('question.id-duplicate', `${testId} has duplicate question id "${question.id}".`);
  }
  questionIdSet.add(question.id);

  if (!Number.isInteger(question.number) || question.number < 1) {
    fail('question.number', `${testId}/${question.id} must have a positive integer number.`);
  }

  if (!VALID_TYPES.has(question.type)) {
    fail('question.type', `${testId}/${question.id} has invalid type "${question.type}".`);
  }
  if (!VALID_SKILLS.has(question.skillTag)) {
    fail('question.skill', `${testId}/${question.id} has unknown skill tag "${question.skillTag}".`);
  }
  if (!VALID_DIFFICULTY.has(question.difficulty)) {
    fail('question.difficulty', `${testId}/${question.id} has invalid difficulty "${question.difficulty}".`);
  }
  if (!normalizeWhitespace(question.prompt)) {
    fail('question.prompt', `${testId}/${question.id} is missing a non-empty prompt.`);
  }

  const explanationWordCount = words(question.explanation).length;
  if (explanationWordCount < 10) {
    fail(
      'question.explanation-quality',
      `${testId}/${question.id} explanation is too thin (${explanationWordCount} words; minimum is 10).`,
    );
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    fail('question.options', `${testId}/${question.id} must provide exactly 4 options.`);
    return;
  }

  const optionIds = new Set();
  for (const option of question.options) {
    if (!option?.id || typeof option.id !== 'string') {
      fail('question.option-id', `${testId}/${question.id} includes an option with missing id.`);
      continue;
    }
    if (optionIds.has(option.id)) {
      fail('question.option-id-duplicate', `${testId}/${question.id} has duplicate option id "${option.id}".`);
    }
    optionIds.add(option.id);

    if (!normalizeWhitespace(option.text)) {
      fail('question.option-text', `${testId}/${question.id} option "${option.id}" is empty.`);
    }

    const optionKey = `${question.id}::${normalizeStem(option.text)}`;
    if (optionTextSet.has(optionKey)) {
      fail(
        'question.option-text-duplicate',
        `${testId}/${question.id} has repeated option text "${normalizeWhitespace(option.text)}".`,
      );
    }
    optionTextSet.add(optionKey);
  }

  if (question.type === 'multi') {
    if (!Array.isArray(question.correctAnswer) || question.correctAnswer.length < 2) {
      fail('question.multi-answer', `${testId}/${question.id} must have an array of at least 2 correct answers.`);
    } else {
      for (const answerId of question.correctAnswer) {
        if (!optionIds.has(answerId)) {
          fail(
            'question.multi-answer-missing',
            `${testId}/${question.id} references unknown correct option "${answerId}".`,
          );
        }
      }
      if (Number.isInteger(question.selectCount) && question.selectCount !== question.correctAnswer.length) {
        fail(
          'question.multi-select-count',
          `${testId}/${question.id} selectCount (${question.selectCount}) must equal correct answer count (${question.correctAnswer.length}).`,
        );
      }
    }
  } else {
    if (typeof question.correctAnswer !== 'string') {
      fail('question.answer-type', `${testId}/${question.id} must use a single string correctAnswer.`);
    } else if (!optionIds.has(question.correctAnswer)) {
      fail(
        'question.answer-id',
        `${testId}/${question.id} correctAnswer "${question.correctAnswer}" is not in options.`,
      );
    }
  }
}

function validateTest(testId, test, catalogEntry) {
  const isPublished = catalogEntry.status === 'published';
  const questionIdSet = new Set();
  const optionTextSet = new Set();

  if (!test || typeof test !== 'object') {
    fail('test.object', `Test "${testId}" is missing a content object.`);
    return;
  }
  if (!normalizeWhitespace(test.title)) {
    fail('test.title', `Test "${testId}" must include a non-empty title.`);
  }
  if (!Array.isArray(test.sections) || test.sections.length !== 4) {
    fail('test.sections', `Test "${testId}" must include exactly 4 sections.`);
    return;
  }

  if (!Number.isInteger(test.durationMinutes) || test.durationMinutes <= 0) {
    fail('test.duration', `Test "${testId}" must include a positive durationMinutes integer.`);
  } else if (isPublished && test.durationMinutes !== 60) {
    fail('test.duration-published', `Published test "${testId}" must be 60 minutes.`);
  }

  const sectionIds = test.sections.map((section) => section.id);
  EXPECTED_PART_IDS.forEach((expectedPartId, index) => {
    if (sectionIds[index] !== expectedPartId) {
      fail(
        'test.section-order',
        `Test "${testId}" section ${index + 1} should be "${expectedPartId}", found "${sectionIds[index]}".`,
      );
    }
  });

  for (const section of test.sections) {
    if (!normalizeWhitespace(section.label) || !normalizeWhitespace(section.title)) {
      fail('section.title', `Test "${testId}" section "${section.id}" needs label and title.`);
    }
    if (!Array.isArray(section.passage) || section.passage.length < 4) {
      fail('section.passage', `Test "${testId}" section "${section.id}" needs at least 4 passage blocks.`);
    }
    if (!Array.isArray(section.questions) || !section.questions.length) {
      fail('section.questions', `Test "${testId}" section "${section.id}" needs questions.`);
      continue;
    }

    if (isPublished) {
      const expectedCount = EXPECTED_PART_COUNTS[section.id];
      if (expectedCount && section.questions.length !== expectedCount) {
        fail(
          'section.question-count',
          `Published test "${testId}" section "${section.id}" must have ${expectedCount} questions, found ${section.questions.length}.`,
        );
      }
    }

    for (const question of section.questions) {
      validateQuestion(question, { testId, sectionId: section.id, questionIdSet, optionTextSet });
    }
  }

  const flatQuestions = flattenReadingQuestions(test);
  const totalQuestions = flatQuestions.length;
  if (test.totalQuestions !== totalQuestions) {
    fail(
      'test.totalQuestions',
      `Test "${testId}" totalQuestions is ${test.totalQuestions}, but flattened questions count is ${totalQuestions}.`,
    );
  }
  if (isPublished && totalQuestions !== 38) {
    fail('test.totalQuestions-published', `Published test "${testId}" must have 38 questions, found ${totalQuestions}.`);
  }

  const expectedNumbers = Array.from({ length: totalQuestions }, (_, index) => index + 1);
  const actualNumbers = flatQuestions.map((question) => question.number);
  expectedNumbers.forEach((number, index) => {
    if (actualNumbers[index] !== number) {
      fail(
        'test.question-number-sequence',
        `Test "${testId}" question order must be sequential 1..${totalQuestions}; found ${actualNumbers[index]} at position ${index + 1}.`,
      );
    }
  });

  const prompts = new Set();
  for (const question of flatQuestions) {
    const promptKey = normalizeStem(question.prompt);
    if (prompts.has(promptKey)) {
      fail('question.prompt-duplicate', `Test "${testId}" has duplicate prompt text at question ${question.id}.`);
    }
    prompts.add(promptKey);
  }

  const typeCounts = {};
  const skillCounts = {};
  const difficultyCounts = {};
  for (const question of flatQuestions) {
    typeCounts[question.type] = (typeCounts[question.type] || 0) + 1;
    skillCounts[question.skillTag] = (skillCounts[question.skillTag] || 0) + 1;
    difficultyCounts[question.difficulty] = (difficultyCounts[question.difficulty] || 0) + 1;
  }

  const hardRatio = (difficultyCounts.hard || 0) / (totalQuestions || 1);
  const mediumRatio = (difficultyCounts.medium || 0) / (totalQuestions || 1);
  const detailRatio = (skillCounts.detail || 0) / (totalQuestions || 1);
  const paraphraseRatio = (skillCounts.paraphrase || 0) / (totalQuestions || 1);
  const inferenceRatio = (skillCounts.inference || 0) / (totalQuestions || 1);
  const viewpointRatio = (skillCounts.viewpoint || 0) / (totalQuestions || 1);
  const mainIdeaRatio = (skillCounts['main-idea'] || 0) / (totalQuestions || 1);

  if (hardRatio < 0.25) {
    fail(
      'distribution.hard',
      `Test "${testId}" hard-question ratio is ${(hardRatio * 100).toFixed(1)}%; minimum is 25%.`,
    );
  }
  if (mediumRatio < 0.3) {
    fail(
      'distribution.medium',
      `Test "${testId}" medium-question ratio is ${(mediumRatio * 100).toFixed(1)}%; minimum is 30%.`,
    );
  }
  if (detailRatio > 0.5) {
    fail(
      'distribution.detail-overload',
      `Test "${testId}" detail-question ratio is ${(detailRatio * 100).toFixed(1)}%; maximum is 50%.`,
    );
  }
  if (paraphraseRatio < 0.12) {
    fail(
      'distribution.paraphrase',
      `Test "${testId}" paraphrase-question ratio is ${(paraphraseRatio * 100).toFixed(1)}%; minimum is 12%.`,
    );
  }
  if (inferenceRatio < 0.1) {
    fail(
      'distribution.inference',
      `Test "${testId}" inference-question ratio is ${(inferenceRatio * 100).toFixed(1)}%; minimum is 10%.`,
    );
  }
  if (viewpointRatio < 0.1) {
    fail(
      'distribution.viewpoint',
      `Test "${testId}" viewpoint-question ratio is ${(viewpointRatio * 100).toFixed(1)}%; minimum is 10%.`,
    );
  }
  if (mainIdeaRatio < 0.08) {
    fail(
      'distribution.main-idea',
      `Test "${testId}" main-idea-question ratio is ${(mainIdeaRatio * 100).toFixed(1)}%; minimum is 8%.`,
    );
  }

  const part1 = test.sections.find((section) => section.id === 'part-1');
  const part2 = test.sections.find((section) => section.id === 'part-2');
  const part3 = test.sections.find((section) => section.id === 'part-3');
  const part4 = test.sections.find((section) => section.id === 'part-4');

  if (part1) {
    const blankCount = (part1.passage || []).reduce((sum, block) => {
      const matches = String(block?.text || '').match(/{{BLANK:[^}]+}}/g) || [];
      return sum + matches.length;
    }, 0);
    const part1SelectCount = (part1.questions || []).filter((question) => question.type === 'select').length;
    if (blankCount < 4) {
      fail('signature.part1-blanks', `Test "${testId}" part-1 must contain at least 4 correspondence blanks.`);
    }
    if (part1SelectCount < 4) {
      fail('signature.part1-select', `Test "${testId}" part-1 must contain at least 4 select/dropdown items.`);
    }
  }

  if (part2) {
    const hasDiagram =
      part2.diagram &&
      Array.isArray(part2.diagram.headers) &&
      part2.diagram.headers.length >= 2 &&
      Array.isArray(part2.diagram.rows) &&
      part2.diagram.rows.length >= 2;
    if (!hasDiagram) {
      fail('signature.part2-diagram', `Test "${testId}" part-2 must include a diagram/table structure.`);
    }
  }

  if (part3) {
    const matchingCount = (part3.questions || []).filter((question) => question.type === 'matching').length;
    const paragraphLocateCount = (part3.questions || []).filter((question) =>
      /in which paragraph/i.test(String(question.prompt || '')),
    ).length;
    if (matchingCount < 3 && paragraphLocateCount < 3) {
      fail(
        'signature.part3-matching',
        `Test "${testId}" part-3 must include at least 3 matching or paragraph-location items.`,
      );
    }
  }

  if (part4) {
    const viewpointInferenceCount = (part4.questions || []).filter((question) =>
      ['viewpoint', 'inference'].includes(question.skillTag),
    ).length;
    if (viewpointInferenceCount < 5) {
      fail(
        'signature.part4-viewpoint',
        `Test "${testId}" part-4 must include at least 5 viewpoint/inference items, found ${viewpointInferenceCount}.`,
      );
    }
  }

  let distractorCount = 0;
  let lowPlausibilityDistractors = 0;
  const sectionLookup = Object.fromEntries(test.sections.map((section) => [section.id, section]));

  for (const question of flatQuestions) {
    if (question.type === 'select') continue;
    const section = sectionLookup[question.sectionId];
    const sectionText = (section?.passage || []).map((block) => block?.text || '').join(' ');
    const referenceTokens = new Set([...tokenize(question.prompt), ...tokenize(sectionText)]);
    const answerIds = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];

    for (const option of question.options || []) {
      if (answerIds.includes(option.id)) continue;
      const optionTokens = tokenize(option.text);
      if (!optionTokens.length) {
        lowPlausibilityDistractors += 1;
        distractorCount += 1;
        continue;
      }
      const hasOverlap = optionTokens.some((token) => referenceTokens.has(token));
      if (!hasOverlap) {
        lowPlausibilityDistractors += 1;
      }
      distractorCount += 1;
    }
  }

  const lowPlausibilityRatio = lowPlausibilityDistractors / (distractorCount || 1);
  if (lowPlausibilityRatio > 0.15) {
    fail(
      'distractor.plausibility',
      `Test "${testId}" has ${(lowPlausibilityRatio * 100).toFixed(1)}% low-plausibility distractors (max 15%).`,
    );
  } else if (lowPlausibilityRatio > 0.08) {
    warn(
      'distractor.plausibility-warning',
      `Test "${testId}" has ${(lowPlausibilityRatio * 100).toFixed(1)}% low-plausibility distractors.`,
    );
  }

  summaries.push({
    id: testId,
    status: catalogEntry.status,
    questions: totalQuestions,
    types: typeCounts,
    skills: skillCounts,
    difficulties: difficultyCounts,
    lowPlausibilityDistractorRatio: Number(lowPlausibilityRatio.toFixed(4)),
  });
}

validateCatalog();

const catalogById = Object.fromEntries(CELPIP_READING_TEST_CATALOG.map((entry) => [entry.id, entry]));
for (const entry of CELPIP_READING_TEST_CATALOG) {
  const test = CELPIP_READING_TEST_CONTENT[entry.id];
  if (!test) continue;
  if (!includeDrafts && entry.status !== 'published') continue;
  validateTest(entry.id, test, entry);
}

const report = {
  includeDrafts,
  checkedTests: summaries.length,
  errors: errors.length,
  warnings: warnings.length,
  summaries,
};

console.log(JSON.stringify(report, null, 2));

if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach((line) => console.warn(`- ${line}`));
}

if (errors.length) {
  console.error('\nReading quality gate failed:');
  errors.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log('\nReading quality gate passed.');
