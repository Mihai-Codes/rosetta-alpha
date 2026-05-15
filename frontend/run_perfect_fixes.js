const fs = require('fs');

// 1. HeroSection.tsx
let hero = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');
hero = hero.replace(
  /className=\{`text-lg md:text-xl text-text-secondary font-light max-w-full w-full mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 \$\{.*?`\}/,
  "className={`text-[clamp(11px,1.5vw,1.125rem)] text-text-secondary font-light w-full mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 ${visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}"
);
hero = hero.replace(
  /<div className="relative flex h-2 w-2 shrink-0">.*?<\/div>/g,
  `<div className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 shadow-[0_0_12px_rgba(216,43,43,1)]" style={{ backgroundColor: meta.color }} /><span className="relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(216,43,43,0.8)]" style={{ backgroundColor: meta.color }} /></div>`
);
hero = hero.replace(
  /hover:border-white\/\[0\.15\]/g,
  'hover:border-brand-red/80 hover:shadow-[0_0_32px_rgba(216,43,43,0.8)] cursor-pointer'
);
hero = hero.replace(
  /<button\s+onClick=\{onScrollDown\}\s+className="group relative overflow-hidden inline-flex items-center gap-3 px-10 py-4 glass-panel rounded-full border border-brand-red\/60 text-brand-red text-\[12px\] font-medium uppercase tracking-\[0\.25em\] transition-all duration-500 hover:border-brand-red hover:shadow-\[0_0_24px_rgba\(216,43,43,0\.8\)\] cursor-pointer"[\s\S]*?<\/button>/,
  `<button
            onClick={onScrollDown}
            className="group relative overflow-hidden inline-flex items-center gap-3 px-10 py-4 glass-panel rounded-full border border-brand-red/60 text-brand-red text-[12px] font-medium uppercase tracking-[0.25em] transition-all duration-500 hover:border-brand-red hover:shadow-[0_0_32px_rgba(216,43,43,1)] cursor-pointer"
          >
            <div className="absolute inset-0 bg-brand-red translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            <span className="relative z-10 transition-colors duration-500 group-hover:text-[#000000]">Enter Terminal</span>
            <span className="relative z-10 transition-all duration-500 group-hover:translate-x-1 group-hover:text-[#000000]">→</span>
          </button>`
);
fs.writeFileSync('src/components/HeroSection.tsx', hero);

// 2. Layout.tsx
let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');
layout = layout.replace(
  /<span className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-\[0_0_24px_rgba\(216,43,43,1\)\] origin-bottom group-hover:animate-pulse">/,
  `<span className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_32px_rgba(216,43,43,1)] origin-bottom animate-pulse">`
);
layout = layout.replace(
  /<div className="flex flex-col gap-1\.5 font-light whitespace-nowrap overflow-hidden">[\s\S]*?<\/div>/,
  `<div className="flex flex-col gap-1.5 font-light whitespace-nowrap">
              <span>Multi-language reasoning traces secured on Arc L1.</span>
              <span>An institutional-grade intelligence layer for global macro.</span>
            </div>`
);
layout = layout.replace(
  /<span className="italic text-text-secondary text-base md:text-lg font-display tracking-wide relative inline-flex items-center justify-center min-w-\[440px\] h-\[32px\]">/,
  `<span className="italic text-text-secondary text-lg md:text-2xl font-display tracking-wide relative inline-flex items-center justify-center min-w-[500px] h-[40px]">`
);
layout = layout.replace(
  /<span>© 2026 Rosetta Alpha<\/span>\s*<QuoteMatrix \/>\s*<span>Aristotle<\/span>/,
  `<span>Rosetta Alpha</span>\n          <QuoteMatrix />\n          <span>Aristotle</span>`
);
fs.writeFileSync('src/components/Layout.tsx', layout);

// 3. DesksView.tsx
let desks = fs.readFileSync('src/components/DesksView.tsx', 'utf8');
desks = desks.replace(
  /<div className="flex flex-col lg:flex-row gap-5 sm:p-8">/,
  `<div className="flex flex-col lg:flex-row items-start gap-5 sm:p-8">`
);
fs.writeFileSync('src/components/DesksView.tsx', desks);

// 4. RegionSidebar.tsx
let sidebar = fs.readFileSync('src/components/RegionSidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  /hover:bg-white\/\[0\.08\]/g,
  `hover:bg-brand-red/20 hover:border-brand-red/50 hover:shadow-[inset_4px_0_0_0_rgba(216,43,43,1)]`
);
fs.writeFileSync('src/components/RegionSidebar.tsx', sidebar);

// 5. ThesisCard.tsx
let thesis = fs.readFileSync('src/components/ThesisCard.tsx', 'utf8');
thesis = thesis.replace(
  /className="text-sm text-text-primary font-light leading-relaxed mb-2 text-left pr-4"/g,
  `className="text-sm text-text-primary font-light leading-relaxed mb-2 text-justify pr-4"`
);
thesis = thesis.replace(
  /className="text-sm text-text-secondary font-light leading-relaxed mb-2 pl-4 border-l-2 border-border\/50 text-left pr-4"/g,
  `className="text-sm text-text-secondary font-light leading-relaxed mb-2 pl-4 border-l-2 border-border/50 text-justify pr-4"`
);
fs.writeFileSync('src/components/ThesisCard.tsx', thesis);

// 6. AllWeatherChart.tsx
let awc = fs.readFileSync('src/components/AllWeatherChart.tsx', 'utf8');
awc = awc.replace(
  /<p className="text-\[10px\] text-text-tertiary leading-relaxed max-w-\[220px\] mx-auto">/,
  `<p className="text-[10px] text-text-tertiary leading-relaxed max-w-[220px] mx-auto text-center">`
);
fs.writeFileSync('src/components/AllWeatherChart.tsx', awc);

// 7. index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(
  /@keyframes red-pulse \{\s*0%, 100% \{ opacity: 0\.6; filter: drop-shadow\(0 0 8px rgba\(216,43,43,0\.8\)\); \}\s*50% \{ opacity: 1; filter: drop-shadow\(0 0 24px rgba\(216,43,43,1\)\) drop-shadow\(0 0 12px rgba\(216,43,43,0\.9\)\); \}\s*\}/,
  `@keyframes red-pulse {\n  0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 12px rgba(216,43,43,0.8)); }\n  50% { opacity: 1; filter: drop-shadow(0 0 32px rgba(216,43,43,1)) drop-shadow(0 0 16px rgba(216,43,43,1)); }\n}`
);
css = css.