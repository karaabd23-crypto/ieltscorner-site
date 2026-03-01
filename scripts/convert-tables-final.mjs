#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const lessonsDir = 'c:\\Users\\Karaa\\Documents\\ieltscorner-site\\src\\content\\lessons';

function convertTableToCards(content) {
  // Find and replace tables - simpler approach using split
  let result = content;
  
  // Pattern: find the section with "| ... Weak sentence" and convert it
  // We'll look for the complete table pattern and replace it
  
  const lines = result.split('\n');
  let output = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if this is the start of a weak vs strong table
    if (line.includes('Weak sentence') && line.includes('|') && line.includes('Better sentence')) {
      // Found table header, skip the header and separator rows
      i += 2; // Skip header and |---|---|---| row
      
      // Collect table rows
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length >= 3) {
          rows.push({ weak: cells[0], better: cells[1], why: cells[2] });
        }
        i++;
      }
      
      // Output as cards
      if (rows.length > 0) {
        output.push('\n<div class="comparison-cards">');
        rows.forEach(row => {
          output.push(`<div class="comparison-row">`);
          output.push(`  <div class="card-item weak">`);
          output.push(`    <strong>❌ Weak</strong>`);
          output.push(`    <p>${row.weak}</p>`);
          output.push(`  </div>`);
          output.push(`  <div class="card-item better">`);
          output.push(`    <strong>✅ Better</strong>`);
          output.push(`    <p>${row.better}</p>`);
          output.push(`  </div>`);
          output.push(`  <div class="card-item why">`);
          output.push(`    <strong>Why it works</strong>`);
          output.push(`    <p>${row.why}</p>`);
          output.push(`  </div>`);
          output.push(`</div>`);
        });
        output.push('</div>\n');
      }
    } 
    // Check if this is a Mistake table
    else if (line.includes('Mistake') && line.includes('|') && line.includes('Better version')) {
      // Found table header, skip the header and separator rows
      i += 2; // Skip header and |---|---|---| row
      
      // Collect table rows
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length >= 3) {
          rows.push({ mistake: cells[0], better: cells[1], why: cells[2] });
        }
        i++;
      }
      
      // Output as cards
      if (rows.length > 0) {
        output.push('\n<div class="comparison-cards">');
        rows.forEach(row => {
          output.push(`<div class="comparison-row">`);
          output.push(`  <div class="card-item weak">`);
          output.push(`    <strong>❌ Mistake</strong>`);
          output.push(`    <p>${row.mistake}</p>`);
          output.push(`  </div>`);
          output.push(`  <div class="card-item better">`);
          output.push(`    <strong>✅ Better</strong>`);
          output.push(`    <p>${row.better}</p>`);
          output.push(`  </div>`);
          output.push(`  <div class="card-item why">`);
          output.push(`    <strong>Why it works</strong>`);
          output.push(`    <p>${row.why}</p>`);
          output.push(`  </div>`);
          output.push(`</div>`);
        });
        output.push('</div>\n');
      }
    } else {
      output.push(line);
      i++;
    }
  }
  
  return output.join('\n');
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  content = convertTableToCards(content);
  
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
    if (fixFile(filePath)) {
      fixed++;
      console.log(`✅ ${file}`);
    }
  });
  
  console.log(`\n📊 Fixed ${fixed}/${files.length} files`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
