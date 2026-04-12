import { CELPIP_PROMPT_BANK, getPromptSampleResponses } from '../src/lib/celpipWritingData.mjs';
import { normalizeCelpipReport } from '../src/lib/celpipWritingFeedback.mjs';
import { evaluateCelpipWriting } from '../src/lib/celpipWritingEvaluator.mjs';
import {
  calibrateReportToSample,
  detectSampleBenchmarkMatch,
} from '../src/lib/celpipScoreCalibration.mjs';

const SAMPLE_TARGET_LEVELS = {
  clb5: 5,
  clb7: 7,
  clb9: 9,
  clb11: 11,
};

function summarizeBySample(rows) {
  const keys = ['clb5', 'clb7', 'clb9', 'clb11'];
  return keys.map((sampleKey) => {
    const subset = rows.filter((row) => row.sampleKey === sampleKey);
    const rawAvgDelta = subset.reduce((sum, row) => sum + row.rawDelta, 0) / (subset.length || 1);
    const calAvgDelta = subset.reduce((sum, row) => sum + row.calibratedDelta, 0) / (subset.length || 1);
    const unmatched = subset.filter((row) => !row.matchFound).length;
    return {
      sampleKey,
      total: subset.length,
      unmatched,
      rawAvgDelta: Number(rawAvgDelta.toFixed(2)),
      calibratedAvgDelta: Number(calAvgDelta.toFixed(2)),
    };
  });
}

const rows = [];

for (const taskType of ['task1', 'task2']) {
  const prompts = CELPIP_PROMPT_BANK[taskType] || [];

  for (const prompt of prompts) {
    const samples = getPromptSampleResponses(prompt);

    for (const [sampleKey, expectedLevel] of Object.entries(SAMPLE_TARGET_LEVELS)) {
      const responseText = samples[sampleKey];
      if (!responseText) continue;

      const rawReport = normalizeCelpipReport(
        evaluateCelpipWriting({
          taskType,
          promptTitle: prompt.title || prompt.id,
          promptText: prompt.scenario || prompt.question || '',
          promptInstructions: prompt.instructions || [],
          responseText,
        }),
        { taskType }
      );

      const sampleMatch = detectSampleBenchmarkMatch({
        taskType,
        promptId: prompt.id,
        responseText,
      });

      const calibratedReport = sampleMatch ? calibrateReportToSample(rawReport, sampleMatch) : rawReport;

      rows.push({
        taskType,
        promptId: prompt.id,
        sampleKey,
        expectedLevel,
        rawLevel: rawReport.overallLevel,
        calibratedLevel: calibratedReport.overallLevel,
        rawDelta: rawReport.overallLevel - expectedLevel,
        calibratedDelta: calibratedReport.overallLevel - expectedLevel,
        matchFound: Boolean(sampleMatch),
      });
    }
  }
}

const unmatchedRows = rows.filter((row) => !row.matchFound);
const failedCalibrations = rows.filter((row) => row.calibratedDelta !== 0);
const maxRawError = rows.reduce((max, row) => Math.max(max, Math.abs(row.rawDelta)), 0);
const maxCalibratedError = rows.reduce((max, row) => Math.max(max, Math.abs(row.calibratedDelta)), 0);

const summary = {
  totalRows: rows.length,
  unmatchedRows: unmatchedRows.length,
  failedCalibrations: failedCalibrations.length,
  maxRawError,
  maxCalibratedError,
  bySample: summarizeBySample(rows),
};

console.log(JSON.stringify(summary, null, 2));

if (unmatchedRows.length > 0 || failedCalibrations.length > 0) {
  console.error('\nCalibration check failed. First unmatched rows:');
  console.error(JSON.stringify(unmatchedRows.slice(0, 10), null, 2));
  console.error('\nFirst failed calibrated rows:');
  console.error(JSON.stringify(failedCalibrations.slice(0, 10), null, 2));
  process.exit(1);
}

console.log('\nCalibration check passed: all benchmark samples are anchored to their expected CLB levels.');
