const LESSON_LIBRARY = {
  task1Email: {
    key: 'task1-email',
    title: 'CELPIP Writing Task 1: Email',
    href: '/lessons/writing/celpip-task1-email/',
    reason: 'Use this when the whole email response needs stronger structure.',
  },
  task1PurposeTone: {
    key: 'task1-purpose-tone',
    title: 'CELPIP Task 1: Purpose and Tone',
    href: '/lessons/writing/celpip-task1-purpose-and-tone-b2/',
    reason: 'Use this when the opening, audience, or tone feels wrong.',
  },
  task1Coverage: {
    key: 'task1-coverage',
    title: 'CELPIP Task 1: Cover Every Prompt Point',
    href: '/lessons/writing/celpip-task1-covering-all-prompt-points-b2/',
    reason: 'Use this when you miss bullets or answer them too briefly.',
  },
  task2Survey: {
    key: 'task2-survey',
    title: 'CELPIP Task 2: Survey Response',
    href: '/lessons/writing/celpip-task2-survey/',
    reason: 'Use this when the whole Task 2 response needs stronger control.',
  },
  task2Support: {
    key: 'task2-support',
    title: 'CELPIP Task 2: Support and Examples',
    href: '/lessons/writing/celpip-task2-support-and-examples-b2/',
    reason: 'Use this when reasons feel thin, vague, or repetitive.',
  },
  task2Opinion: {
    key: 'task2-opinion',
    title: 'Opinions and Reasons',
    href: '/lessons/writing/opinions-and-reasons/',
    reason: 'Use this when your position is unclear or weak.',
  },
  paragraphCoherence: {
    key: 'paragraph-coherence',
    title: 'Paragraph Coherence',
    href: '/lessons/writing/paragraph-coherence/',
    reason: 'Use this when ideas do not connect clearly from sentence to sentence.',
  },
  bodyParagraphs: {
    key: 'essay-body-paragraphs',
    title: 'Essay Body Paragraphs',
    href: '/lessons/writing/essay-body-paragraphs/',
    reason: 'Use this when body paragraphs need one clear job and better support.',
  },
  linkingWords: {
    key: 'linking-words',
    title: 'Linking Words',
    href: '/lessons/writing/linking-words/',
    reason: 'Use this when transitions feel weak, repetitive, or unnatural.',
  },
  runOns: {
    key: 'run-ons',
    title: 'Run-On Sentences and Fragments',
    href: '/lessons/writing/run-on-sentences-and-fragments-b2/',
    reason: 'Use this when sentence boundaries cause confusion.',
  },
  punctuation: {
    key: 'punctuation',
    title: 'Punctuation for Academic Writing',
    href: '/lessons/writing/punctuation-academic/',
    reason: 'Use this when punctuation makes the writing hard to follow.',
  },
  formalVsInformal: {
    key: 'formal-vs-informal',
    title: 'Formal vs Informal Language',
    href: '/lessons/writing/formal-vs-informal/',
    reason: 'Use this when wording sounds too casual for the task.',
  },
  stance: {
    key: 'stance',
    title: 'Opinions and Reasons',
    href: '/lessons/writing/opinions-and-reasons/',
    reason: 'Use this when you need a clearer opinion and stronger reasons.',
  },
  articles: {
    key: 'articles',
    title: 'Articles: A, An, The',
    href: '/lessons/grammar/articles-a-an-the/',
    reason: 'Use this when article errors affect clarity.',
  },
  tenses: {
    key: 'tenses',
    title: 'Twelve Tenses',
    href: '/lessons/grammar/twelve-tenses/',
    reason: 'Use this when tense control shifts without a reason.',
  },
  agreement: {
    key: 'agreement',
    title: 'Subject-Verb Agreement',
    href: '/lessons/grammar/subject-verb-agreement/',
    reason: 'Use this when grammar control drops in core sentence patterns.',
  },
  wordForm: {
    key: 'word-form',
    title: 'Word Formation: Suffixes',
    href: '/lessons/grammar/word-formation-suffixes/',
    reason: 'Use this when the right base idea is there but the word form is wrong.',
  },
};

