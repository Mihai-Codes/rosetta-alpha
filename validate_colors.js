const fs = require('fs');
const path = require('path');

const allowedColors = [
  '000000', '000',
  '0a0a0a',
  'ffffff', 'fff',
  'cccccc', 'ccc',
  '888888', '888',
  'd82b2b',
  '22c55e',
  'f59e0b',
  'ef4444',
  '1a1a1a',
  '333333',
  '111111', // skeleton? wait, is this allowed?
  '222222', // signin modal?
  // Let's find out what else exists.
];

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
          if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.js')) {
            results.push(file);
          }
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const hexRegex = /#([a-fA-F0-9]{3,8})\b/g;
const rgbRegex = /rgba?\([^)]+\)/g;

walk('frontend/src', (err, files) => {
  if (err) throw err;
  let allHex = new Set();
  let allRgb = new Set();
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    let hexMatch;
    while ((hexMatch = hexRegex.exec(content)) !== null) {
      const hex = hexMatch[1].toLowerCase();
      // Only keep RGB part if 8 chars (strip alpha)
      const baseHex = hex.length === 8 ? hex.substring(0,6) : (hex.length === 4 ? hex.substring(0,3) : hex);
      if (!allowedColors.includes(baseHex)) {
        allHex.add(`${hex} in ${path.basename(file)}`);
      }
    }
    
    let rgbMatch;
    while ((rgbMatch = rgbRegex.exec(content)) !== null) {
      allRgb.add(`${rgbMatch[0]} in ${path.basename(file)}`);
    }
  });
  
  console.log("Rogue Hex Colors Found:");
  Array.from(allHex).forEach(c => console.log(c));
  
  console.log("\nRGB/RGBA Colors Found:");
  Array.from(allRgb).forEach(c => console.log(c));
});
