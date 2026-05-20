# Traffic Audit: ieltscorner.ca

**Date:** 2026-05-18
**Conducted by:** Claude Code (claude-sonnet-4-6)
**Scope:** Full repo + site architecture analysis

---

## Summary

The technical SEO foundation is solid. The problem is almost entirely content volume and domain authority. The site has a well-built funnel, proper schema, clean redirects, and GA4 tracking. What it lacks is enough published pages to capture long-tail organic traffic, any backlink-worthy standalone resources, and Canada-specific content to match the actual reason users take these exams.

---

## Why the Site Does Not Get Enough Visitors

### 1. The Lesson Library Is 3% Built

The site architecture expects 305+ lessons. Only 10 are published. Each unpublished lesson is a missed URL that could rank for a specific low-competition keyword like "how to use abstract nouns in IELTS writing" or "passive voice CELPIP task 2." These long-tail pages, collectively, are the fastest path to organic traffic because individual keyword competition is near zero.

**Impact:** High. Fixing this alone can 10x indexed pages.

### 2. Blog Content Is Too Shallow to Win Competitive Keywords

All 23 blog posts average 750-850 words. Competitors targeting "IELTS Writing Task 2 structure" or "CELPIP writing tips" (British Council, Magoosh, PrepMyFuture) publish 2,500-4,000 word comprehensive guides with scored samples, tables, and downloadable content. Google rewards depth and completeness for competitive informational queries.

**Impact:** High. Top-5 rankings require substantially more content per post.

### 3. No Canadian Immigration Content

CELPIP exists almost exclusively because of Canadian permanent residency and citizenship requirements. The most searched queries in this niche are: "CELPIP score for Canadian PR," "IELTS for Express Entry," "what CLB level do I need for citizenship." The site has zero dedicated pages for these. Yet the teacher is TESL Canada certified -- this is a credibility mismatch with the content strategy.

**Impact:** High. These are high-intent searches with moderate competition.

### 4. No Backlinks

Backlinks are the primary ranking signal alongside content quality. The site has no pages designed to attract links organically: no original research, no interactive tools, no downloadable templates. Every competitor above this site has accumulated backlinks over years from education directories, immigration forums, and study communities.

**Impact:** Very high. No amount of content improvement fully compensates for zero authority.

### 5. Blog Publishing Has Stalled

All 23 blog posts appear to have been published in a single burst. Google rewards consistent publishing cadence as a freshness and editorial commitment signal. A dormant blog signals an unmaintained site and gradually erodes rankings.

**Impact:** Medium. Freshness is a tie-breaker for competitive queries.

### 6. Zero Local SEO

No pages target "IELTS Toronto," "CELPIP Vancouver," "IELTS tutor Calgary." Canada's immigrant population concentrates in specific cities and searches geographically. Local tutoring pages face weak competition because most online tutors do not build city-specific pages.

**Impact:** Medium. Easy wins with minimal content effort.

### 7. No YouTube/Social Funnel

Most IELTS/CELPIP teachers who dominate organic search also have YouTube channels with 50k-500k subscribers that feed their websites. Video content ranks directly in Google search results and creates a discovery engine separate from text SEO.

**Impact:** Medium-high. Compound growth driver but takes 6-12 months to build.

### 8. PTE Core Is Underdeveloped

PTE Core was accepted for Canadian immigration in 2024. Most established IELTS sites have not yet built deep PTE Core content. The site has a hub and simulator but thin content. First-mover advantage exists here.

**Impact:** Medium. Growing market with low current competition.

### 9. No Verifiable E-E-A-T Signals

Google's Experience, Expertise, Authoritativeness, and Trustworthiness signals require external verification. The About page mentions TESL Canada certification but there are no third-party mentions, guest posts on education sites, citations in other articles, or bylines on recognized publications. Self-reported credentials are insufficient.

**Impact:** Medium. Required for competitive YMYL (education) rankings.

---

## Improvement Plan: Priority Order

### Tier 1 -- Highest Impact (Do First)

**Suggestion 1: Finish the lesson library.**
Publish all planned lessons. Each targets a specific grammar or skill keyword with near-zero competition. 300 new indexed pages is the fastest path to traffic volume increase. Detailed implementation plan is in LESSON_EXPANSION_PLAN.md.