const RECOMMENDATION_RULES = [
  {
    key: 'task1-tone',
    taskTypes: ['task1'],
    terms: ['tone', 'too casual', 'too direct', 'audience', 'register', 'purpose', 'opening', 'closing'],
    lessons: [LESSON_LIBRARY.task1PurposeTone, LESSON_LIBRARY.formalVsInformal, LESSON_LIBRARY.task1Email],
  },
  {
    key: 'task1-coverage',
    taskTypes: ['task1'],
    terms: ['coverage', 'missed bullet', 'prompt point', 'missing point', 'incomplete', 'did not address'],
    lessons: [LESSON_LIBRARY.task1Coverage, LESSON_LIBRARY.task1Email],
  },
  {
    key: 'task2-position',
    taskTypes: ['task2'],
    terms: ['position', 'opinion', 'clear choice', 'unclear stance', 'thesis'],
    lessons: [LESSON_LIBRARY.task2Opinion, LESSON_LIBRARY.stance, LESSON_LIBRARY.task2Survey],
  },
  {
    key: 'support',
    taskTypes: ['task1', 'task2'],
    terms: ['support', 'example', 'detail', 'thin', 'vague', 'development', 'explain more'],
    lessons: [LESSON_LIBRARY.task2Support, LESSON_LIBRARY.bodyParagraphs, LESSON_LIBRARY.stance],
  },
  {
    key: 'organization',
    taskTypes: ['task1', 'task2'],
    terms: ['organization', 'coherence', 'flow', 'paragraph', 'logic', 'sequencing', 'order'],
    lessons: [LESSON_LIBRARY.paragraphCoherence, LESSON_LIBRARY.bodyParagraphs, LESSON_LIBRARY.linkingWords],
  },
  {
    key: 'linking',
    taskTypes: ['task1', 'task2'],
    terms: ['transition', 'linking', 'connect', 'connector', 'cohesion'],
    lessons: [LESSON_LIBRARY.linkingWords, LESSON_LIBRARY.paragraphCoherence],
  },
  {
    key: 'sentence-boundaries',
    taskTypes: ['task1', 'task2'],
    terms: ['run-on', 'fragment', 'sentence boundary', 'comma splice', 'punctuation', 'hard to follow sentence'],
    lessons: [LESSON_LIBRARY.runOns, LESSON_LIBRARY.punctuation],
  },
  {
    key: 'articles',
    taskTypes: ['task1', 'task2'],
    terms: ['article', 'a/an/the', 'determiner'],
    lessons: [LESSON_LIBRARY.articles],
  },
  {
    key: 'tense',
    taskTypes: ['task1', 'task2'],
    terms: ['tense', 'verb time', 'time control'],
    lessons: [LESSON_LIBRARY.tenses],
  },
  {
    key: 'agreement',
    taskTypes: ['task1', 'task2'],
    terms: ['agreement', 'subject-verb', 'verb form'],
    lessons: [LESSON_LIBRARY.agreement, LESSON_LIBRARY.wordForm],
  },
  {
    key: 'word-choice',
    taskTypes: ['task1', 'task2'],
    terms: ['word choice', 'vocabulary', 'imprecise', 'collocation', 'word form'],
    lessons: [LESSON_LIBRARY.wordForm, LESSON_LIBRARY.formalVsInformal],
  },
];

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeList(value, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeErrorAnalysis(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const category = normalizeString(item.category || item.type || item.area);
      const severityRaw = normalizeString(item.severity || 'medium').toLowerCase();
      const severity = ['high', 'medium', 'low'].includes(severityRaw) ? severityRaw : 'medium';
      const explanation = normalizeString(item.explanation || item.comment || item.problem);
      const evidence = normalizeString(item.evidence || item.example || item.quote);
      const fixNow = normalizeString(item.fixNow || item.fix || item.action);
      if (!category && !explanation) return null;
      return {
        category: category || 'Language control',
        severity,
        explanation: explanation || 'This area needs clearer control.',
        evidence,
        fixNow: fixNow || 'Rewrite one sentence and check the same pattern again.',
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeCriterionComments(value, traitScores, taskType) {
  const base = value && typeof value === 'object' ? value : {};
  const labels = ['Task fulfillment', 'Organization', 'Vocabulary', 'Grammar'];
  const result = {};
  for (const label of labels) {
    const raw = normalizeString(base[label]);
    if (raw) {
      result[label] = raw;
      continue;
    }

    const score = clampInt(traitScores?.[label], 1, 12, 6);
    if (label === 'Task fulfillment') {
      if (score >= 9) {
        result[label] = taskType === 'task1'
          ? 'The response covers the main job of the email clearly and sounds appropriate for the reader.'
          : 'The response makes a clear choice and supports it with enough development for the task.';
      } else if (score >= 7) {
        result[label] = taskType === 'task1'
          ? 'The main purpose is visible, but one part of the prompt may need fuller coverage or better tone control.'
          : 'The position is understandable, but the support is still uneven or too general.';
      } else {
        result[label] = taskType === 'task1'
          ? 'Important prompt points or tone choices are missing, so the email feels incomplete.'
          : 'The task response is only partly developed, so the reader cannot trust the position fully.';
      }
      continue;
    }

    if (label === 'Organization') {
      result[label] = score >= 9
        ? 'Ideas move in a clear order and each paragraph has a clear job.'
        : score >= 7
          ? 'The organization mostly works, but some links between ideas are weak or repetitive.'
          : 'The response needs clearer paragraph control and more logical sequencing.';
      continue;
    }

    if (label === 'Vocabulary') {
      result[label] = score >= 9
        ? 'Word choice is precise and supports the task without sounding forced.'
        : score >= 7
          ? 'Vocabulary is good enough for the task, but some words are repetitive or not exact enough.'
          : 'Vocabulary stays basic or imprecise, so key ideas do not sound fully controlled.';
      continue;
    }

    result[label] = score >= 9
      ? 'Grammar is mostly controlled, with only small slips that do not interrupt clarity.'
      : score >= 7
        ? 'Grammar is understandable overall, but recurring errors still lower confidence.'
        : 'Grammar problems appear often enough to affect clarity and flow.';
  }
  return result;
}

function normalizeRewriteSuggestions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        const text = normalizeString(item);
        return text ? { before: text, after: '', why: '' } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const before = normalizeString(item.before || item.original || item.issue);
      const after = normalizeString(item.after || item.better || item.rewrite);
      const why = normalizeString(item.why || item.reason);
      if (!before && !after) return null;
      return { before, after, why };
    })
    .filter(Boolean)
    .slice(0, 4);
}

