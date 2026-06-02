// One-off: convert the heavy hero PNGs (each ~1-1.7MB, ~24MB total) to WebP.
// Heroes are used as CSS background-image via --hero-bg, so Astro's <Image>
// can't optimize them; converting to WebP + updating the url() references is
// the equivalent win for Core Web Vitals (LCP) and bounce rate.
//
// This only WRITES new .webp files next to the existing .png files. It never
// deletes the PNGs (kept as social/OG fallback). Safe and re-runnable.
//
//   node scripts/optimize-hero-images.mjs

import sharp from "sharp";
import { readdirSync, statSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEROES_DIR = join(__dirname, "..", "public", "heroes");

const pngs = readdirSync(HEROES_DIR).filter((f) => extname(f).toLowerCase() === ".png");

let originalTotal = 0;
let webpTotal = 0;

for (const file of pngs) {
  const src = join(HEROES_DIR, file);
  const out = join(HEROES_DIR, `${basename(file, ".png")}.webp`);
  const before = statSync(src).size;
  await sharp(src)
    // Heroes are decorative full-bleed backgrounds; 1600px wide is plenty and
    // quality 80 WebP is visually indistinguishable at background scale.
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  const after = statSync(out).size;
  originalTotal += before;
  webpTotal += after;
  const pct = Math.round((1 - after / before) * 100);
  console.log(
    `${file.padEnd(24)} ${(before / 1024).toFixed(0).padStart(5)}KB -> ${(after / 1024)
      .toFixed(0)
      .padStart(5)}KB  (-${pct}%)`
  );
}

console.log(
  `\nTotal: ${(originalTotal / 1024 / 1024).toFixed(1)}MB -> ${(webpTotal / 1024 / 1024).toFixed(
    1
  )}MB  (-${Math.round((1 - webpTotal / originalTotal) * 100)}%)`
);
