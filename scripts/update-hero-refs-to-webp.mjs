// One-off: point CSS background hero references at the new .webp files.
// Only rewrites heroes/<name>.png INSIDE url(...) (the --hero-bg backgrounds),
// lowercasing the name so it is correct on case-sensitive hosting (Netlify).
// Leaves the ogImage PNG default in Layout.astro alone (OG scrapers prefer PNG).
//
//   node scripts/update-hero-refs-to-webp.mjs           (dry run)
//   node scripts/update-hero-refs-to-webp.mjs --apply

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "src");
const APPLY = process.argv.includes("--apply");

// Match heroes/<name>.png only when inside a url( ... ) so we never touch
// ogImage or any <meta> PNG reference.
const re = /(url\(\s*['"]?\/heroes\/)([A-Za-z][A-Za-z-]*)\.png(['"]?\s*\))/g;

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if ([".astro", ".css"].includes(extname(entry))) out.push(full);
  }
  return out;
};

let filesChanged = 0;
let refsChanged = 0;
const samples = [];

for (const file of walk(SRC)) {
  const original = readFileSync(file, "utf8");
  let count = 0;
  const updated = original.replace(re, (_m, pre, name, post) => {
    count++;
    refsChanged++;
    const replaced = `${pre}${name.toLowerCase()}.webp${post}`;
    if (samples.length < 3) samples.push({ file: file.replace(SRC, "src"), replaced });
    return replaced;
  });
  if (count > 0) {
    filesChanged++;
    if (APPLY) writeFileSync(file, updated, "utf8");
  }
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log(`Files changed: ${filesChanged}`);
console.log(`References changed: ${refsChanged}`);
for (const s of samples) console.log(`  ${s.file}: ${s.replaced}`);
