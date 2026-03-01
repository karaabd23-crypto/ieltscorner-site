#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const lessonsDir = 'c:\\Users\\Karaa\\Documents\\ieltscorner-site\\src\\content\\lessons';

// Corrected emojis mapping  
const fixes = [
  // Headers with broken emojis (just remove them for now, section titles are readable without)
  { from: /###\s+[^\w][\w]?(?:\s+Real examples:|What you will|Common mistakes|Guided practice|Suggested|How the)/g, 
    to: (match) => {
      if (match.includes('Real examples')) return '### 👀 Real examples: weak vs strong';
      if (match.includes('What you will')) return '### 🎯 What you will learn today';
      if (match.includes('Common mistakes')) return '### ❌ Common mistakes and easy fixes';
      if (match.includes('Guided')) return '### ✅ Guided practice';
      if (match.includes('Suggested')) return '### ✅ Suggested answers';
      if (match.includes('How the')) return '### 🧠 How the rule works (simple explanation)';
      return match;
    }
  },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Fix emojis in section headers
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s*Real examples/g, '### 👀 Real examples: weak vs strong');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s*What you will/g, '### 🎯 What you will learn today');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s*Common mistakes/g, '### ❌ Common mistakes and easy fixes');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s*Guided practice/g, '### ✅ Guided practice');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s*Suggested/g, '### ✅ Suggested answers');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s+How the/g, '### 🧠 How the rule works');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s+For IELTS/g, '### 🇬🇧 For IELTS');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s+For CELPIP/g, '### 🇨🇦 For CELPIP');
  content = content.replace(/###\s+[\u0080-\uFFFF]{1,3}\s+Next step/g, '### 🚀 Next step');
  
  // Fix tables - remove the corrupted emoji versions and keep clean text versions
  content = content.replace(/\|[\s]*[\u0080-\uFFFF]*\s*Weak sentence.*?\|[\s]*[\u0080-\uFFFF]*\s*Better sentence.*?\|[\s]*Why[\s]*\|/g, 
    '| ❌ Weak sentence | ✅ Better sentence | Why it is better |');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

async function main() {
  try {
    const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'));
    let fixed = 0;
    
    for (const file of files) {
      const filePath = path.join(lessonsDir, file);
      if (fixFile(filePath)) {
        fixed++;
        console.log(`✅ ${file}`);
      }
    }
    
    console.log(`\n📊 Fixed ${fixed}/${files.length} files`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
