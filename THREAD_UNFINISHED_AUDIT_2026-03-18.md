# Thread Audit: Unfinished, Partial, and Loose Ends

This file turns the long chat thread into a concrete status list.

## Still Open

1. Full human editorial pass of the entire website
   - Major lesson systems and many core blog pages were improved.
   - A true page-by-page teacher rewrite of every remaining static/support page is still not finished.

2. Telegram post quality monitoring
   - The generator is much better now, but this is not a one-and-done task.
   - Live scheduled posts still need periodic review and tightening.

3. Remaining small support pages
   - The largest support pages were improved tonight.
   - Some smaller pages may still need a final wording/design pass during the next full editorial sweep.

## Addressed Tonight

1. Remaining OpenAI-key reliance in routine automation
   - Lesson publishing workflow moved to fallback-only generation.
   - Monthly cancellation insights no longer depend on model calls.

2. Dead Telegram story paths
   - Removed old story script and scheduled story function.
   - Removed stale package scripts that still exposed the story flow.

3. Duplicate weekly bot-guide workflow risk
   - Removed the older duplicate bot-tutorial workflow to reduce duplicate-post risk.

4. Newsletter digest quality
   - Added a stronger weekly study-plan section.
   - Added more visible social buttons and a more teacher-like intro/subject line.

5. Support-page trust/copy cleanup
   - Improved [src/pages/contact.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/contact.astro)
   - Improved [src/pages/faq.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/faq.astro)
   - Improved [src/pages/blog/index.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/blog/index.astro)
   - Improved [src/pages/webinar.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/webinar.astro)
   - Improved [src/pages/ebook/index.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/ebook/index.astro)
   - Improved [src/pages/privacy.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/privacy.astro)
   - Improved [src/pages/terms.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/terms.astro)
   - Softened/reframed [src/pages/success-stories.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/success-stories.astro)
   - Cleaned small confirmation pages under [src/pages/newsletter](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/newsletter), [src/pages/webinar](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/webinar), and [src/pages/book](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/book)

6. Newsletter subscriber visibility inside the product
   - Added a private dashboard page at [src/pages/admin/newsletter.astro](c:/Users/Karaa/Documents/ieltscorner-site/src/pages/admin/newsletter.astro)
   - Added a protected summary endpoint at [netlify/functions/newsletter-stats.mjs](c:/Users/Karaa/Documents/ieltscorner-site/netlify/functions/newsletter-stats.mjs)
   - This still requires `NEWSLETTER_DASHBOARD_TOKEN`, `NETLIFY_ACCESS_TOKEN`, and `NETLIFY_SITE_ID` in the environment

## Repo Hygiene Notes

1. `.cache/` is local runtime state only and should stay uncommitted.
2. This audit should be updated again after the next full editorial pass.
