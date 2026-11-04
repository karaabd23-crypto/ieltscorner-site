# IELTS Corner self-improving loop

State for the weekly loop. Data only; this branch never deploys.

## Routines
- Loop 1, Monday 16:00 UTC: measure, judge, decide. Writes the SEO and CRO reports, scores revenue pages, closes finished experiments, writes `hypothesis-YYYY-WW.md`.
- Loop 2, Tuesday 16:00 UTC: design, build, ship. Builds the one change from the hypothesis on a `claude/loop-*` branch, opens a PR, merges only allowed classes after build, layout audit and accessibility checks pass.
- Loop 3, Thursday 13:47 UTC: inspect and fix. Finds problems by inspection (`reports/loop/inspect-*`) and fixes allowed ones.

## Files (all under cro/loop/ unless noted)
- `experiments.jsonl`: one JSON object per experiment: week, id, page, hypothesis, change, metric, baseline, predicted, stop_week, pr, merged_at, status, result, lesson.
- `hypothesis-YYYY-WW.md` (ISO week): this week's single decision.
- `backlog.md`: ranked candidate changes with evidence and risk class.
- `judges.md`: the four judge rubrics and which judges predicted well.
- `lessons.md`: lessons and the Playbook.
- `reports/loop/`: judge scores, monthly reviews, inspections. `reports/seo/`, `reports/cro/`: weekly analyses and open-items ledgers.

## realVisitors rule
Most raw GA4 traffic is automated. Until the snapshot has its own field, realVisitors = all sessions except Direct-channel desktop sessions with bounce above 0.85. The snapshot has no Direct x desktop cross-segment yet, so the working proxy is non-Direct visitors (a floor: it omits real Direct visitors). Report counts, not rates. Say "too few visitors to tell" when it applies.

## Risk classes
- needs-Kay: prices, payments or Stripe and checkout code, student accounts or data, legal pages, anything emailed to subscribers, deleting or redirecting more than 5 URLs.
- allowed: everything else.
