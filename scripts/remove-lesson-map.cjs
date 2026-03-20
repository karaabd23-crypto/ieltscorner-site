const fs = require('fs');
const path = require('path');
const dir = 'src/content/lessons';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
let count = 0;
for (const f of files) {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');
  const re = /\n<nav class="lesson-map"[\s\S]*?<\/nav>\n?/;
  if (re.test(content)) {
    content = content.replace(re, '\n');
    fs.writeFileSync(fp, content, 'utf8');
    count++;
  }
}
console.log('Removed lesson-map nav from ' + count + ' files');