function buildRecommendationHaystack(report) {
  const parts = [
    normalizeString(report?.descriptor),
    normalizeString(report?.overallSummary),
    ...normalizeList(report?.strengths, 8),
    ...normalizeList(report?.improvementPriorities, 8),
    ...normalizeList(report?.lessonNeeds, 8),
    ...normalizeErrorAnalysis(report?.errorAnalysis).flatMap((item) => [
      normalizeString(item.category),
      normalizeString(item.explanation),
      normalizeString(item.fixNow),
    ]),
  ];

  return parts.join(' ').toLowerCase();
}

function defaultLessonStack(taskType) {
  if (taskType === 'task1') {
    return [
      LESSON_LIBRARY.task1Email,
      LESSON_LIBRARY.task1PurposeTone,
      LESSON_LIBRARY.task1Coverage,
      LESSON_LIBRARY.paragraphCoherence,
    ];
  }

  return [
    LESSON_LIBRARY.task2Survey,
    LESSON_LIBRARY.task2Opinion,
    LESSON_LIBRARY.task2Support,
    LESSON_LIBRARY.paragraphCoherence,
  ];
}

export function recommendLessonsForReport(report, { taskType = 'task1' } = {}) {
  const haystack = buildRecommendationHaystack(report);
  const selected = [];
  const seen = new Set();

  const pushLesson = (lesson, matchedBecause = '') => {
    if (!lesson || seen.has(lesson.key)) return;
    seen.add(lesson.key);
    selected.push({
      title: lesson.title,
      href: lesson.href,
      reason: matchedBecause || lesson.reason,
    });
  };

  for (const rule of RECOMMENDATION_RULES) {
    if (!rule.taskTypes.includes(taskType)) continue;
    const matched = rule.terms.some((term) => haystack.includes(term));
    if (!matched) continue;
    for (const lesson of rule.lessons) {
      pushLesson(lesson, lesson.reason);
      if (selected.length >= 4) return selected;
    }
  }

  for (const lesson of defaultLessonStack(taskType)) {
    pushLesson(lesson);
    if (selected.length >= 4) break;
  }

  return selected;
}

