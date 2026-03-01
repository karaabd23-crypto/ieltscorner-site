#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const lessonsDir = 'c:\\Users\\Karaa\\Documents\\ieltscorner-site\\src\\content\\lessons';

function fixLessonFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Fix duplicated text patterns
  content = content.replace(/: weak vs strong: weak vs strong/g, '');
  content = content.replace(/ rule works rule works/g, ' rule works');
  content = content.replace(/ and easy fixes and easy fixes/g, ' and easy fixes');
  content = content.replace(/ and easy fixes\s+$/gm, ' and easy fixes');
  
  // Convert markdown tables to card format
  // Match pattern: | emoji Weak sentence | ... Better sentence | Why...
  const tablePattern = /\|[\s]*[^|]*Weak sentence[^|]*\|[\s]*[^|]*Better sentence[^|]*\|[\s]*Why[^|]*\|\n\|---\|---\|---\|\n((?:\|[^|]*\|[^|]*\|[^|]*\|\n)*)/g;
  
  content = content.replace(tablePattern, (match, tableRows) => {
    const rows = tableRows
      .split('\n')
      .filter(row => row.trim().startsWith('|') && row.trim().length > 5)
      .map(row => {
        const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
        if (cells.length >= 3) {
          return { weak: cells[0], better: cells[1], why: cells[2] };
        }
        return null;
      })
      .filter(Boolean);
    
    if (rows.length === 0) return match;
    
    // Build card HTML
    let html = '\n<div class="comparison-cards">\n';
    rows.forEach(row => {
      html += `<div class="comparison-row">
  <div class="card-item weak">
    <strong>❌ Weak</strong>
    <p>${row.weak}</p>
  </div>
  <div class="card-item better">
    <strong>✅ Better</strong>
    <p>${row.better}</p>
  </div>
  <div class="card-item why">
    <strong>Why it works</strong>
    <p>${row.why}</p>
  </div>
</div>
`;
    });
    html += '</div>\n';
    
    return html;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

try {
  const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'));
  let fixed = 0;
  
  files.forEach(file => {
    const filePath = path.join(lessonsDir, file);
    if (fixLessonFile(filePath)) {
      fixed++;
      console.log(`✅ ${file}`);
    }
  });
  
  console.log(`\n📊 Fixed ${fixed}/${files.length} files`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
