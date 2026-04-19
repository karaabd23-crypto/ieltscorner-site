# CELPIP Reading Deployment Checklist

## Required Netlify Environment Variables

- `STRIPE_API_KEY`
- `CELPIP_READING_PRICE_ID`

Notes:
- Use the recurring Stripe **price ID** for the reading subscription, not the product ID.
- The current pricing in the UI is set up for `CA$20/month`.
- Netlify normally provides `URL` automatically, which the checkout function already uses to build success and cancel URLs.

## Stripe Setup

- Confirm the reading product is a recurring monthly subscription.
- Confirm the price attached to `CELPIP_READING_PRICE_ID` is the intended live monthly plan.
- Make sure the product is active in Stripe.
- If promotion codes should work in production, confirm they are enabled for the live account.

## Production Flow Covered by This Release

- `/celpip/reading` shows the cleaner test catalog page.
- `/celpip/reading/free-test` opens the dedicated exam-style screen.
- The timer starts automatically.
- The test scores immediately after submission.
- Weak areas are summarized after scoring.
- Results link users to relevant reading lessons.
- Stripe checkout returns users to the free-test results screen.
- The returned Stripe session is validated server-side before premium review is unlocked.
- Premium users can open a Stripe billing portal to manage billing details or cancel automatically.
- Cancellation is configured for end-of-period behavior so users keep access through the paid term.

## Smoke Test After Deploy

1. Open `/celpip/reading`.
2. Click `Start Free Test` and confirm it opens `/celpip/reading/free-test`.
3. Confirm the timer starts without user action.
4. Answer a few questions and submit the test.
5. Confirm the score report appears immediately.
6. Confirm weak-area lesson links open valid lesson pages.
7. Click the premium unlock flow and confirm Stripe checkout opens.
8. Complete a test-mode purchase in Stripe and confirm the user returns to `/celpip/reading/free-test?checkout=success...`.
9. Confirm premium review unlocks on the returned results screen.
10. Test the Stripe cancel flow and confirm the user returns cleanly without unlocking access.
11. While premium is active, click `Manage subscription` and confirm the billing portal opens.
12. In the portal, confirm cancellation is available and set to end at period end.

## Local Testing

- Use `netlify dev` for full Stripe + function testing.
- `npm run build` verifies the static build, but plain `astro dev` does not simulate Netlify Functions the same way.

## Known Scope Limits

- The extra premium tests are currently catalog items, not separate playable premium routes yet.
- Premium access is validated from the Stripe checkout session and stored client-side for return visits on the same device/browser.
- A repo-wide lesson frontmatter audit currently reports many older legacy lesson files as missing frontmatter; the two new CELPIP reading lesson files added for this feature are valid.