**Suggestion 2: Expand top blog posts to 2,000+ words.**
Pick the top 5 existing posts and rewrite them as comprehensive guides. Add scored sample answers, a common-mistakes table, a video embed slot, and a FAQ section (with FAQPage schema). Target length: 2,500 words minimum.

**Suggestion 3: Create a CELPIP for Canadian Immigration hub page.**
Title: "CELPIP Scores for Canadian PR and Citizenship | What You Actually Need."
Cover: Express Entry CLB requirements, citizenship test requirements, provincial nominee programs. This single page could outrank most competitors within 3-6 months because intent is high and most competitors treat it as an afterthought.

**Suggestion 4: Publish one new blog post every week without exception.**
Set a fixed publishing schedule. Use the lesson content as source material -- turn lesson clusters into blog articles. Frequency signals editorial commitment to Google.

### Tier 2 -- Build Authority

**Suggestion 5: Create a Band Score Estimator or CELPIP CLB Calculator tool.**
Interactive tools attract backlinks naturally. Other bloggers and immigration forums share tools. This is the most efficient backlink acquisition strategy because it requires zero outreach.

**Suggestion 6: Add city landing pages for Canada's top immigrant cities.**
Toronto, Vancouver, Calgary, Ottawa, Edmonton. Title pattern: "IELTS Preparation for [City] Residents | Online Tutoring." These rank quickly because local competition in online tutoring is weak.

**Suggestion 7: Create a "IELTS vs CELPIP vs PTE Core" comparison page.**
This is one of the most searched questions among Canadian immigrants choosing their exam. A definitive comparison table with CLB equivalents, test format, cost, and booking availability ranks for hundreds of queries and attracts links from immigration blogs and forums.

**Suggestion 8: Build a backlink acquisition strategy.**
Guest post on Canadian immigration blogs (CIC News, Moving2Canada, Settlement.org). Reach out to local immigrant settlement agencies and offer to be a resource. Submit to TESL Canada's educator directory. List on tutoring marketplaces (Wyzant, TutorOcean, Tutorax).

### Tier 3 -- Compound Growth

**Suggestion 9: Start a YouTube content strategy tied to the site.**
One video per week answering a specific exam question. Publish the written version as a blog post on the same day. YouTube videos rank directly in Google search and drive site visits. Cross-link every video to the corresponding lesson or blog post.

**Suggestion 10: Make the CELPIP writing sample library a standalone indexed resource.**
100 samples already exist. Make this browsable and filterable at /celpip/writing/samples with clear metadata (CLB level, task type, score band). Promote it in CELPIP Facebook groups and Reddit (r/CELPIP, r/ImmigrationCanada). Shareable resources get links without asking.

**Suggestion 11: Add Course and HowTo schema to lesson pages.**
This can trigger rich results in Google that increase click-through rate even at the same ranking position.

**Suggestion 12: Verify Google Search Console ownership and submit sitemap.**
No GSC verification file was found in the repo. Without GSC verification, there is no access to keyword rankings, impressions, or click-through data needed to make informed content decisions. This is free and takes five minutes.

**Suggestion 13: Target PTE Core aggressively now.**
Add 20 blog posts specifically for PTE Core, expand the question bank, and add a "PTE Core for Canadian immigration" page. First-mover advantage in a growing market compounds over time.

**Suggestion 14: Add full student case study pages.**
Not just a testimonials component -- full stories with before/after scores, the strategy used, and a quote. Title pattern: "How [Name] Went from CLB 7 to CLB 9 in 6 Weeks." These rank for "CELPIP success stories" queries and are shareable in immigration communities.

---

## Technical SEO Status (Reference)

| Item | Status |
|------|--------|
| Meta tags | Complete |
| Open Graph / Twitter Card | Complete |
| JSON-LD schema (Organization, WebPage, Article) | Complete |
| BreadcrumbList schema | Complete |
| FAQPage schema | Complete |
| Sitemap (auto-generated) | Complete |
| robots.txt | Complete |
| Canonical URLs | Complete |
| Domain consolidation redirects (301) | Complete |
| Google Analytics 4 | Complete |
| Conversion event tracking | Complete |
| A/B CTA testing infrastructure | Complete |
| Image optimization (Astro Image) | Not implemented |
| Product/Review/Course schema | Missing |
| Google Search Console verification | Not found in repo |
| Backlinks from external sites | None identified |
| Local SEO pages | None |
| Canada immigration content | None |
