# Student reviews data (`reviews.json`)

This file holds **real, consented student reviews only**. It starts empty.
Never add fabricated or composite entries here. (The old fake testimonials —
Priya M., Ahmed K., etc. — were removed on purpose.)

## How a review gets here

1. A student books 10+ lessons.
2. Kit sends them a review request (see the manual Kit task below).
3. The student replies / fills the form with their words and consent.
4. Add an entry to the array in `reviews.json` (paste it in, or have the
   automation append it). The site publishes it automatically:
   - It appears in the "What students say" grid on `/success-stories`.
   - It gets its own standalone case-study page at `/success-stories/<slug>`
     (good for SEO and shareable links) when `story` is filled in.

## Entry shape

```json
{
  "slug": "maria-clb7-to-clb9",
  "name": "Maria G.",
  "consent": true,
  "exam": "CELPIP",
  "result": "CLB 7 to CLB 9",
  "skillFocus": "Writing",
  "quote": "Short quote in the student's own words.",
  "story": "Optional longer paragraph for the standalone case-study page. Leave empty to show the review only in the grid.",
  "date": "2026-06-15"
}
```

- `consent` MUST be `true` for the entry to render. Entries without explicit
  consent are skipped by the site.
- `slug` must be unique and URL-safe (used for the case-study page URL).
- `story` is optional. With it, a full case-study page is generated. Without
  it, the review shows only in the grid.

## Review-request automation (built — see KIT_AUTOMATIONS.md)

This is now automated. When a customer buys 10+ tutoring sessions they are
tagged `review-request` in Kit, and a weekly scheduled broadcast asks them for
a review (then tags them `review-requested` so they are not re-asked).

The only manual step left is curation: when a real review comes in with
consent, append an entry to `reviews.json` (or wire the response form to append
it). Everything published here must still be real and consented.
