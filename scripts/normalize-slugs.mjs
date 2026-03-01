#!/usr/bin/env node
// Second pass: normalize slugs based on actual cleaned titles
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const LESSON_DIR = path.resolve('src/content/lessons');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-$/, '');
}

async function main() {
  const files = await readdir(LESSON_DIR, { withFileTypes: true });
  const mdFiles = files.filter(f => f.isFile() && (f.name.endsWith('.md') || f.name.endsWith('.mdx')));

  console.log(`Second pass: normalizing ${mdFiles.length} lesson files\n`);

  let renamed = 0;

  for (const file of mdFiles) {
    if (file.name.startsWith('_') || file.name.startsWith('2026') || file.name.startsWith('advanced') || file.name.startsWith('hedging')) {
      continue;
    }

    const oldPath = path.join(LESSON_DIR, file.name);
    let content = '';
    
    try {
      content = await readFile(oldPath, { encoding: 'utf8' });
    } catch (err) {
      console.log(`⊘ Skipped (read error): ${file.name}`);
      continue;
    }

    // Extract title from frontmatter
    const titleMatch = content.match(/title:\s*"([^"]*)"/);
    if (!titleMatch) {
      console.log(`⊘ Skipped (no title): ${file.name}`);
      continue;
    }

    const title = titleMatch[1].trim();
    const newSlug = slugify(title);
    const ext = file.name.endsWith('.mdx') ? '.mdx' : '.md';
    const newFilename = `${newSlug}${ext}`;

    if (newFilename === file.name) {
      console.log(`✓ Already normalized: ${file.name}`);
      continue;
    }

    const newPath = path.join(LESSON_DIR, newFilename);

    try {
      // Check if target already exists
      await readFile(newPath);
      console.log(`⊘ Skipped (target exists): ${file.name} -> ${newFilename}`);
      continue;
    } catch (err) {
      // Target doesn't exist, OK to proceed
    }

    try {
      await writeFile(newPath, content, { encoding: 'utf8' });
      await unlink(oldPath);
      console.log(`✓ Renamed: ${file.name}`);
      console.log(`           → ${newFilename}`);
      renamed++;
    } catch (err) {
      console.log(`⚠ Error renaming ${file.name}: ${err.message}`);
    }
  }

  console.log(`\n✓ Done! Renamed ${renamed} files.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
