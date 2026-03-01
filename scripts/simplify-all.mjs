#!/usr/bin/env node
// Final pass: simplify ALL lesson titles and filenames
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
    .replace(/^-+|-+$/g, '');
}

// Simplify grammar titles
function simplifyGrammarTitle(title) {
  return title
    .replace(/^How to Use\s+/i, '')
    .replace(/^How to\s+/i, '')
    .trim();
}

// Simplify vocabulary titles
function simplifyVocabTitle(title) {
  return title
    .replace(/^Vocabulary for\s+/i, '')
    .trim();
}

// Simplify writing/speaking titles
function simplifySkillTitle(title) {
  return title
    .replace(/^How to Write About\s+/i, '')
    .replace(/^How to Speak About\s+/i, '')
    .replace(/^How to\s+/i, '')
    .trim();
}

function simplifyTitle(title, category) {
  if (category === 'grammar') return simplifyGrammarTitle(title);
  if (category === 'vocabulary') return simplifyVocabTitle(title);
  return simplifySkillTitle(title);
}

async function main() {
  const files = await readdir(LESSON_DIR, { withFileTypes: true });
  const mdFiles = files.filter(f => f.isFile() && (f.name.endsWith('.md') || f.name.endsWith('.mdx')) && !f.name.startsWith('_'));

  console.log(`Final pass: simplifying ${mdFiles.length} lesson files\n`);

  let renamed = 0;
  let updated = 0;

  for (const file of mdFiles) {
    const oldPath = path.join(LESSON_DIR, file.name);
    let content = '';
    
    try {
      content = await readFile(oldPath, { encoding: 'utf8' });
    } catch (err) {
      console.log(`⊘ Skipped (read error): ${file.name}`);
      continue;
    }

    // Extract frontmatter
    const fmMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]/m);
    if (!fmMatch) {
      console.log(`⊘ Skipped (no frontmatter): ${file.name}`);
      continue;
    }

    const fm = fmMatch[1];
    const body = content.slice(fmMatch[0].length);

    // Extract category and title
    const categoryMatch = fm.match(/category:\s*["']?([^"\'\n]+)["']?/);
    const titleMatch = fm.match(/title:\s*"([^"]*)"/);

    if (!categoryMatch || !titleMatch) {
      console.log(`⊘ Skipped (missing category/title): ${file.name}`);
      continue;
    }

    const category = categoryMatch[1].trim();
    const oldTitle = titleMatch[1].trim();
    const newTitle = simplifyTitle(oldTitle, category);

    // Skip if no title change needed
    if (newTitle === oldTitle && file.name.match(/^[a-z]/) && !file.name.includes('how-to-use') && !file.name.includes('vocabulary-for')) {
      console.log(`✓ Already simple: ${file.name}`);
      continue;
    }

    // Update title in frontmatter
    const newFm = fm.replace(
      /title:\s*"[^"]*"/,
      `title: "${newTitle.replace(/"/g, '\\"')}`
    );

    const newContent = `---\n${newFm}\n---\n${body}`;
    const newSlug = slugify(newTitle);
    const ext = file.name.endsWith('.mdx') ? '.mdx' : '.md';
    const newFilename = `${newSlug}${ext}`;
    const newPath = path.join(LESSON_DIR, newFilename);

    // Skip if file already exists with new name
    if (newFilename !== file.name) {
      try {
        await readFile(newPath);
        console.log(`⊘ Skipped (target exists): ${file.name} -> ${newFilename}`);
        continue;
      } catch (err) {
        // Target doesn't exist, OK to proceed
      }
    }

    try {
      await writeFile(newPath, newContent, { encoding: 'utf8' });
      
      if (newFilename !== file.name) {
        await unlink(oldPath);
        console.log(`✓ Renamed: ${file.name}`);
        console.log(`           → ${newFilename}`);
        console.log(`  Title:   "${oldTitle}" → "${newTitle}"`);
        renamed++;
      } else {
        console.log(`✓ Updated: ${file.name}`);
        console.log(`  Title:   "${oldTitle}" → "${newTitle}"`);
        updated++;
      }
    } catch (err) {
      console.log(`⚠ Error processing ${file.name}: ${err.message}`);
    }
  }

  console.log(`\n✓ Done! Renamed ${renamed} files, updated ${updated} titles.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
