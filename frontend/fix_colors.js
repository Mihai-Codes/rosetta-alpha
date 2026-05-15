const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace text-primary with text-brand-red, but NOT text-text-primary
      content = content.replace(/(?<!text-)text-primary/g, 'text-brand-red');
      
      // Replace bg-primary with bg-brand-red, but NOT bg-bg-primary
      content = content.replace(/(?<!bg-)bg-primary/g, 'bg-brand-red');
      
      // Replace border-primary with border-brand-red
      content = content.replace(/border-primary/g, 'border-brand-red');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Colors fixed');
