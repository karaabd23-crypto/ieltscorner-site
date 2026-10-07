// Every page is built as /path/index.html, so Netlify serves it at /path/ and
// 301s /path -> /path/. Most internal links are written without the slash
// (hardcoded and template-built alike), which costs a redirect hop per click and
// made Google pick the slashless URL as canonical for some lessons while the
// page itself declares the slashed one. This rewrites internal hrefs in the
// built HTML to the slashed form, but only when /path/index.html exists, so
// redirect routes, files and unknown paths are left untouched.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const full = join(dir, e.name);
      if (e.isDirectory()) return htmlFiles(full);
      return e.name.endsWith('.html') ? [full] : [];
    }),
  );
  return nested.flat();
}

const HREF = /(href=["'])(\/[^"'#?\s]*[^/"'#?\s])(?=["'#?])/g;

export default function trailingSlashLinks() {
  return {
    name: 'trailing-slash-links',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await htmlFiles(root);
        const pages = new Set(
          files
            .filter((f) => f.endsWith(`${sep}index.html`))
            .map((f) => `/${relative(root, f).split(sep).slice(0, -1).join('/')}`),
        );

        let links = 0;
        await Promise.all(
          files.map(async (file) => {
            const html = await readFile(file, 'utf8');
            const out = html.replace(HREF, (match, attr, path) => {
              if (!pages.has(path)) return match;
              links += 1;
              return `${attr}${path}/`;
            });
            if (out !== html) await writeFile(file, out);
          }),
        );
        logger.info(`added trailing slash to ${links} internal links`);
      },
    },
  };
}
