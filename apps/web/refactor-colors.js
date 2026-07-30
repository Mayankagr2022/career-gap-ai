const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('d:/gemini projects/career-gap-ai/apps/web/src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  content = content.replace(/bg-white\//g, 'bg-foreground/');
  content = content.replace(/border-white\//g, 'border-foreground/');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Successfully updated ${changedFiles} files.`);
