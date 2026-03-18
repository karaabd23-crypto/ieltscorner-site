import { CELPIP_LEVEL_GUIDE } from './celpipWritingData.mjs';

const STOP_WORDS = new Set([
  'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'better', 'both', 'but', 'by',
  'can', 'could',
  'did', 'do', 'does', 'doing', 'during',
  'each', 'either', 'email', 'exam',
  'few', 'for', 'from',
  'had', 'has', 'have', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'job', 'just',
  'let', 'like',
  'main', 'many', 'may', 'might', 'more', 'most', 'much', 'must', 'my',
  'need', 'now',
  'of', 'on', 'one', 'only', 'or', 'our',
  'people', 'please', 'point', 'prompt',
  'question',
  'reader', 'really', 'response',
  'should', 'situation', 'so', 'some', 'student',
  'task', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'too',
  'use', 'using',
  'very',
  'was', 'we', 'well', 'were', 'what', 'when', 'which', 'while', 'who', 'why', 'will', 'with', 'would', 'write', 'writing',
  'you', 'your',
]);

const TRANSITIONS = [
  'because', 'for example', 'for instance', 'also', 'in addition', 'however',
  'therefore', 'as a result', 'while', 'although', 'overall', 'in conclusion',
  'for these reasons', 'on the other hand', 'by contrast', 'first', 'second',
  'finally', 'another reason',
];

const INFORMAL_PATTERNS = [
  /\bgonna\b/i,
  /\bwanna\b/i,
  /\bgotta\b/i,
  /\bguys\b/i,
  /\bkinda\b/i,
  /\bsorta\b/i,
  /\bu\b/i,
  /\bawesome\b/i,
  /\bsuper\b/i,
];

const COMMON_GRAMMAR_PATTERNS = [
  {
    regex: /\bpeople is\b/i,
    category: 'Grammar control',
    explanation: '"People" needs a plural verb.',
    lessonNeed: 'agreement',
    fixNow: 'Change "people is" to "people are" and check the same pattern everywhere.',
    better: 'people are',
  },
  {
    regex: /\bthey was\b/i,
    category: 'Grammar control',
    explanation: '"They" needs "were," not "was."',
    lessonNeed: 'agreement',
    fixNow: 'Check plural subjects and make sure the verb matches.',
    better: 'they were',
  },
  {
    regex: /\bhe go\b/i,
    category: 'Grammar control',
    explanation: 'Third-person singular subjects usually need -s in the present simple.',
    lessonNeed: 'agreement',
    fixNow: 'Check he/she/it verbs and add the correct ending.',
    better: 'he goes',
  },
  {
    regex: /\bshe go\b/i,
    category: 'Grammar control',
    explanation: 'Third-person singular subjects usually need -s in the present simple.',
    lessonNeed: 'agreement',
    fixNow: 'Check he/she/it verbs and add the correct ending.',
    better: 'she goes',
  },
  {
    regex: /\bi am agree\b/i,
    category: 'Grammar control',
    explanation: 'Use "I agree," not "I am agree."',
    lessonNeed: 'agreement',
    fixNow: 'Use the correct verb form for common opinion phrases.',
    better: 'I agree',
  },
  {
    regex: /\bmore better\b/i,
    category: 'Word choice',
    explanation: 'Do not use a double comparative like "more better."',
    lessonNeed: 'word choice',
    fixNow: 'Use one comparative form only: "better."',
    better: 'better',
  },
  {
    regex: /\bin my opinion i think\b/i,
    category: 'Support and examples',
    explanation: 'This opening repeats the same idea instead of moving the argument forward.',
    lessonNeed: 'clear position',
    fixNow: 'Choose one direct opinion phrase and keep moving.',
    better: 'I believe',
  },
];

const TASK1_PURPOSE_PHRASES = [
  'i am writing',
  "i'm writing",
  'i am emailing',
  'i would like to',
  'this email is to',
  'i am contacting you',
];

const TASK1_REQUEST_PHRASES = [
  'i would appreciate',
  'could you',
  'would it be possible',
  'please',
  'i request',
  'i kindly ask',
  'i hope you can',
];

const TASK1_IMPACT_PHRASES = [
  'this has',
  'it has affected',
  'it affects',
  'i cannot',
  'i have had to',
  'because of this',
  'as a result',
  'my work',
  'my schedule',
];

const TASK2_STANCE_PHRASES = [
  'i think',
  'i believe',
  'in my opinion',
  'i prefer',
  'is better',
  'would be better',
];

const TASK2_SUPPORT_PHRASES = [
  'because',
  'for example',
  'for instance',
  'one reason',
  'another reason',
  'this is because',
  'for this reason',
];

