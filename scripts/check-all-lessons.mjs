#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const lessonsDir = 'c:\\Users\\Karaa\\Documents\\ieltscorner-site\\src\\content\\lessons';

function checkLessonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { status: 'ERROR', reason: 'No frontmatter' };
  }
  
  try {
    const data = yaml.parse(match[1]);
    
    // Check required fields
    if (!data.title) return { status: 'ERROR', reason: 'Missing title' };
    if (!data.category) return { status: 'ERROR', reason: 'Missing category' };
    if (!data.level) return { status: 'ERROR', reason: 'Missing level' };
    if (!data.exam || !Array.isArray(data.exam)) return { status: 'ERROR', reason: 'Missing/invalid exam' };
    if (data.draft === true) return { status: 'DRAFT', reason: 'Draft flag set to true' };
    
    return { status: 'OK', data: { title: data.title, category: data.category, level: data.level } };
  } catch (err) {
    return { status: 'ERROR', reason: `YAML parse error: ${err.message}` };
  }
}

try {
  const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md')).sort();
  const errors = [];
  const ok = [];
  
  files.forEach(file => {
    const result = checkLessonFile(path.join(lessonsDir, file));
    if (result.status === 'ERROR') {
      errors.push(`${file}: ${result.reason}`);
    } else if (result.status === 'DRAFT') {
      errors.push(`${file}: ${result.reason}`);
    } else {
      ok.push(file);
    }
  });
  
  if (errors.length > 0) {
    console.log('❌ PROBLEMATIC FILES:\n');
    errors.forEach(e => console.log(`  ${e}`));
    console.log(`\n📊 Found ${errors.length} problematic files`);
  } else {
    console.log('✅ All files are valid!');
  }
  
  console.log(`✅ Total OK: ${ok.length}`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
