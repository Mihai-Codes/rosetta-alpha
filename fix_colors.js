const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
            results.push(file);
          }
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const replacements = [
  { regex: /#00FF00/ig, replacement: '#22C55E' },
  { regex: /#FFD700/ig, replacement: '#F59E0B' },
  { regex: /#4A90E2/ig, replacement: '#888888' },
  { regex: /#A07840/ig, replacement: '#CCCCCC' },
  { regex: /#7B6030/ig, replacement: '#888888' },
  { regex: /bg-blue-500/g, replacement: 'bg-[#888888]' },
  { regex: /text-blue-400/g, replacement: 'text-[#888888]' },
  { regex: /ring-blue-500/g, replacement: 'ring-[#888888]' },
  { regex: /border-blue-500/g, replacement: 'border-[#888888]' },
  { regex: /from-blue-500/g, replacement: 'from-[#888888]' },
  { regex: /bg-blue-400/g, replacement: 'bg-[#CCCCCC]' }
];

walk('frontend/src', (err, files) => {
  if (err) throw err;
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    replacements.forEach(r => {
      if (r.regex.test(content)) {
        content = content.replace(r.regex, r.replacement);
        changed = true;
      }
    });
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  });
});