const TASK2_COMPARISON_PHRASES = [
  'however',
  'while',
  'although',
  'on the other hand',
  'by contrast',
  'compared with',
  'compared to',
];

const TASK2_CONCLUSION_PHRASES = [
  'overall',
  'in conclusion',
  'for these reasons',
  'that is why',
  'to sum up',
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getLevelMeta(level) {
  const numericLevel = Number(level);
  for (const item of CELPIP_LEVEL_GUIDE) {
    if (item.level === numericLevel) {
      return item;
    }
  }

  return CELPIP_LEVEL_GUIDE[CELPIP_LEVEL_GUIDE.length - 1];
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function splitWords(text) {
  return normalizeText(text).match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
}

function splitParagraphs(text) {
  return normalizeText(text)
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitSentences(text) {
  const cleaned = normalizeText(text).replace(/\n+/g, ' ');
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countPhraseMatches(text, phrases) {
  const normalized = normalizeText(text).toLowerCase();
  return phrases.reduce((count, phrase) => count + (normalized.includes(phrase) ? 1 : 0), 0);
}

function includesAny(text, phrases) {
  return countPhraseMatches(text, phrases) > 0;
}

function extractPromptKeywords(promptTitle, promptText, promptInstructions) {
  const source = [promptTitle, promptText, ...(Array.isArray(promptInstructions) ? promptInstructions : [])]
    .join(' ')
    .toLowerCase();
  const words = source.match(/[a-z]+/g) ?? [];
  const seen = new Set();
  const keywords = [];

  for (const word of words) {
    if (word.length < 4 || STOP_WORDS.has(word) || seen.has(word)) {
      continue;
    }
    seen.add(word);
    keywords.push(word);
    if (keywords.length >= 8) {
      break;
    }
  }

  return keywords;
}

function calculatePromptCoverage(responseText, keywords) {
  if (!keywords.length) {
    return { ratio: 0.5, matched: [] };
  }

  const haystack = ` ${normalizeText(responseText).toLowerCase()} `;
  const matched = keywords.filter((keyword) => haystack.includes(` ${keyword} `) || haystack.includes(keyword));
  return {
    ratio: matched.length / keywords.length,
    matched,
  };
}

function findSentence(sentences, phrases) {
  const loweredPhrases = phrases.map((phrase) => phrase.toLowerCase());
  return sentences.find((sentence) => loweredPhrases.some((phrase) => sentence.toLowerCase().includes(phrase))) ?? '';
}

function countDistinctTransitions(text) {
  const normalized = normalizeText(text).toLowerCase();
  return TRANSITIONS.filter((transition) => normalized.includes(transition)).length;
}

function chooseTask2Option(responseText, promptInstructions) {
  const options = Array.isArray(promptInstructions)
    ? promptInstructions.map((option) => String(option).trim()).filter(Boolean).slice(0, 2)
    : [];

  if (options.length === 0) {
    return { options: [], chosenOption: '' };
  }

  const haystack = normalizeText(responseText).toLowerCase();
  let bestOption = '';
  let bestScore = -1;

  for (const option of options) {
    const fullOption = option.toLowerCase();
    let score = haystack.includes(fullOption) ? 3 : 0;
    for (const token of fullOption.split(/\s+/).filter((word) => word.length >= 4)) {
      if (haystack.includes(token)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  return {
    options,
    chosenOption: bestScore > 0 ? bestOption : options[0],
  };
}

function collectCommonGrammarHits(responseText) {
  const hits = [];
  for (const pattern of COMMON_GRAMMAR_PATTERNS) {
    const match = normalizeText(responseText).match(pattern.regex);
    if (!match) {
      continue;
    }
    hits.push({
      ...pattern,
      evidence: match[0],
    });
  }
  return hits;
}

function buildStats(responseText) {
  const text = normalizeText(responseText);
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);
  const words = splitWords(text);
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
  const longSentenceCount = sentences.filter((sentence) => splitWords(sentence).length >= 32).length;
  const fragmentCount = sentences.filter((sentence) => {
    const wordCount = splitWords(sentence).length;
    const normalizedSentence = sentence.toLowerCase();
    if (wordCount === 0 || normalizedSentence.startsWith('dear ') || normalizedSentence === 'regards,' || normalizedSentence === 'sincerely,') {
      return false;
    }
    return wordCount <= 3;
  }).length;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const lastLine = lines.at(-1) ?? '';
  const penultimateLine = lines.at(-2) ?? '';
  const looksLikeNameOnly = /^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}$/.test(lastLine);
  const closingLineBeforeName = /(sincerely|best regards|kind regards|regards|thank you|respectfully)\b/i.test(penultimateLine);

  return {
    text,
    paragraphs,
    sentences,
    words,
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    uniqueRatio: words.length ? uniqueWords.size / words.length : 0,
    longSentenceCount,
    fragmentCount,
    lowercaseICount: (text.match(/\bi\b/g) ?? []).length,
    repeatedWordCount: (text.match(/\b([A-Za-z]+)\s+\1\b/gi) ?? []).length,
    repeatedCoreWordCount: Math.max(0, words.length - uniqueWords.size - 25),
    missingEndPunctuation: /[.!?]$/.test(text) || (looksLikeNameOnly && closingLineBeforeName) ? 0 : 1,
    exclamationCount: (text.match(/!/g) ?? []).length,
    informalCount: INFORMAL_PATTERNS.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0),
    connectorCount: countDistinctTransitions(text),
    grammarHits: collectCommonGrammarHits(text),
  };
}

function analyzeTask1(stats, promptTitle, promptText, promptInstructions, coverage) {
  return {
    promptKeywords: extractPromptKeywords(promptTitle, promptText, promptInstructions),
    coverage,
    greetingPresent: /^(dear|hello|hi)\b/im.test(stats.text),
    closingPresent: /(sincerely|best regards|kind regards|regards|thank you|respectfully)\b[\s,.\n-]*[A-Za-z\s]*$/i.test(stats.text),
    purposeSentence: findSentence(stats.sentences.slice(0, 2), TASK1_PURPOSE_PHRASES),
    requestSentence: findSentence(stats.sentences, TASK1_REQUEST_PHRASES),
    impactSentence: findSentence(stats.sentences, TASK1_IMPACT_PHRASES),
    toneTooCasual: stats.informalCount > 0 || /\bhi\b/i.test(stats.sentences[0] ?? '') || stats.exclamationCount > 1,
  };
}

function analyzeTask2(stats, promptTitle, promptText, promptInstructions, coverage) {
  const { options, chosenOption } = chooseTask2Option(stats.text, promptInstructions);
  const openingSentences = stats.sentences.slice(0, 2).join(' ');

  return {
    promptKeywords: extractPromptKeywords(promptTitle, promptText, promptInstructions),
    coverage,
    options,
    chosenOption,
    clearPosition: includesAny(openingSentences, TASK2_STANCE_PHRASES) || options.some((option) => openingSentences.toLowerCase().includes(option.toLowerCase())),
    supportMarkerCount: countPhraseMatches(stats.text, TASK2_SUPPORT_PHRASES),
    comparisonPresent: includesAny(stats.text, TASK2_COMPARISON_PHRASES),
    conclusionPresent: includesAny(stats.sentences.slice(-2).join(' '), TASK2_CONCLUSION_PHRASES),
  };
}

function scoreTaskFulfillment(taskType, stats, taskData) {
  let score = 8.5;

  if (stats.wordCount < 90) {
    score -= 3;
  } else if (stats.wordCount < 120) {
    score -= 2;
  } else if (stats.wordCount < 140 || stats.wordCount > 220) {
    score -= 1;
  } else if (stats.wordCount >= 150 && stats.wordCount <= 200) {
    score += 0.5;
  }

  if (taskType === 'task1') {
    score += taskData.purposeSentence ? 0.5 : -1.5;
    score += taskData.requestSentence ? 0.5 : -1;
    score += taskData.impactSentence ? 0.5 : -0.75;
    score += taskData.greetingPresent ? 0.25 : -0.5;
    score += taskData.closingPresent ? 0.25 : -0.5;
    score += taskData.coverage.ratio >= 0.45 ? 0.5 : taskData.coverage.ratio < 0.25 ? -1 : 0;
    if (taskData.toneTooCasual) {
      score -= 1;
    }
  } else {
    score += taskData.clearPosition ? 0.75 : -1.75;
    score += taskData.chosenOption ? 0.25 : -1;
    score += taskData.supportMarkerCount >= 2 ? 0.75 : taskData.supportMarkerCount === 1 ? -0.25 : -1.25;
    score += taskData.comparisonPresent ? 0.5 : -0.5;
    score += taskData.conclusionPresent ? 0.25 : -0.25;
    score += taskData.coverage.ratio >= 0.4 ? 0.5 : taskData.coverage.ratio < 0.25 ? -1 : 0;
  }

  if (stats.sentenceCount < 4) {
    score -= 0.75;
  }

  return clamp(Math.round(score), 1, 12);
}

function scoreOrganization(taskType, stats, taskData) {
  let score = 8;

  if (stats.paragraphCount >= 3) {
    score += 1;
  } else if (stats.paragraphCount === 2) {
    score += 0.25;
  } else {
    score -= 1.5;
  }

  if (stats.connectorCount >= 3) {
    score += 0.75;
  } else if (stats.connectorCount === 0) {
    score -= 0.75;
  }

  if (stats.longSentenceCount > 2) {
    score -= 0.75;
  }

  if (stats.fragmentCount > 1) {
    score -= 0.75;
  }

  if (stats.sentenceCount >= 5) {
    score += 0.5;
  } else {
    score -= 0.5;
  }

  if (stats.wordCount < 100) {
    score -= 1;
  }

  if (taskType === 'task1' && !taskData.purposeSentence) {
    score -= 0.5;
  }

  if (taskType === 'task2' && !taskData.conclusionPresent) {
    score -= 0.5;
  }

  return clamp(Math.round(score), 1, 12);
}

function scoreVocabulary(stats, coverage) {
  let score = 7.5;

  if (stats.uniqueRatio >= 0.58) {
    score += 1;
  } else if (stats.uniqueRatio >= 0.48) {
    score += 0.5;
  } else if (stats.uniqueRatio < 0.38) {
    score -= 1;
  }

  if (stats.repeatedCoreWordCount > 6) {
    score -= 0.75;
  }

  if (coverage.ratio >= 0.45) {
    score += 0.25;
  }

  if (stats.connectorCount >= 3) {
    score += 0.25;
  }

  if (stats.informalCount > 0) {
    score -= 0.75;
  }

  if (stats.wordCount < 100) {
    score -= 1;
  }

  return clamp(Math.round(score), 1, 12);
}

function scoreGrammar(stats) {
  let score = 7.5;

  if (stats.lowercaseICount > 0) {
    score -= 1;
  }

  if (stats.longSentenceCount > 2) {
    score -= 0.75;
  }

  if (stats.fragmentCount > 1) {
    score -= 0.75;
  }

  if (stats.repeatedWordCount > 0) {
    score -= 0.75;
  }

  if (stats.missingEndPunctuation) {
    score -= 0.5;
  }

  if (stats.exclamationCount > 1) {
    score -= 0.5;
  }

  score -= Math.min(2, stats.grammarHits.length * 0.8);

  if (stats.sentenceCount >= 4 && stats.longSentenceCount === 0 && stats.grammarHits.length === 0) {
    score += 0.5;
  }

  return clamp(Math.round(score), 1, 12);
}

function severityFromPenalty(penalty) {
  if (penalty >= 1.5) return 'high';
  if (penalty >= 0.75) return 'medium';
  return 'low';
}

function buildIssues(taskType, stats, taskData) {
  const issues = [];

  if (stats.wordCount < 120 || stats.wordCount > 220) {
    issues.push({
      category: taskType === 'task1' ? 'Prompt coverage' : 'Support and examples',
      severity: stats.wordCount < 100 ? 'high' : 'medium',
      explanation: `Your response is ${stats.wordCount} words. CELPIP answers usually work better when they stay close to 150-200 words.`,
      evidence: `${stats.wordCount} words`,
      fixNow: 'Write a quick 3-part plan first, then build to the target length with one useful detail in each paragraph.',
      lessonNeed: taskType === 'task1' ? 'prompt coverage' : 'support and examples',
      weight: 2,
    });
  }

  if (taskType === 'task1') {
    if (!taskData.purposeSentence) {
      issues.push({
        category: 'Prompt coverage',
        severity: 'high',
        explanation: 'The email does not state the purpose clearly enough in the opening.',
        evidence: stats.sentences[0] || 'Opening sentence is weak or missing.',
        fixNow: 'Open with one direct purpose sentence such as "I am writing to..."',
        lessonNeed: 'prompt coverage',
        weight: 2.5,
      });
    }

    if (!taskData.requestSentence) {
      issues.push({
        category: 'Prompt coverage',
        severity: 'medium',
        explanation: 'The email needs a clearer request so the reader knows exactly what action you want.',
        evidence: 'The action request is weak or missing.',
        fixNow: 'Add one sentence with a clear request near the end of the email.',
        lessonNeed: 'prompt coverage',
        weight: 1.8,
      });
    }

    if (!taskData.impactSentence) {
      issues.push({
        category: 'Support and examples',
        severity: 'medium',
        explanation: 'The reader needs one or two specific details about how the problem affects you.',
        evidence: 'Impact detail is thin or missing.',
        fixNow: 'Add one practical result such as a schedule problem, work problem, or extra cost.',
        lessonNeed: 'support and examples',
        weight: 1.4,
      });
    }

    if (taskData.toneTooCasual) {
      issues.push({
        category: 'Email tone',
        severity: 'medium',
        explanation: 'Some wording sounds too casual for a formal or semi-formal CELPIP email.',
        evidence: stats.sentences[0] || '',
        fixNow: 'Use polite request language and avoid slang or chat-style wording.',
        lessonNeed: 'email tone',
        weight: 1.7,
      });
    }
  } else {
    if (!taskData.clearPosition) {
      issues.push({
        category: 'Clear position',
        severity: 'high',
        explanation: 'Your opinion is not clear enough early in the response.',
        evidence: stats.sentences[0] || 'The opening does not show a clear choice.',
        fixNow: 'State your choice in the first sentence and keep that choice consistent.',
        lessonNeed: 'clear position',
        weight: 2.5,
      });
    }

    if (taskData.supportMarkerCount < 2) {
      issues.push({
        category: 'Support and examples',
        severity: taskData.supportMarkerCount === 0 ? 'high' : 'medium',
        explanation: 'The response needs fuller reasons and at least one concrete example.',
        evidence: 'Support is general or repetitive.',
        fixNow: 'Add one reason and one short real-life example in the body.',
        lessonNeed: 'support and examples',
        weight: taskData.supportMarkerCount === 0 ? 2.2 : 1.4,
      });
    }

    if (!taskData.comparisonPresent) {
      issues.push({
        category: 'Organization',
        severity: 'medium',
        explanation: 'Task 2 responses sound stronger when they briefly compare the other option.',
        evidence: 'The alternative option is not compared clearly.',
        fixNow: 'Add one short comparison with "however," "while," or "on the other hand."',
        lessonNeed: 'organization',
        weight: 1.2,
      });
    }
  }

  if (stats.paragraphCount <= 1) {
    issues.push({
      category: 'Organization',
      severity: 'high',
      explanation: 'One block of text is hard for a CELPIP rater to follow.',
      evidence: `${stats.paragraphCount} paragraph`,
      fixNow: 'Use at least three clear paragraph blocks: opening, support, and closing/conclusion.',
      lessonNeed: 'organization',
      weight: 2,
    });
  } else if (stats.connectorCount === 0) {
    issues.push({
      category: 'Linking',
      severity: 'medium',
      explanation: 'Your ideas need clearer signals between sentences and paragraphs.',
      evidence: 'Few or no linking words appear.',
      fixNow: 'Add simple connectors such as "because," "however," "for example," and "overall."',
      lessonNeed: 'linking',
      weight: 1.1,
    });
  }

  if (stats.longSentenceCount > 2 || stats.fragmentCount > 1 || stats.missingEndPunctuation) {
    const penalty = (stats.longSentenceCount > 2 ? 1 : 0) + (stats.fragmentCount > 1 ? 1 : 0) + (stats.missingEndPunctuation ? 0.75 : 0);
    issues.push({
      category: 'Sentence boundaries',
      severity: severityFromPenalty(penalty),
      explanation: 'Some sentences are too long, too short, or not punctuated clearly enough.',
      evidence: stats.sentences.find((sentence) => splitWords(sentence).length >= 32) || 'Sentence control is uneven.',
      fixNow: 'Read one paragraph slowly and split any sentence that tries to do too much.',
      lessonNeed: 'sentence boundaries',
      weight: penalty,
    });
  }

  if (stats.grammarHits.length > 0 || stats.lowercaseICount > 0) {
    const firstHit = stats.grammarHits[0];
    issues.push({
      category: firstHit?.category || 'Grammar control',
      severity: stats.grammarHits.length >= 2 || stats.lowercaseICount > 1 ? 'high' : 'medium',
      explanation: firstHit?.explanation || 'Grammar control drops in a few places.',
      evidence: firstHit?.evidence || (stats.lowercaseICount > 0 ? 'lowercase "i"' : ''),
      fixNow: firstHit?.fixNow || 'Edit slowly for verb forms, sentence starts, and common high-frequency patterns.',
      lessonNeed: firstHit?.lessonNeed || 'agreement',
      weight: stats.grammarHits.length >= 2 ? 1.8 : 1.1,
    });
  }

  if (stats.uniqueRatio < 0.38 || stats.repeatedCoreWordCount > 6) {
    issues.push({
      category: 'Word choice',
      severity: 'medium',
      explanation: 'Some words repeat too much, so the writing starts to sound flat.',
      evidence: `Unique-word ratio: ${(stats.uniqueRatio * 100).toFixed(0)}%`,
      fixNow: 'Replace one repeated basic word with a more exact word or phrase in each paragraph.',
      lessonNeed: 'word choice',
      weight: 1.1,
    });
  }

  if (issues.length < 3 && stats.connectorCount < 3) {
    issues.push({
      category: 'Linking',
      severity: 'low',
      explanation: 'You can guide the reader even better with a few more simple connectors.',
      evidence: 'Linking language is present, but still limited.',
      fixNow: 'Add one connector that shows reason, contrast, or conclusion more clearly.',
      lessonNeed: 'linking',
      weight: 0.6,
    });
  }

  if (issues.length < 3 && stats.uniqueRatio < 0.58) {
    issues.push({
      category: 'Word choice',
      severity: 'low',
      explanation: 'The writing would sound stronger with a little more variety in key words and phrases.',
      evidence: `Unique-word ratio: ${(stats.uniqueRatio * 100).toFixed(0)}%`,
      fixNow: 'Revise one repeated word in each paragraph and replace it with a more exact phrase.',
      lessonNeed: 'word choice',
      weight: 0.55,
    });
  }

  const fallbackPool = [
    {
      category: taskType === 'task1' ? 'Support and examples' : 'Organization',
      severity: 'low',
      explanation: taskType === 'task1'
        ? 'One more concrete detail would make the email sound more convincing.'
        : 'A slightly clearer ending would make the position feel more complete.',
      evidence: '',
      fixNow: taskType === 'task1'
        ? 'Add one practical detail that shows the result of the problem.'
        : 'Finish with one short sentence that repeats your choice clearly.',
      lessonNeed: taskType === 'task1' ? 'support and examples' : 'organization',
      weight: 0.5,
    },
    {
      category: 'Word choice',
      severity: 'low',
      explanation: 'A little more variety in key phrases would make the response sound stronger.',
      evidence: '',
      fixNow: 'Replace one repeated word with a more exact phrase during revision.',
      lessonNeed: 'word choice',
      weight: 0.45,
    },
    {
      category: 'Linking',
      severity: 'low',
      explanation: 'A slightly clearer connector would make the reader’s job easier.',
      evidence: '',
      fixNow: 'Add one connector that shows contrast, reason, or conclusion more clearly.',
      lessonNeed: 'linking',
      weight: 0.4,
    },
  ];

  const deduped = [];
  const seen = new Set();
  for (const issue of issues) {
    const key = `${issue.category}|${issue.fixNow}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(issue);
  }

  for (const fallback of fallbackPool) {
    if (deduped.length >= 3) {
      break;
    }
    const key = `${fallback.category}|${fallback.fixNow}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(fallback);
  }

  deduped.sort((left, right) => right.weight - left.weight);
  return deduped.slice(0, 6);
}

function buildStrengths(taskType, stats, taskData, traitScores) {
  const strengths = [];

  if (traitScores['Task fulfillment'] >= 8) {
    strengths.push(taskType === 'task1'
      ? 'The main purpose of the response is understandable.'
      : 'Your main opinion is visible to the reader.');
  }

  if (stats.paragraphCount >= 3) {
    strengths.push('The response uses paragraph breaks to separate ideas.');
  }

  if (stats.connectorCount >= 2) {
    strengths.push('You use some linking language to guide the reader.');
  }

  if (taskType === 'task1' && taskData.requestSentence) {
    strengths.push('The email includes a clear request for action.');
  }

  if (taskType === 'task2' && taskData.supportMarkerCount >= 2) {
    strengths.push('The response gives reasons to support the main choice.');
  }

  if (traitScores.Grammar >= 8) {
    strengths.push('Most sentences are easy to follow.');
  }

  if (traitScores.Vocabulary >= 8) {
    strengths.push('Word choice is clear enough for the task.');
  }

  if (strengths.length < 3) {
    strengths.push('The response stays on the main topic.');
  }

  return [...new Set(strengths)].slice(0, 4);
}

function buildCriterionComments(taskType, traitScores) {
  const taskComment = taskType === 'task1'
    ? traitScores['Task fulfillment'] >= 9
      ? 'The email covers the main job clearly and sounds appropriate for the reader.'
      : traitScores['Task fulfillment'] >= 7
        ? 'The email purpose is visible, but one task point or tone choice still needs better control.'
        : 'Important task points or tone choices are missing, so the email feels incomplete.'
    : traitScores['Task fulfillment'] >= 9
      ? 'The response makes a clear choice and supports it in a convincing way.'
      : traitScores['Task fulfillment'] >= 7
        ? 'The position is understandable, but the support is still uneven or too general.'
        : 'The main choice is weak or late, so the response does not feel fully developed.';

  const organizationComment = traitScores.Organization >= 9
    ? 'Ideas move in a clear order and each paragraph has a clear job.'
    : traitScores.Organization >= 7
      ? 'The organization mostly works, but some links between ideas are still weak.'
      : 'The response needs clearer paragraph control and stronger transitions.';

  const vocabularyComment = traitScores.Vocabulary >= 9
    ? 'Word choice is clear and reasonably precise for the task.'
    : traitScores.Vocabulary >= 7
      ? 'Vocabulary is good enough for the task, but some wording is repetitive or not exact enough.'
      : 'Vocabulary stays too basic or too repetitive, so the writing sounds limited.';

  const grammarComment = traitScores.Grammar >= 9
    ? 'Grammar is mostly controlled, with only small slips that do not block meaning.'
    : traitScores.Grammar >= 7
      ? 'Grammar is understandable overall, but recurring sentence-level errors still lower the score.'
      : 'Grammar problems appear often enough to affect clarity and confidence.';

  return {
    'Task fulfillment': taskComment,
    Organization: organizationComment,
    Vocabulary: vocabularyComment,
    Grammar: grammarComment,
  };
}

function buildImprovementPriorities(issues) {
  const priorities = issues.map((issue) => issue.fixNow);
  return [...new Set(priorities)].slice(0, 4);
}

function rewriteOpeningTask1(promptKeywords) {
  const phrase = promptKeywords.length ? promptKeywords.slice(0, 3).join(' ') : 'this issue';
  return `I am writing to report ${phrase} and to request your help with it.`;
}

function rewriteRequestTask1(promptKeywords) {
  const phrase = promptKeywords.includes('refund')
    ? 'review the charge and issue a refund'
    : promptKeywords.includes('reschedule')
      ? 'help me arrange a new time'
      : 'review this situation and let me know the next step';
  return `I would appreciate it if you could ${phrase}.`;
}

function rewriteOpeningTask2(chosenOption) {
  const option = chosenOption || 'this option';
  const beVerb = /s$/i.test(option.trim()) ? 'are' : 'is';
  return `I believe ${option.toLowerCase()} ${beVerb} the better choice because ${beVerb} more practical for most people.`;
}

function rewriteSupportTask2(chosenOption) {
  const option = chosenOption || 'this choice';
  return `For example, ${option.toLowerCase()} can save time, reduce stress, and make daily routines easier to manage.`;
}

function splitLongSentence(sentence) {
  const cleanSentence = normalizeText(sentence);
  const match = cleanSentence.match(/^(.+?,)\s+(but|and|so|because|which)\s+(.+)$/i);
  if (!match) {
    return `${cleanSentence.replace(/\s+/g, ' ').trim()}. This second sentence should give one clear reason or example.`;
  }

  const firstPart = match[1].replace(/,$/, '.');
  const connector = match[2].toLowerCase();
  const secondPart = match[3].replace(/\.$/, '');
  const starter = connector === 'because'
    ? 'This is because'
    : connector === 'which'
      ? 'This means'
      : 'In addition';
  return `${firstPart} ${starter} ${secondPart}.`;
}

function buildRewriteSuggestions(taskType, stats, taskData) {
  const suggestions = [];

  if (taskType === 'task1' && !taskData.purposeSentence) {
    suggestions.push({
      before: stats.sentences[0] || 'The opening does not show the purpose clearly yet.',
      after: rewriteOpeningTask1(taskData.promptKeywords),
      why: 'A direct purpose sentence helps the reader understand the job of the email immediately.',
    });
  }

  if (taskType === 'task1' && !taskData.requestSentence) {
    suggestions.push({
      before: 'The request is not clear enough yet.',
      after: rewriteRequestTask1(taskData.promptKeywords),
      why: 'A clear request tells the reader what action you want.',
    });
  }

  if (taskType === 'task2' && !taskData.clearPosition) {
    suggestions.push({
      before: stats.sentences[0] || 'The opinion is too general in the opening.',
      after: rewriteOpeningTask2(taskData.chosenOption),
      why: 'A direct position sentence makes the whole response easier to follow.',
    });
  }

  if (taskType === 'task2' && taskData.supportMarkerCount < 2) {
    suggestions.push({
      before: 'The support is too general here.',
      after: rewriteSupportTask2(taskData.chosenOption),
      why: 'A short concrete example makes your choice more believable.',
    });
  }

  if (stats.longSentenceCount > 2) {
    const longSentence = stats.sentences.find((sentence) => splitWords(sentence).length >= 32);
    if (longSentence) {
      suggestions.push({
        before: longSentence,
        after: splitLongSentence(longSentence),
        why: 'Two shorter sentences are easier for the reader to process than one overloaded sentence.',
      });
    }
  }

  for (const hit of stats.grammarHits) {
    if (!hit.better) {
      continue;
    }

    suggestions.push({
      before: hit.evidence,
      after: hit.better,
      why: hit.explanation,
    });

    if (suggestions.length >= 3) {
      break;
    }
  }

  if (suggestions.length < 2) {
    if (taskType === 'task1') {
      suggestions.push({
        before: 'Thanks',
        after: 'Thank you for your time and consideration. I look forward to your response.',
        why: 'A stronger closing helps the email sound complete and professional.',
      });
    } else {
      const option = taskData.chosenOption?.toLowerCase() || 'this option';
      const beVerb = /s$/i.test(option.trim()) ? 'are' : 'is';
      suggestions.push({
        before: 'Both choices are good.',
        after: `Although both choices have value, ${option} ${beVerb} still the better choice for most people.`,
        why: 'This keeps the comparison brief while protecting your main position.',
      });
    }
  }

  if (suggestions.length < 2) {
    if (taskType === 'task1') {
      suggestions.push({
        before: 'The support is too general here.',
        after: 'Because the noise continues after midnight, I arrive at work tired and cannot concentrate well the next morning.',
        why: 'A specific impact sentence makes the complaint sound more real and more persuasive.',
      });
    } else {
      suggestions.push({
        before: 'The support is too general here.',
        after: rewriteSupportTask2(taskData.chosenOption),
        why: 'A short concrete example makes the body paragraph stronger.',
      });
    }
  }

  return suggestions.slice(0, 3);
}

function buildLessonNeeds(issues) {
  return [...new Set(issues.map((issue) => issue.lessonNeed).filter(Boolean))].slice(0, 6);
}

function buildNextPracticeSteps(taskType, stats, issues) {
  const steps = [];

  if (taskType === 'task1') {
    steps.push('Before writing again, plan your purpose, the impact, and your request in three short notes.');
  } else {
    steps.push('Before writing again, choose one side clearly and list two supporting reasons.');
  }

  if (issues.some((issue) => issue.lessonNeed === 'support and examples')) {
    steps.push('Add one real-life detail or short example in each body paragraph.');
  }

  if (issues.some((issue) => issue.lessonNeed === 'sentence boundaries' || issue.lessonNeed === 'agreement')) {
    steps.push('Leave two minutes to read your answer slowly and check every sentence boundary and verb.');
  }

  if (stats.wordCount < 140 || stats.wordCount > 220) {
    steps.push('Aim for about 150-200 words so you have enough space to develop the task without losing control.');
  } else {
    steps.push('Keep the same length, but make each sentence work harder for the task.');
  }

  return [...new Set(steps)].slice(0, 4);
}

function buildOverallSummary(taskType, overallLevel, strengths, issues) {
  const levelMeta = getLevelMeta(overallLevel);
  const mainStrength = strengths[0] || 'The main message is understandable.';
  const mainIssue = issues[0]?.explanation || 'The next step is to make the response more precise and better organized.';
  const taskLine = taskType === 'task1'
    ? 'A CELPIP rater would focus on purpose, tone, and complete prompt coverage here.'
    : 'A CELPIP rater would focus on clear position, support, and comparison here.';

  return `This response is around CELPIP Level ${overallLevel} (${levelMeta.label}). ${mainStrength} ${mainIssue} ${taskLine}`;
}

export function evaluateCelpipWriting({
  taskType = 'task1',
  promptTitle = '',
  promptText = '',
  promptInstructions = [],
  responseText = '',
}) {
  const stats = buildStats(responseText);
  const promptKeywords = extractPromptKeywords(promptTitle, promptText, promptInstructions);
  const coverage = calculatePromptCoverage(responseText, promptKeywords);

  const taskData = taskType === 'task1'
    ? analyzeTask1(stats, promptTitle, promptText, promptInstructions, coverage)
    : analyzeTask2(stats, promptTitle, promptText, promptInstructions, coverage);

  const traitScores = {
    'Task fulfillment': scoreTaskFulfillment(taskType, stats, taskData),
    Organization: scoreOrganization(taskType, stats, taskData),
    Vocabulary: scoreVocabulary(stats, coverage),
    Grammar: scoreGrammar(stats),
  };

  let overallLevel = clamp(
    Math.round(
      (traitScores['Task fulfillment'] * 0.35)
      + (traitScores.Organization * 0.25)
      + (traitScores.Vocabulary * 0.2)
      + (traitScores.Grammar * 0.2)
    ),
    1,
    12,
  );

  if (stats.wordCount < 100) {
    overallLevel = Math.max(1, overallLevel - 1);
  }

  const issues = buildIssues(taskType, stats, taskData);
  const strengths = buildStrengths(taskType, stats, taskData, traitScores);

  return {
    overallLevel,
    descriptor: getLevelMeta(overallLevel).label,
    overallSummary: buildOverallSummary(taskType, overallLevel, strengths, issues),
    traitScores,
    criterionComments: buildCriterionComments(taskType, traitScores),
    strengths,
    improvementPriorities: buildImprovementPriorities(issues),
    errorAnalysis: issues.map(({ category, severity, explanation, evidence, fixNow }) => ({
      category,
      severity,
      explanation,
      evidence,
      fixNow,
    })),
    rewriteSuggestions: buildRewriteSuggestions(taskType, stats, taskData),
    lessonNeeds: buildLessonNeeds(issues),
    nextPracticeSteps: buildNextPracticeSteps(taskType, stats, issues),
  };
}
