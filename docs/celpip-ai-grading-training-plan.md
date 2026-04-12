# CELPIP AI Grading Improvement Plan

## Why This Plan Exists
The current evaluator can over-score or under-score benchmark samples when the OpenAI path is unavailable and the rule-based fallback is used. We added sample calibration guardrails, but long-term credibility needs a structured quality loop.

## Important Constraint
For hosted API models, we cannot directly "train the base model" ourselves in production this week. The practical path is:
- better prompts and rubric constraints
- a benchmark dataset + scoring harness
- calibration rules
- optional fine-tuning or model upgrade later

## Target Outcomes
- Keep benchmark sample scoring within +/-1 CLB for normal submissions.
- Ensure exact/near-copy benchmark submissions never receive contradictory levels.
- Improve consistency across Task 1 and Task 2 scoring dimensions.
- Make quality measurable before releases.

## Phase 1: Benchmark and Measurement (1-2 days)
1. Lock a benchmark set:
- Use the existing CLB 5/7/9/11 sample banks from `src/lib/celpipWritingData.mjs`.
- Add 20-40 additional human-reviewed student responses per task type (mixed quality).

2. Define evaluation metrics:
- Overall level MAE (mean absolute error) vs human label.
- Trait-level MAE for Task fulfillment / Organization / Vocabulary / Grammar.
- Over-scoring rate and under-scoring rate by CLB band.

3. Automate checks:
- Keep `scripts/check-celpip-sample-calibration.mjs` in CI.
- Add a second script for non-sample benchmark essays (human-labeled set).

## Phase 2: Prompt and Scoring Tightening (1-2 days)
1. Strengthen prompt constraints in `netlify/functions/evaluate-celpip-writing.mjs`:
- enforce stricter penalties for vague support and weak task coverage
- require explicit reasoning per trait
- cap trait inflation when evidence is weak

2. Add post-processing calibration:
- keep sample-match calibration from `src/lib/celpipScoreCalibration.mjs`
- add band-drift checks (e.g., prevent CLB 5-style feature patterns from landing at CLB 8+)

3. Run A/B evaluations:
- compare old prompt vs tightened prompt on benchmark set
- choose version with lower MAE and lower over-scoring at CLB 5/7

## Phase 3: Human-in-the-Loop Quality Cycle (weekly)
1. Review 20 recent anonymized submissions weekly.
2. Compare AI score vs instructor score.
3. Tag failure patterns (tone mismatch, support depth, grammar inflation).
4. Update prompt/calibration rules monthly based on those tags.

## Optional Phase 4: Model Upgrade / Fine-Tuning (longer)
If quality still plateaus:
- test a stronger model for scoring reliability
- evaluate cost/latency impact
- consider fine-tuning only with a high-quality labeled dataset and stable rubric

## Release and Safety Rules
- Any prompt or calibration change must pass benchmark checks first.
- Keep the fallback path active, but clearly monitor when fallback is used.
- Do not remove sample calibration until non-sample MAE and variance are consistently acceptable.

## Interview Talking Points
- "We moved from subjective demos to measurable grading quality using benchmark scripts."
- "We added calibration safeguards to prevent credibility-breaking sample mis-scores."
- "We treat AI scoring as an instructional system with ongoing QA, not a one-time model call."
