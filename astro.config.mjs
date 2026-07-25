// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

/**
 * Routes that must NOT appear in the public sitemap. Submitting private, utility,
 * noindex, or force-redirected URLs wastes crawl budget and tells Google the site
 * is low quality — a direct contributor to the 2026-07 coverage crash (indexed
 * pages fell 285 → 3). Each entry is matched against the URL pathname.
 *
 * Kept in sync with pages that set `noindex` in their layout and with the
 * force-302 rules in netlify.toml (/webinar, /essay-correction).
 */
const SITEMAP_EXCLUDE = [
  /^https?:\/\/[^/]+\/account\//, // auth + private account area
  /\/book\/paid\//, // paid booking (also Disallowed in robots.txt)
  /\/owner\//, // internal owner tools
  /\/checkout-intent\//,
  /\/submit\//,
  /\/submitted\//,
  /\/thank-you(\/|$)/, // all thank-you confirmation pages
  /\/thanks(\/|$)/,
  /\/success(\/|$)/,
  /\/newsletter\//,
  /\/review(\/|$)/,
  /\/webinar(\/|$)/, // force-302 to / in netlify.toml
  /\/essay-correction(\/|$)/, // force-302 to / in netlify.toml
  /\/celpip\/reading-guide\//, // noindex
  /\/celpip\/free-reading-guide\/thanks\//,
];

// https://astro.build/config
export default defineConfig({
  site: 'https://ieltscorner.ca',
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !SITEMAP_EXCLUDE.some((pattern) => pattern.test(page)),
    }),
  ],
});
