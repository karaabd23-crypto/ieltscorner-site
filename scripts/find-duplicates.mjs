import fs from 'fs';
import path from 'path';

const dir = 'src/content/lessons';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

function parseFM(file) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const title = (fm.match(/^title:\s*['"]?(.*?)['"]?\s*$/m) || [])[1] || '';
  const level = (fm.match(/^level:\s*['"]?(.*?)['"]?\s*$/m) || [])[1] || '';
  const category = (fm.match(/^category:\s*['"]?(.*?)['"]?\s*$/m) || [])[1] || '';
  return { file, title, level, category };
}

const lessons = files.map(parseFM).filter(Boolean);

// Normalize title: strip level suffix like (B1), (A2), strip level prefix/suffix from slug-based titles
function normalizeTitle(title) {
  return title
    .replace(/\s*\([A-C][12]\)\s*$/i, '')  // trailing (B1)
    .replace(/\s*-\s*[A-C][12]\s*$/i, '')   // trailing - B1
    .toLowerCase()
    .trim();
}

// Also try grouping by slug base (strip trailing -a1, -b1, -c1 etc)
function normalizeSlug(file) {
  return file
    .replace('.md', '')
    .replace(/-[abc][12]$/i, '')
    .toLowerCase();
}

// Group by normalized title
const byTitle = {};
for (const l of lessons) {
  const key = normalizeTitle(l.title);
  if (!byTitle[key]) byTitle[key] = [];
  byTitle[key].push(l);
}

// Group by normalized slug
const bySlug = {};
for (const l of lessons) {
  const key = normalizeSlug(l.file);
  if (!bySlug[key]) bySlug[key] = [];
  bySlug[key].push(l);
}

// Merge both grouping methods
const allGroups = {};
for (const [key, items] of Object.entries(byTitle)) {
  if (items.length > 1) allGroups['title:' + key] = items;
}
for (const [key, items] of Object.entries(bySlug)) {
  if (items.length > 1) {
    // Check if these files aren't already captured by title grouping
    const filesSet = new Set(items.map(i => i.file));
    const alreadyCaptured = Object.values(allGroups).some(group => {
      const gSet = new Set(group.map(g => g.file));
      return items.every(i => gSet.has(i.file));
    });
    if (!alreadyCaptured) allGroups['slug:' + key] = items;
  }
}

// Deduplicate: collect all files that are in multi-level groups
const dupeFiles = new Set();
const groups = [];
for (const [key, items] of Object.entries(allGroups)) {
  groups.push({ key, items });
  items.forEach(i => dupeFiles.add(i.file));
}

console.log('Total lessons:', lessons.length);
console.log('Unique by title:', Object.keys(byTitle).length);
console.log('Duplicate groups (by title):', Object.values(byTitle).filter(v => v.length > 1).length);
console.log('Duplicate groups (by slug):', Object.values(bySlug).filter(v => v.length > 1).length);
console.log('Total files in duplicate groups:', dupeFiles.size);
console.log('Singleton lessons:', lessons.length - dupeFiles.size);
console.log();

// Show all groups
const titleDupes = Object.entries(byTitle).filter(([k, v]) => v.length > 1);
const slugDupes = Object.entries(bySlug).filter(([k, v]) => v.length > 1);

console.log('=== BY TITLE (first 30) ===');
titleDupes.slice(0, 30).forEach(([title, items]) => {
  console.log(`\n"${title}" (${items.length} files):`);
  items.forEach(i => console.log(`  ${i.file}  [${i.level}] [${i.category}]`));
});

console.log('\n=== BY SLUG (first 30) ===');
slugDupes.slice(0, 30).forEach(([slug, items]) => {
  console.log(`\n"${slug}" (${items.length} files):`);
  items.forEach(i => console.log(`  ${i.file}  [${i.level}] "${i.title}"`));
});

// Level distribution
const levelCounts = {};
for (const l of lessons) {
  levelCounts[l.level] = (levelCounts[l.level] || 0) + 1;
}
console.log('\n=== LEVEL DISTRIBUTION ===');
Object.entries(levelCounts).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
