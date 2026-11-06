# Backlog (highest value first)

Risk class in brackets. Updated 2026-11-05 (week 2026-45). Items c, d, e (partly) and f done 2026-11-05 by PRs 16 and 17 (contrast, aria, en dashes, tutoring weight, header logo).

1. [allowed] (PR 18 open, waiting for Kay to merge) **Chosen for 2026-45:** AI feedback pages: stop showing "0 essays submitted today" to visitors (see hypothesis-2026-45.md).
2. [allowed] a) Record the loop's merge rule in `hermes-coordination/PROTOCOL.md` by PR. Role row: "IELTS Corner loop routines (scheduled): claude/loop-* branch + PR; may merge their own PR after build, layout audit and accessibility checks pass, for allowed change classes only (Kay, 2026-11-04). Prices, payments, student data, legal pages and email sends stay with Kay." Housekeeping, not an experiment; loop 2 opens this PR first because self-merging depends on it.
3. [allowed] b) Add realVisitors to the weekly GA4 snapshot in `netlify/functions/cro-weekly-pull.ts` and the adapter, plus per-goal events from those sessions; bump schemaVersion. Evidence: 2026-44 had 419 of 465 visitors as Direct (bounce 0.86); the snapshot has no Direct x desktop cross-segment, so this loop can only use non-Direct visitors (49 in 2026-44) as a floor.
4. [allowed] c) Fix low text contrast on revenue pages, in `src/styles/theme-tokens.css` where the colour is shared. axe color-contrast failures on 2026-11-04: / 2, /ebook/ 8, /ai-feedback/ 4 (phone) and 19 (laptop), /celpip/reading/ 4, /celpip/writing/ai-feedback/ 4 and 19, /tutoring/ 2.
5. [allowed] d) Fix axe aria-required-children error on /ai-feedback/ and /celpip/writing/ai-feedback/.
6. [allowed] e) Cut /tutoring/ page weight from about 10 MB (other revenue pages 0.7 to 1.7 MB) with compressed responsive media.
7. [allowed] f) Remove en dashes from visible copy on /ebook/, /ai-feedback/, /celpip/reading/, /celpip/writing/ai-feedback/ (for example the reading time tile and the "words" label on the writing prompt card, seen 2026-11-04).
8. [allowed] i) Internal links from the most-visited lessons to the matching revenue page. Caution: the top lesson pages in 2026-43 and 2026-44 (grammar adjective pages, 22 to 34 visitors each with near-identical counts) look automated, so link from lessons that get organic or AI-assistant visits first.
9. [allowed] h) Free CELPIP writing sampler landing page as the email sign-up hook. Evidence: Kit has no live welcome sequence and the sampler email draft has no download link. Sending anything to subscribers is needs-Kay.
10. [allowed pages, needs-Kay to switch on payments] g) /shop and /shop/<product> for every English product: `src/content/products/`, `src/pages/shop/index.astro`, `[slug].astro`, one checkout function and one delivery function (also fixes bundle downloads being refused). Evidence: /shop returns 404 (checked live 2026-11-04), so email cannot send people there.
11. [allowed] j) /ai-feedback/ and /celpip/writing/ stuck out of Google's index for weeks: keep technical side clean. Manual Search Console "Request indexing" is needs-Kay.
12. [needs-Kay] New 2026-11-04: `/pte-core/simulator/` shows "Premium attempts unlocked" to every fresh visitor because `hasPremiumSession()` returns `true` with a "temporary open access" comment (`src/components/PteCoreSimulator.astro` line 232). Either the open access is intended (then relabel honestly) or the gate should be restored (payment gating is Kay's call).

13. [allowed] Watch: transient 500 on /celpip/reading/ at 360 on deploy preview 2026-11-05 (live and retries 200). Re-check in next inspect.
14. [allowed] Check / at 360: exam cards show a large empty gap under the subtitle (screenshot 2026-11-05). Judge by data before changing.
15. [allowed] Make `scripts/audit-site-layout.mjs --all` usable: it prints nothing until all 477 pages x widths finish (over 40 min). Add progress output and a --chunk option. Evidence: inspect 2026-11-05.
