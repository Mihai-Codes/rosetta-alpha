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
  { regex: /accent-gold/g, replacement: 'brand-red' },
  { regex: /accent-amber/g, replacement: 'brand-red' },
  { regex: /emerald-500/g, replacement: '[#22C55E]' },
  { regex: /emerald-400/g, replacement: '[#22C55E]' },
  { regex: /red-400/g, replacement: '[#D82B2B]' }
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
