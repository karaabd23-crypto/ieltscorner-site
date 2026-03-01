#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lessonsDir = path.join(__dirname, '../src/content/lessons');

// Map of corrupted emojis to correct ones
const emojiMap = {
  'ðŸ™ˆ': '\u{1F3AF}', // 🎯
  'ðŸ'€': '\u{1F440}', // 👀
  'ðŸ§': '\u{1F9E0}', // 🧠
  'âŒ': '\u{274C}',   // ❌
  'âœ…': '\u{2705}',  // ✅
  'ðŸ"': '\u{1F4D3}', // 📝
  'ðŸš€': '\u{1F680}', // 🚀
  'âŒ\uFEFF': '\u{274C}', // Alternative encoding
};

function fixEmojis(content) {
  let fixed = content;
  
  // Fix corrupted emojis
  Object.entries(emojiMap).forEach(([broken, correct]) => {
    fixed = fixed.replaceAll(broken, correct);
  });
  
  return fixed;
}

function convertTableToCards(content) {
  // Match the table pattern for weak vs strong sentences
  const tablePattern = /\| ❌ Weak sentence \| ✅ Better sentence \| Why it is better \|\n\|---\|---\|---\|\n((?:\| .+? \| .+? \| .+? \|\n)*)/g;
  
  content = content.replace(tablePattern, (match, tableRows) => {
    const rows = tableRows
      .split('\n')
      .filter(row => row.trim().startsWith('|'))
      .map(row => {
        const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length === 3) {
          return { weak: cells[0], better: cells[1], why: cells[2] };
        }
      })
      .filter(Boolean);
    
    if (rows.length === 0) return match;
    
    // Build HTML card layout
    let html = '\n<div class="comparison-cards">\n';
    rows.forEach(row => {
      html += `
<div class="comparison-row">
  <div class="card-item weak">
    <strong>\u{274C} Weak</strong>
    <p>${row.weak}</p>
  </div>
  <div class="card-item better">
    <strong>\u{2705} Better</strong>
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
  
  return content;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Fix emojis first
    content = fixEmojis(content);
    
    // Convert tables to cards
    content = convertTableToCards(content);
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
try {
  const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'));
  let updated = 0;
  let processed = 0;
  
  files.forEach(file => {
    const filePath = path.join(lessonsDir, file);
    processed++;
    if (processFile(filePath)) {
      updated++;
      console.log(`✅ Updated: ${file}`);
    }
  });
  
  console.log(`\n📊 Summary: ${updated} files updated out of ${processed} processed`);
} catch (error) {
  console.error('Fatal error:', error.message);
  process.exit(1);
}
