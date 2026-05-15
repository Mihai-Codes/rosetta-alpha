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
      
      // Update fixed paddings to responsive clamps (mobile-first)
      content = content.replace(/px-8 py-7/g, 'px-5 sm:px-8 py-6 sm:py-7');
      content = content.replace(/p-8/g, 'p-5 sm:p-8');
      content = content.replace(/p-10/g, 'p-6 sm:p-10');
      content = content.replace(/px-6 py-4/g, 'px-4 sm:px-6 py-3 sm:py-4');
      content = content.replace(/px-6 py-5/g, 'px-4 sm:px-6 py-4 sm:py-5');
      content = content.replace(/gap-6/g, 'gap-4 sm:gap-6');
      content = content.replace(/gap-8/g, 'gap-5 sm:gap-8');
      
      // Fix potential text overflows on mobile
      content = content.replace(/text-4xl md:text-5xl/g, 'text-3xl sm:text-4xl md:text-5xl');
      content = content.replace(/text-3xl font-light/g, 'text-2xl sm:text-3xl font-light');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src/components'));
console.log('Responsive layouts patched');
