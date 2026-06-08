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
  { regex: /#4a9f6f/ig, replacement: '#22C55E' },
  { regex: /#4A9F6F/ig, replacement: '#22C55E' },
  { regex: /#9f4a4a/ig, replacement: '#EF4444' },
  { regex: /#9F4A4A/ig, replacement: '#EF4444' },
  { regex: /#a09c94/ig, replacement: '#888888' },
  { regex: /#8b5cf6/ig, replacement: '#888888' },
  { regex: /#999999/ig, replacement: '#888888' },
  { regex: /#555\b/ig, replacement: '#888888' },
  { regex: /#666\b/ig, replacement: '#888888' },
  { regex: /#333\b/ig, replacement: '#333333' },
  { regex: /#9b59b6/ig, replacement: '#888888' },
  
  // Also replacing legacy rgb/rgba overlaps
  { regex: /rgba\(201,\s*168,\s*76,/g, replacement: 'rgba(216, 43, 43,' }, // The old C9A84C gold being transformed to D82B2B crimson
  { regex: /rgba\(82,\s*183,\s*136,/g, replacement: 'rgba(34, 197, 94,' }, // Green
  { regex: /rgba\(192,\s*57,\s*43,/g, replacement: 'rgba(216, 43, 43,' }, // Red
  { regex: /rgba\(123,\s*143,\s*166,/g, replacement: 'rgba(136, 136, 136,' }, // Neutral
  { regex: /rgba\(255,\s*215,\s*0,/g, replacement: 'rgba(245, 158, 11,' }, // Yellow to amber
  { regex: /rgba\(45,\s*106,\s*79,/g, replacement: 'rgba(34, 197, 94,' },
  { regex: /rgba\(184,\s*134,\s*11,/g, replacement: 'rgba(245, 158, 11,' },
  { regex: /rgba\(220,\s*20,\s*60,/g, replacement: 'rgba(216, 43, 43,' }
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
