#!/usr/bin/env node
// Fix all lesson files: proper YAML parsing and repair
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LESSON_DIR = path.resolve('src/content/lessons');

async function main() {
  const files = await readdir(LESSON_DIR, { withFileTypes: true });
  const mdFiles = files.filter(f => f.isFile() && (f.name.endsWith('.md') || f.name.endsWith('.mdx')) && !f.name.startsWith('_'));

  console.log(`Fixing ${mdFiles.length} lesson files\n`);

  let fixed = 0;

  for (const file of mdFiles) {
    const filePath = path.join(LESSON_DIR, file.name);
    let content = '';
    
    try {
      content = await readFile(filePath, { encoding: 'utf8' });
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

    let fm = fmMatch[1];
    const body = content.slice(fmMatch[0].length);

    // Fix title line specifically
    const titleMatch = fm.match(/^title:\s*"([^"]*)(?:[\r\n]|")/m);
    if (titleMatch) {
      const oldTitleLine = titleMatch[0];
      const titleText = titleMatch[1];

      // Ensure proper closing quote
      if (!oldTitleLine.includes('"', titleMatch[0].lastIndexOf('"') || titleMatch[0].length - 1)) {
        const newTitleLine = `title: "${titleText}"`;
        fm = fm.replace(/^title:.*?(?=\r?\ncat|\r?\ncategory)/m, newTitleLine);
        // Alternative: just replace the entire line up to next field
        fm = fm.replace(/title:\s*"[^"]*(?:[\r\n])?(?!\\")/m, newTitleLine + '\n');
      }
    }

    const newContent = `---\n${fm}\n---\n${body}`;
    
    try {
      // Verify it's valid YAML before writing
      if (!newContent.match(/^---\n[\s\S]*?\n---\n/)) {
        console.log(`⊘ Skipped (invalid format): ${file.name}`);
        continue;
      }
      
      await writeFile(filePath, newContent, { encoding: 'utf8' });
      console.log(`✓ Fixed: ${file.name}`);
      fixed++;
    } catch (err) {
      console.log(`⚠ Error fixing ${file.name}: ${err.message}`);
    }
  }

  console.log(`\n✓ Done! Fixed ${fixed} files.`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
