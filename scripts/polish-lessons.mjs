#!/usr/bin/env node
// Polish all lessons: rename files, clean titles, remove repeating headers
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const LESSON_DIR = path.resolve('src/content/lessons');

// Extract desired slug from filename
function extractSlug(filename) {
  // Pattern: 2026-02-27-{category}-{level}-{actual-topic}.md
  const match = filename.match(/^2026-02-27-([a-z]+)-([a-z0-9]+)-(.+?)(\.md|\.mdx)$/);
  if (!match) return null;

  const category = match[1];
  const level = match[2];
  let topic = match[3];

  // Remove level/category prefixes
  topic = topic.replace(/^beginner-/, '').replace(/^elementary-/, '');
  topic = topic.replace(new RegExp(`^${category}-`), '');

  return topic;
}

// Build clean title from slug
function buildCleanTitle(slug, category) {
  const words = slug.split('-');
  const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Remove redundancy
  if (category === 'vocabulary' && title.toLowerCase().includes('vocabulary')) {
    return title.replace(/\s*vocabulary\s*/gi, '').trim();
  }

  return title;
}

// Clean frontmatter title (remove redundancy)
function cleanTitle(title, category) {
  // Remove "Vocabulary for X vocabulary" → "X"
  if (category === 'vocabulary') {
    title = title.replace(/^Vocabulary\s+for\s+/i, '').replace(/\s+vocabulary\s*$/i, '');
  }
  // "How to Use A, an, and the" is fine
  return title.trim();
}

// Remove leading header that repeats the title
function removeRepeatingHeader(content, title) {
  // Find first markdown header
  const lines = content.split('\n');
  let foundFirstHeader = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      const headerText = lines[i].replace(/^## \s*/, '').toLowerCase();
      const titleText = title.toLowerCase();

      // Check if they're very similar
      if (
        headerText === titleText ||
        headerText.includes(titleText) ||
        titleText.includes(headerText) ||
        (headerText.length > 10 && titleText.length > 10 && 
         headerText.split(' ').filter(w => titleText.includes(w)).length > 2)
      ) {
        // Replace with generic header
        lines[i] = '## Overview';
        foundFirstHeader = true;
        break;
      }
      if (!foundFirstHeader) foundFirstHeader = true;
    }
  }

  return lines.join('\n');
}

// Main processing
async function main() {
  const files = await readdir(LESSON_DIR, { withFileTypes: true });
  const mdFiles = files.filter(f => f.isFile() && (f.name.endsWith('.md') || f.name.endsWith('.mdx')));

  console.log(`Found ${mdFiles.length} lesson files\n`);

  let renamed = 0;
  let cleaned = 0;

  for (const file of mdFiles) {
    if (file.name.startsWith('_') || file.name.startsWith('advanced') || file.name.startsWith('hedging')) {
      continue; // Skip templates and special files
    }

    const oldPath = path.join(LESSON_DIR, file.name);
    const slug = extractSlug(file.name);

    if (!slug) {
      console.log(`⊘ Skipped (no date pattern): ${file.name}`);
      continue;
    }

    // Determine extension
    const ext = file.name.endsWith('.mdx') ? '.mdx' : '.md';
    const newFilename = `${slug}${ext}`;
    const newPath = path.join(LESSON_DIR, newFilename);

    if (newFilename === file.name) {
      console.log(`✓ Already clean: ${file.name}`);
      continue;
    }

    // Read file content with UTF-8 encoding
    let content = '';
    try {
      content = await readFile(oldPath, { encoding: 'utf8' });
    } catch (err) {
      console.log(`⊘ Skipped (read error): ${file.name} - ${err.message}`);
      continue;
    }

    // Try to match frontmatter - be more flexible with line endings
    const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]+/m);
    if (!frontmatterMatch) {
      console.log(`⊘ Skipped (no frontmatter): ${file.name}`);
      continue;
    }

    const frontmatter = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length);

    // Extract category and title from frontmatter - be flexible with quotes
    const categoryMatch = frontmatter.match(/category:\s*["']?([^"'\n]+)["']?/);
    const titleMatch = frontmatter.match(/title:\s*"([^"]*(?:\\.[^"]*)*)"|title:\s*'([^']*(?:\\.[^']*)*)'|title:\s*([^\n]+)/);

    if (!categoryMatch) {
      console.log(`⊘ Skipped (no category): ${file.name}`);
      continue;
    }

    const category = categoryMatch[1].trim();
    let title = titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3] || '').trim() : '';

    if (!title) {
      console.log(`⊘ Skipped (no title): ${file.name}`);
      continue;
    }

    // Clean title
    const cleanedTitle = cleanTitle(title, category);

    // Only proceed if title actually changes or header needs removal
    let newFrontmatter = frontmatter;
    let newBody = body;
    let changed = false;

    if (cleanedTitle !== title) {
      newFrontmatter = newFrontmatter.replace(
        /title:\s*"[^"]*"/,
        `title: "${cleanedTitle.replace(/"/g, '\\"')}`
      );
      changed = true;
      console.log(`  Title: "${title}" → "${cleanedTitle}"`);
    }

    // Remove repeating header
    const cleanedBody = removeRepeatingHeader(newBody, cleanedTitle);
    if (cleanedBody !== newBody) {
      newBody = cleanedBody;
      changed = true;
      console.log(`  Removed repeating header`);
    }

    const newContent = `---\n${newFrontmatter}\n---\n${newBody}`;

    // Write new file content to new filename
    try {
      await writeFile(newPath, newContent, { encoding: 'utf8' });
    } catch (err) {
      console.log(`⊘ Skipped (write error): ${file.name} - ${err.message}`);
      continue;
    }

    // Delete old file
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(oldPath);
    } catch (err) {
      console.log(`⚠ Warning: Could not delete old file ${file.name} - ${err.message}`);
    }

    console.log(`✓ Renamed: ${file.name}`);
    console.log(`           → ${newFilename}`);

    renamed++;
    if (changed) cleaned++;
  }

  console.log(`\n✓ Done! Renamed ${renamed} files, cleaned ${cleaned} titles/headers.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
