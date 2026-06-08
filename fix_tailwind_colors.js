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
  { regex: /amber-500/g, replacement: '[#F59E0B]' },
  { regex: /amber-400/g, replacement: '[#F59E0B]' },
  { regex: /amber-300/g, replacement: '[#F59E0B]' },
  { regex: /amber-200/g, replacement: '[#F59E0B]' },
  { regex: /amber-100/g, replacement: '[#FFFFFF]' },
  { regex: /red-500/g, replacement: '[#D82B2B]' },
  { regex: /gray-300/g, replacement: '[#CCCCCC]' }
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
