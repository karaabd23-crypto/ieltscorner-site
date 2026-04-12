import {
  getLevelDescriptor,
  getPracticeHubPromptById,
  getPromptSampleResponses,
} from './celpipWritingData.mjs';

const SAMPLE_LEVEL_MAP = {
  clb5: 5,
  clb7: 7,
  clb9: 9,
  clb11: 11,
};

function normalizeForComparison(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeForComparison(value);
  return normalized ? normalized.split(' ') : [];
}

function tokenF1Similarity(a, b) {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const freqA = new Map();
  for (const token of aTokens) {
    freqA.set(token, (freqA.get(token) || 0) + 1);
  }

  const freqB = new Map();
  for (const token of bTokens) {
    freqB.set(token, (freqB.get(token) || 0) + 1);
  }

  let overlap = 0;
  for (const [token, countA] of freqA.entries()) {
    const countB = freqB.get(token) || 0;
    overlap += Math.min(countA, countB);
  }

  if (overlap === 0) return 0;

  const precision = overlap / aTokens.length;
  const recall = overlap / bTokens.length;
  return (2 * precision * recall) / (precision + recall);
}

function charTrigramDice(a, b) {
  const left = normalizeForComparison(a);
  const right = normalizeForComparison(b);
  if (left.length < 3 || right.length < 3) return 0;

  const toSet = (value) => {
    const set = new Set();
    for (let index = 0; index < value.length - 2; index += 1) {
      set.add(value.slice(index, index + 3));
    }
    return set;
  };

  const leftSet = toSet(left);
  const rightSet = toSet(right);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let intersection = 0;
  for (const gram of leftSet) {
    if (rightSet.has(gram)) intersection += 1;
  }

  return (2 * intersection) / (leftSet.size + rightSet.size);
}

/**
 * Returns sample-match metadata for exact/near-copy submissions.
 * This is used as a credibility guardrail so copied benchmark essays
 * cannot be scored at a different CLB level.
 */
export function detectSampleBenchmarkMatch({
  taskType,
  promptId,
  responseText,
  minTokenF1 = 0.9,
  minCombinedSimilarity = 0.9,
} = {}) {
  if (!taskType || !promptId || !responseText) return null;

  const prompt = getPracticeHubPromptById(taskType, promptId);
  if (!prompt) return null;

  const normalizedResponse = normalizeForComparison(responseText);
  if (!normalizedResponse) return null;

  const samples = getPromptSampleResponses(prompt);
  let bestMatch = null;

  for (const [sampleKey, sampleLevel] of Object.entries(SAMPLE_LEVEL_MAP)) {
    const sampleText = samples?.[sampleKey];
    if (!sampleText) continue;

    const normalizedSample = normalizeForComparison(sampleText);
    if (!normalizedSample) continue;

    const exactMatch = normalizedSample === normalizedResponse;
    const tokenF1 = tokenF1Similarity(normalizedResponse, normalizedSample);
    const trigramDice = charTrigramDice(normalizedResponse, normalizedSample);
    const combinedSimilarity = (tokenF1 * 0.7) + (trigramDice * 0.3);
    const nearCopy = tokenF1 >= minTokenF1 && combinedSimilarity >= minCombinedSimilarity;

    if (!exactMatch && !nearCopy) continue;

    const candidate = {
      sampleKey,
      sampleLevel,
      matchType: exactMatch ? 'exact' : 'near-copy',
      tokenF1,
      trigramDice,
      combinedSimilarity,
    };

    if (!bestMatch || candidate.combinedSimilarity > bestMatch.combinedSimilarity) {
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

export function calibrateReportToSample(report, sampleMatch) {
  if (!report || !sampleMatch?.sampleLevel) return report;

  const sampleLevel = Number(sampleMatch.sampleLevel);
  const sampleLabel = String(sampleMatch.sampleKey || '').toUpperCase();
  const levelMeta = getLevelDescriptor(sampleLevel);
  const calibratedTraitScores = {
    'Task fulfillment': sampleLevel,
    Organization: sampleLevel,
    Vocabulary: sampleLevel,
    Grammar: sampleLevel,
  };

  return {
    ...report,
    overallLevel: sampleLevel,
    descriptor: levelMeta?.label || report?.descriptor || 'CELPIP writing estimate',
    overallSummary:
      `This submission ${sampleMatch.matchType === 'exact' ? 'matches' : 'closely matches'} ` +
      `the built-in ${sampleLabel} sample for this prompt. ` +
      `The estimate is calibrated to CLB ${sampleLevel}.`,
    traitScores: calibratedTraitScores,
    criterionComments: {
      'Task fulfillment': 'This response matches a stored benchmark sample, so the estimate is anchored to that benchmark level.',
      Organization: 'Organization is calibrated to the matched benchmark sample.',
      Vocabulary: 'Vocabulary is calibrated to the matched benchmark sample.',
      Grammar: 'Grammar control is calibrated to the matched benchmark sample.',
    },
    strengths: [`Aligns with the ${sampleLabel} benchmark sample for this prompt.`],
    improvementPriorities: [
      'Write an original response to receive personalized scoring and diagnostic feedback.',
    ],
    errorAnalysis: [
      {
        category: 'Originality check',
        severity: 'medium',
        explanation: 'This text is very similar to a stored sample response, so personalized scoring reliability is limited.',
        evidence: `Similarity signal (${sampleMatch.matchType}) triggered benchmark calibration.`,
        fixNow: 'Write your own response without reusing sample sentences, then submit again.',
      },
    ],
    rewriteSuggestions: [],
    nextPracticeSteps: [
      'Write a fresh response for the same prompt without copying sample language.',
      'Submit again and focus on your own tone, support, and grammar control.',
      'Use sample essays only after scoring to compare structure and clarity.',
    ],
  };
}
