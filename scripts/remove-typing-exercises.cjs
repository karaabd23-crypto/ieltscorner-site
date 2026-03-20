/**
 * remove-typing-exercises.cjs
 *
 * Removes all typing task articles from Practice Lab sections in lesson files.
 * Also decrements the score counter and renumbers remaining tasks.
 */
const fs = require('fs');
const path = require('path');

const dir = 'src/content/lessons';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
let modified = 0;

for (const f of files) {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');

  // Check if file has a typing exercise
  if (!content.includes('data-task-type="typing"')) continue;

  // Remove typing article blocks
  // The typing article starts with <article ... data-task-type="typing" ...> and ends with </article>
  const typingRe = /<article class="practice-task" data-task-type="typing"[\s\S]*?<\/article>/g;
  const typingMatches = content.match(typingRe);
  if (!typingMatches) continue;

  const removedCount = typingMatches.length;
  content = content.replace(typingRe, '');

  // Clean up any double blank lines left behind
  content = content.replace(/\n{3,}/g, '\n\n');

  // Update Score: 0/N — decrement N by the number of removed typing exercises
  content = content.replace(/Score: 0\/(\d+)/, (match, n) => {
    const newTotal = parseInt(n, 10) - removedCount;
    return `Score: 0/${Math.max(newTotal, 1)}`;
  });

  // Renumber remaining task labels and IDs sequentially
  let taskNum = 0;
  content = content.replace(/<article class="practice-task"([^>]*?)data-task-id="(\d+)"([^>]*?)>/g,
    (match, before, oldId, after) => {
      taskNum++;
      return `<article class="practice-task"${before}data-task-id="${taskNum}"${after}>`;
    }
  );

  // Also renumber the visible task labels like "1. Quick pick", "2. Build it", etc.
  taskNum = 0;
  content = content.replace(/<p class="practice-task-label">(\d+)\.\s*(.*?)<\/p>/g,
    (match, oldNum, label) => {
      taskNum++;
      return `<p class="practice-task-label">${taskNum}. ${label}</p>`;
    }
  );

  fs.writeFileSync(fp, content, 'utf8');
  modified++;
}

console.log(`Removed typing exercises from ${modified} files`);
