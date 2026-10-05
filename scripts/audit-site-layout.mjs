#!/usr/bin/env node
// Layout + health audit for ieltscorner.ca, run against a local `astro preview`
// (or the live site via --base). For each page and viewport width it reports:
//   hscroll   page wider than the viewport
//   escape    text pushed outside the viewport (ignores intentional scrollers)
//   midword   a word wrapped across lines (hyphen breaks are ignored)
//   overlap   two visible text blocks drawn on top of each other
//   console   console errors and failed requests
//   images    <img> that failed to load
//   links     internal links that do not return 2xx/3xx (once per run)
// It also simulates a Google bottom anchor ad and checks the floating pill clears it.
//
// Usage:
//   npm run build && npx astro preview --port 4321 &
//   node scripts/audit-site-layout.mjs                       # key pages, all widths
//   node scripts/audit-site-layout.mjs --all                 # every page in dist/sitemap
//   node scripts/audit-site-layout.mjs --base=https://ieltscorner.ca --pages=/,/ebook/
//   node scripts/audit-site-layout.mjs --shots=/tmp/shots    # save full-page screenshots
// Exits 1 when any issue is found.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const BASE = String(args.base || 'http://localhost:4321').replace(/\/$/, '');
const WIDTHS = String(args.widths || '360,390,414,768,1280').split(',').map(Number);
const KEY_PAGES = ['/', '/ebook/', '/ai-feedback/', '/questions/', '/tutoring/', '/lessons/', '/celpip/', '/ielts/', '/pte-core/'];

async function loadPlaywright() {
  for (const spec of ['playwright', '/opt/node-tools/node_modules/playwright/index.mjs']) {
    try {
      return await import(spec);
    } catch {}
  }
  throw new Error('Playwright not found. Install it or run in an environment that provides it.');
}

async function sitemapPages() {
  const xml = await readFile(path.resolve('dist/sitemap-0.xml'), 'utf8');
  return [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
}

const pages = args.pages ? String(args.pages).split(',') : args.all ? await sitemapPages() : KEY_PAGES;

const { chromium } = await loadPlaywright();
const browser = await chromium
  .launch({ executablePath: '/opt/pw-browsers/chromium' })
  .catch(() => chromium.launch());

let total = 0;
const internalLinks = new Set();

function inspectPage() {
  const vw = window.innerWidth;
  const out = { hscroll: document.documentElement.scrollWidth - vw, escape: [], midword: [], overlap: [], images: [], links: [] };
  const hiddenByDetails = (el) => {
    const d = el.closest('details:not([open])');
    return d && !el.closest('summary');
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && b.width > 0 && b.height > 0 && !hiddenByDetails(el);
  };
  const fixedAncestor = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };
  const scrollerAncestor = (el) => {
    for (let e = el.parentElement; e; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
    }
    return false;
  };
  const label = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls} "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
  };

  const leaves = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !visible(el)) continue;
    leaves.add(el);
    const re = /[^\s\-–—\/]{4,}/g;
    let m;
    while ((m = re.exec(n.textContent))) {
      const range = document.createRange();
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
      if (tops.size > 1 && out.midword.length < 10) out.midword.push(`${m[0]} in ${label(el)}`);
    }
  }

  const blocks = [];
  for (const el of leaves) {
    const b = el.getBoundingClientRect();
    if (fixedAncestor(el)) continue;
    if ((b.right > vw + 1 || b.left < -1) && !scrollerAncestor(el) && out.escape.length < 10) {
      out.escape.push(`${label(el)} [${Math.round(b.left)}..${Math.round(b.right)}]`);
    }
    blocks.push({ el, b });
  }
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const A = blocks[i];
      const B = blocks[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const ox = Math.min(A.b.right, B.b.right) - Math.max(A.b.left, B.b.left);
      const oy = Math.min(A.b.bottom, B.b.bottom) - Math.max(A.b.top, B.b.top);
      if (ox > 4 && oy > 4 && out.overlap.length < 10) out.overlap.push(`${label(A.el)} X ${label(B.el)}`);
    }
  }

  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) out.images.push(img.getAttribute('src'));
  }
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (href.startsWith('/') && !href.startsWith('//')) out.links.push(href.split('#')[0]);
  }
  return out;
}

