#!/usr/bin/env node
/**
 * merge-multilevel-lessons.mjs
 *
 * Consolidates duplicate multi-level lessons into a single CLB9+ / IELTS 6+ version.
 * For each group of slug-based duplicates (e.g., academic-verbs-b1, academic-verbs-b2, academic-verbs-c1),
 * keeps one file, updates it to B2 level, and deletes the rest.
 *
 * Usage:
 *   node scripts/merge-multilevel-lessons.mjs            # dry-run (shows plan)
 *   node scripts/merge-multilevel-lessons.mjs --apply     # actually merges and deletes
 */

import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const DIR = 'src/content/lessons';

// Level preference: B2 first (CLB9+/IELTS 6+), then nearby levels
const LEVEL_PRIORITY = ['B2', 'C1', 'B1', 'C2', 'A2', 'A1'];

const apply = process.argv.includes('--apply');

async function parseFrontmatter(filePath) {
  const content = await readFile(filePath, 'utf8');
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const title = (fm.match(/^title:\s*['"]?(.*?)['"]?\s*$/m) || [])[1] || '';
  const level = (fm.match(/^level:\s*['"]?(.*?)['"]?\s*$/m) || [])[1] || '';
  const category = (fm.match(/^category:\s*['"]?(.*?)['"]?\s*$/m) || [])[1] || '';
  const draft = /^draft:\s*true/m.test(fm);
  return { filePath, fileName: path.basename(filePath), title, level, category, draft, content };
}

function normalizeSlug(fileName) {
  return fileName
    .replace('.md', '')
    .replace(/-[abc][12]$/i, '')
    .toLowerCase();
}

function cleanTitle(title) {
  // Remove trailing level like (B1), (B2), (C1), etc.
  return title.replace(/\s*\([A-C][12]\)\s*$/i, '').trim();
}

async function main() {
  const files = (await readdir(DIR)).filter(f => f.endsWith('.md'));
  const lessons = (await Promise.all(files.map(f => parseFrontmatter(path.join(DIR, f))))).filter(Boolean);

  // Group by normalized slug
  const groups = {};
  for (const l of lessons) {
    const key = normalizeSlug(l.fileName);
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  }

  const dupeGroups = Object.entries(groups).filter(([, items]) => items.length > 1);
  const singletons = Object.entries(groups).filter(([, items]) => items.length === 1);

  console.log(`Total lessons: ${lessons.length}`);
  console.log(`Singleton topics: ${singletons.length}`);
  console.log(`Duplicate groups: ${dupeGroups.length}`);
  console.log(`Files to delete: ${dupeGroups.reduce((s, [, v]) => s + v.length - 1, 0)}`);
  console.log(`Files after merge: ${singletons.length + dupeGroups.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log();

  let kept = 0;
  let deleted = 0;
  let renamed = 0;
  let levelUpdated = 0;
  let titleCleaned = 0;

  for (const [slug, items] of dupeGroups) {
    // Sort by level priority
    items.sort((a, b) => {
      const ai = LEVEL_PRIORITY.indexOf(a.level);
      const bi = LEVEL_PRIORITY.indexOf(b.level);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const keeper = items[0]; // Best level match
    const toDelete = items.slice(1);

    // Determine the target filename (slug without level suffix)
    const baseName = slug + '.md';
    const needsRename = keeper.fileName !== baseName && !items.some(i => i.fileName === baseName);

    console.log(`[${slug}] Keep: ${keeper.fileName} (${keeper.level})`);
    toDelete.forEach(d => console.log(`  Delete: ${d.fileName} (${d.level})`));

    if (apply) {
      // Update the keeper's frontmatter
      let content = keeper.content;
      let changed = false;

      // Set level to B2 if not already
      if (keeper.level !== 'B2') {
        content = content.replace(/^level:\s*['"]?.*?['"]?\s*$/m, 'level: "B2"');
        levelUpdated++;
        changed = true;
      }

      // Clean title (remove level suffix)
      const cleaned = cleanTitle(keeper.title);
      if (cleaned !== keeper.title) {
        content = content.replace(
          `title: "${keeper.title}"`,
          `title: "${cleaned}"`
        );
        titleCleaned++;
        changed = true;
        console.log(`  Title: "${keeper.title}" → "${cleaned}"`);
      }

      if (changed) {
        await writeFile(keeper.filePath, content, 'utf8');
      }

      // Delete the extras
      for (const d of toDelete) {
        await unlink(d.filePath);
        deleted++;
      }

      // Rename file if it has a level suffix
      const levelSuffixMatch = keeper.fileName.match(/-[abc][12]\.md$/i);
      if (levelSuffixMatch) {
        const newPath = path.join(DIR, baseName);
        // Check if baseName already exists (could be another file)
        const existingFiles = items.map(i => i.fileName);
        if (!existingFiles.includes(baseName)) {
          // Safe to rename
          const { rename: fsRename } = await import('node:fs/promises');
          await fsRename(keeper.filePath, newPath);
          renamed++;
          console.log(`  Renamed: ${keeper.fileName} → ${baseName}`);
        }
      }
    }

    kept++;
  }

  // Also handle singletons — update level to B2 and clean titles
  let singletonUpdated = 0;
  for (const [slug, [lesson]] of singletons) {
    let content = lesson.content;
    let changed = false;

    if (lesson.level !== 'B2') {
      content = content.replace(/^level:\s*['"]?.*?['"]?\s*$/m, 'level: "B2"');
      changed = true;
    }

    const cleaned = cleanTitle(lesson.title);
    if (cleaned !== lesson.title) {
      content = content.replace(
        `title: "${lesson.title}"`,
        `title: "${cleaned}"`
      );
      changed = true;
    }

    if (changed && apply) {
      await writeFile(lesson.filePath, content, 'utf8');
      singletonUpdated++;
    }
  }

  console.log('\n============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`Duplicate groups merged: ${kept}`);
  console.log(`Files deleted: ${deleted}`);
  console.log(`Files renamed: ${renamed}`);
  console.log(`Levels updated to B2: ${levelUpdated}`);
  console.log(`Titles cleaned: ${titleCleaned}`);
  console.log(`Singletons updated: ${singletonUpdated}`);
  console.log(`Final lesson count: ${singletons.length + dupeGroups.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
