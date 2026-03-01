#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const lessonsDir = 'c:\\Users\\Karaa\\Documents\\ieltscorner-site\\src\\content\\lessons';

// Map of file names to clean names and corrected titles
const renameMap = {
  'how-to-use-complex-conditionals-with-nuance.md': {
    cleanName: 'complex-conditionals-with-nuance.md',
    cleanTitle: 'Complex Conditionals with Nuance'
  },
  'how-to-use-future-forms-for-prediction-and-planning.md': {
    cleanName: 'future-forms-for-prediction-and-planning.md',
    cleanTitle: 'Future Forms for Prediction and Planning'
  },
  'how-to-use-grammar-in-clear-sentences.md': {
    cleanName: 'grammar-in-clear-sentences.md',
    cleanTitle: 'Grammar in Clear Sentences'
  },
  'how-to-use-past-simple-regular-verbs.md': {
    cleanName: 'past-simple-regular-verbs.md',
    cleanTitle: 'Past Simple: Regular Verbs'
  },
  'how-to-use-precision-in-complex-argument-structures.md': {
    cleanName: 'precision-in-complex-argument-structures.md',
    cleanTitle: 'Precision in Complex Argument Structures'
  },
  'how-to-use-question-tags-in-conversation.md': {
    cleanName: 'question-tags-in-conversation.md',
    cleanTitle: 'Question Tags in Conversation'
  },
  'how-to-use-second-conditional-for-unreal-situations.md': {
    cleanName: 'second-conditional-for-unreal-situations.md',
    cleanTitle: 'Second Conditional for Unreal Situations'
  },
  'how-to-use-subject-pronouns-and-basic-verbs.md': {
    cleanName: 'subject-pronouns-and-basic-verbs.md',
    cleanTitle: 'Subject Pronouns and Basic Verbs'
  }
};

function fixFile(oldFileName, newFileName, cleanTitle) {
  const oldPath = path.join(lessonsDir, oldFileName);
  const newPath = path.join(lessonsDir, newFileName);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`❌ File not found: ${oldFileName}`);
    return false;
  }
  
  let content = fs.readFileSync(oldPath, 'utf8');
  
  // Fix the title in frontmatter
  content = content.replace(/title: "How to Use [^"]+"/i, `title: "${cleanTitle}"`);
  
  // Write to new file
  fs.writeFileSync(newPath, content, 'utf8');
  
  // Delete old file
  fs.unlinkSync(oldPath);
  
  console.log(`✅ Renamed: ${oldFileName} -> ${newFileName}`);
  return true;
}

try {
  let fixed = 0;
  
  Object.entries(renameMap).forEach(([oldName, info]) => {
    if (fixFile(oldName, info.cleanName, info.cleanTitle)) {
      fixed++;
    }
  });
  
  console.log(`\n📊 Renamed ${fixed} files`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