async function anchorAdCheck(page) {
  return page.evaluate(async () => {
    const pill = document.querySelector('.floating-ebook-btn');
    if (!pill) return null;
    const ad = document.createElement('ins');
    ad.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:70px;z-index:999';
    document.body.appendChild(ad);
    await new Promise((r) => setTimeout(r, 600));
    const clear = pill.getBoundingClientRect().bottom <= ad.getBoundingClientRect().top;
    ad.remove();
    return clear;
  });
}

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  let consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text().slice(0, 160)));
  page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 160)));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.startsWith(BASE)) consoleErrors.push(`request failed: ${url}`);
  });
  page.on('response', (res) => {
    // astro preview does not run Netlify functions, so only flag them against a deployed site.
    const localFn = /localhost|127\.0\.0\.1/.test(BASE) && res.url().includes('/.netlify/functions/');
    if (res.status() >= 400 && res.url().startsWith(BASE) && !localFn) consoleErrors.push(`${res.status()} ${res.url().slice(BASE.length)}`);
  });

  for (const p of pages) {
    consoleErrors = [];
    const resp = await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => ({ status: () => String(e).slice(0, 80) }));
    await page.waitForTimeout(800);
    const status = resp?.status?.();
    const r = await page.evaluate(inspectPage);
    r.links.forEach((l) => internalLinks.add(l));
    // Ads and analytics are blocked or absent locally; ignore their noise.
    // "Failed to load resource" repeats what the response listener already logged with
    // its URL; cert/tunnel errors come from sandboxed networks, not the site.
    const consoleList = consoleErrors.filter((e) => !/googlesyndication|google-analytics|googletagmanager|doubleclick|adsbygoogle|turnstile|cloudflare|^Failed to load resource|ERR_CERT_|ERR_TUNNEL_/i.test(e));
    const issues = [];
    if (typeof status === 'number' ? status >= 400 : status) issues.push(`  status: ${status}`);
    if (r.hscroll > 0) issues.push(`  hscroll: page is ${r.hscroll}px wider than viewport`);
    for (const k of ['escape', 'midword', 'overlap', 'images']) if (r[k].length) issues.push(`  ${k}:\n    ${r[k].join('\n    ')}`);
    if (consoleList.length) issues.push(`  console:\n    ${consoleList.slice(0, 8).join('\n    ')}`);
    if (p === pages[0]) {
      const clear = await anchorAdCheck(page);
      if (clear === false) issues.push('  pill: floating pill overlaps a bottom anchor ad');
    }
    if (issues.length) {
      total += issues.length;
      console.log(`\n${p} @${w}px\n${issues.join('\n')}`);
    }
    if (args.shots) {
      const name = (p.replace(/\//g, '_') || '_') + `-${w}.png`;
      await page.screenshot({ path: path.join(String(args.shots), name), fullPage: true });
    }
  }
  await ctx.close();
}

if (!args['skip-links']) {
  const broken = [];
  for (const link of [...internalLinks].filter(Boolean)) {
    const res = await fetch(BASE + link, { redirect: 'manual' }).catch(() => null);
    if (!res || res.status >= 400) broken.push(`${res ? res.status : 'ERR'} ${link}`);
  }
  if (broken.length) {
    total += broken.length;
    console.log(`\nbroken internal links:\n  ${broken.join('\n  ')}`);
  }
}

await browser.close();
console.log(`\n${total ? `${total} issue group(s) found` : 'No issues found'} across ${pages.length} page(s) x ${WIDTHS.length} width(s).`);
process.exit(total ? 1 : 0);