function fallbackErrorAnalysis(report, taskType) {
  const priorities = normalizeList(report?.improvementPriorities, 4);
  if (priorities.length > 0) {
    return priorities.map((item) => ({
      category: taskType === 'task1' ? 'Task control' : 'Response development',
      severity: 'medium',
      explanation: item,
      evidence: '',
      fixNow: 'Revise one paragraph slowly and check whether every sentence helps the task.',
    }));
  }

  return [
    {
      category: taskType === 'task1' ? 'Purpose and tone' : 'Opinion and support',
      severity: 'medium',
      explanation: 'The response needs a clearer plan before full drafting.',
      evidence: '',
      fixNow: 'Plan the purpose, paragraph jobs, and strongest example before you write again.',
    },
  ];
}

export function normalizeCelpipReport(report, { taskType = 'task1' } = {}) {
  const overallLevel = clampInt(report?.overallLevel, 1, 12, 6);
  const traitScores = {
    'Task fulfillment': clampInt(report?.traitScores?.['Task fulfillment'], 1, 12, overallLevel),
    Organization: clampInt(report?.traitScores?.Organization, 1, 12, Math.max(1, overallLevel - 1)),
    Vocabulary: clampInt(report?.traitScores?.Vocabulary, 1, 12, Math.max(1, overallLevel - 1)),
    Grammar: clampInt(report?.traitScores?.Grammar, 1, 12, Math.max(1, overallLevel - 1)),
  };

  const base = {
    overallLevel,
    descriptor: normalizeString(report?.descriptor) || 'CELPIP writing estimate',
    overallSummary: normalizeString(report?.overallSummary),
    traitScores,
    criterionComments: normalizeCriterionComments(report?.criterionComments, traitScores, taskType),
    strengths: normalizeList(report?.strengths, 5),
    improvementPriorities: normalizeList(report?.improvementPriorities, 5),
    errorAnalysis: normalizeErrorAnalysis(report?.errorAnalysis),
    rewriteSuggestions: normalizeRewriteSuggestions(report?.rewriteSuggestions),
    lessonNeeds: normalizeList(report?.lessonNeeds, 6),
    nextPracticeSteps: normalizeList(report?.nextPracticeSteps, 4),
  };

  if (base.errorAnalysis.length === 0) {
    base.errorAnalysis = fallbackErrorAnalysis(base, taskType);
  }

  if (!base.overallSummary) {
    base.overallSummary = taskType === 'task1'
      ? 'This response communicates the main message, but a CELPIP rater would still look for fuller prompt coverage, stronger tone control, and cleaner sentence-level accuracy.'
      : 'This response shows the main idea, but a CELPIP rater would still want a clearer position, stronger support, and more stable language control.';
  }

  base.lessonRecommendations = recommendLessonsForReport(base, { taskType });
  return base;
}
