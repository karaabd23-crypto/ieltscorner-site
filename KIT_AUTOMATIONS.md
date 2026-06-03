# Kit retention automations (live as of 2026-06-02)

Two retention email flows, built to work on Kit's **free plan** (no native
visual automations/sequences), so they run as **scheduled broadcasts** via
GitHub Actions — the same pattern as the existing newsletter digest.

## What was created in Kit via API

- Custom field **Daily prompt** (key `daily_prompt`) — set to `yes` when a
  subscriber opts in on the question-bank form.
- Tag **daily-prompt** (id `20024388`) — daily-prompt audience.
- Tag **review-request** (id `20024389`) — applied automatically when a
  customer buys 10+ tutoring sessions.
- Tag **review-requested** (id `20024405`) — applied after the review email is
  sent, so nobody is asked twice.

## Flow 1 — Daily practice prompt

1. Subscriber ticks "send me a daily prompt" on `/questions` → they are tagged
   `daily-prompt` and the `daily_prompt` field is set (subscribe-newsletter.mjs).
2. `scripts/send-daily-prompt.mjs` runs daily (GitHub Actions
   `.github/workflows/kit-daily-prompt.yml`, 13:00 UTC), picks one real
   question from the question bank (rotating by day), and creates a Kit
   broadcast to the `daily-prompt` tag.

## Flow 2 — Review request after 10+ lessons

1. `validate-tutoring-session.mjs` computes `sessionsPurchased`. When it is
   `>= 10`, it tags the customer `review-request` in Kit.
2. `scripts/send-review-requests.mjs` runs weekly (GitHub Actions
   `.github/workflows/kit-review-requests.yml`, Mondays 14:00 UTC). It emails
   everyone tagged `review-request` **minus** `review-requested`, then tags
   them `review-requested`. Reviews collected this way go into
   `src/data/reviews.json` and publish automatically (see reviews.README.md).

## ACTION REQUIRED: add these GitHub Actions secrets

The workflows read these from `secrets`. `KIT_API_KEY` already exists (used by
the digest). Add the rest under repo Settings → Secrets and variables → Actions:

- `KIT_DAILY_PROMPT_TAG_ID` = `20024388`
- `KIT_REVIEW_REQUEST_TAG_ID` = `20024389`
- `KIT_REVIEW_REQUESTED_TAG_ID` = `20024405`

## ACTION REQUIRED: add these Netlify env vars (for the tutoring function)

So the live site tags 10+ session customers:

- `KIT_API_KEY` (likely already set for the newsletter function)
- `KIT_REVIEW_REQUEST_TAG_ID` = `20024389`
- `REVIEW_REQUEST_MIN_SESSIONS` = `10` (optional; defaults to 10)

## Testing

Each script supports a dry run (no send):

```
node scripts/send-daily-prompt.mjs --dry-run
node scripts/send-review-requests.mjs --dry-run
```

Both were dry-run verified against the live account on 2026-06-02.

## Notes / limits

- Free plan = no native sequences, so "send N days after trigger" precision is
  approximated by the weekly review-request cadence. If you upgrade Kit, these
  could become a true sequence, but the current setup is fully automated.
- The review email links to `REVIEW_FORM_URL` (currently `/contact/`). If you
  build a dedicated review form later, point that env var at it.
