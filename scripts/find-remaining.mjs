// Quick script to find files not yet rewritten and output them
import fs from 'fs';
import path from 'path';

const dir = 'src/content/lessons';
const cutoff = new Date('2026-03-19T21:35:00');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();

const needsRewrite = files.filter(f => {
  const stat = fs.statSync(path.join(dir, f));
  return stat.mtimeMs < cutoff.getTime();
});

// Also include the 5 from the test run that were done before the main run
const testRunFiles = new Set([
  '2026-03-19-grammar-c2-precision-timed-exam-conditions.md',
  'a-an-and-the.md', 
  'abstract-noun-structures-with-accuracy.md',
  'academic-discussion.md',
  'academic-verbs.md'  // was renamed from academic-verbs-b1.md
]);

const actuallyNeeded = needsRewrite.filter(f => !testRunFiles.has(f));
console.log(`Total files: ${files.length}`);
console.log(`Already rewritten by main run: ${files.length - needsRewrite.length}`);
console.log(`Done by test run: ${testRunFiles.size}`);
console.log(`Still need rewriting: ${actuallyNeeded.length}`);
console.log(`\nFiles to process:`);
actuallyNeeded.forEach(f => console.log(f));
