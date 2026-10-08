// @astrojs/sitemap only emits sitemap-index.xml + sitemap-N.xml, so the
// conventional /sitemap.xml 404'd. This merges the generated chunks into one
// flat <urlset> at /sitemap.xml (same filtered URL set, same lastmod). Must be
// listed after sitemap() in astro.config.mjs so the chunks already exist.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_URLS = 50000; // sitemap protocol limit for a single file

export default function sitemapXml() {
  return {
    name: 'sitemap-xml',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const chunks = (await readdir(root)).filter((f) => /^sitemap-\d+\.xml$/.test(f)).sort();
        if (chunks.length === 0) throw new Error('sitemap-xml: no sitemap-N.xml chunks found in build output');

        const urls = [];
        for (const chunk of chunks) {
          const xml = await readFile(join(root, chunk), 'utf8');
          urls.push(...(xml.match(/<url>[\s\S]*?<\/url>/g) ?? []));
        }
        if (urls.length === 0) throw new Error('sitemap-xml: generated sitemap chunks contain no URLs');
        if (urls.length > MAX_URLS) throw new Error(`sitemap-xml: ${urls.length} URLs exceeds the single-file limit`);

        const out =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.join('\n') +
          '\n</urlset>\n';
        await writeFile(join(root, 'sitemap.xml'), out);
        logger.info(`sitemap.xml written with ${urls.length} URLs`);
      },
    },
  };
}
