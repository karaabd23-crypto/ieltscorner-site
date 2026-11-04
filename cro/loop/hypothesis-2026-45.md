# Hypothesis 2026-45

- **id:** 2026-45-ai-feedback-hide-zero-counter
- **page and files:** `/ai-feedback/` and `/celpip/writing/ai-feedback/` (301s to `/ai-feedback/`); `src/components/CelpipPracticeHub.astro` lines 146 and 1597 to 1613 (`#hub-essays-today-count`).
- **change:** Hide the "N essays submitted today" line unless the real count from `celpip-writing-stats` is at least 5. Keep the HTML element hidden by default (no flash of "0"), drop the hard-coded "0 essays submitted today" fallback text, and keep the subscriber count logic unchanged. No invented numbers; the count shown when above the threshold stays the real value.
- **why:** Judges and inspection on 2026-11-04: the first thing a visitor sees beside the free tool prompt is "0 essays submitted today", which tells an anxious test taker that nobody uses it. /ai-feedback/ is the top revenue page for real traffic (34 visitors in 2026-44, 42 in 2026-43, 22 in 2026-42) and has produced 0 `ai_feedback_checkout_click` events in 2026-41 to 2026-44 (visits 6, 22, 32, 34). Real visitors are about 49 a week (non-Direct, 2026-44; 54 in 2026-43).
- **metric:** `ai_feedback_checkout_click` events per week from the GA4 snapshot (all sessions, since realVisitors is not in the snapshot yet), with counts only.
- **baseline:** 0 events on 34 visits (2026-44); 0 on 32 (2026-43); 0 on 22 (2026-42). Four-week total 0 events.
- **predicted effect:** 1 or more events in two weeks. Realistic expectation is "too few visitors to tell"; the change is justified on honesty and trust grounds, not on statistics.
- **stop_week:** 2026-48
- **risk class:** allowed (display text only, no checkout code, prices or data).
- **loop 2 note:** open the housekeeping PR for backlog item a) (PROTOCOL.md merge rule) before this one, since self-merge depends on it. Check `hermes-coordination/ACTIVE_WORK.md` before claiming `CelpipPracticeHub.astro`.
