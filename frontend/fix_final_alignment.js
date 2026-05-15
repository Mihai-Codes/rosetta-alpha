const fs = require('fs');

// --- 1. HeroSection.tsx ---
let hero = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

// Subtitle ONE line strictly fitting the page
hero = hero.replace(
  /className=\{`text-\[clamp\(11px,1\.5vw,1\.125rem\)\] text-text-secondary font-light w-full mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 \$\{.*?`\}/,
  "className={`text-[clamp(10px,1.3vw,18px)] text-text-secondary font-light w-full flex justify-center whitespace-nowrap mb-12 transition-all duration-1000 delay-150 ${visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}"
);

// Enhance country dots glow
hero = hero.replace(
  /hover:shadow-\[0_0_32px_rgba\(216,43,43,0\.8\)\]/g,
  'hover:shadow-[0_0_48px_rgba(216,43,43,1)]'
);

// Enhance Latest Trace
hero = hero.replace(
  /border border-brand-red\/60 shadow-\[0_0_15px_rgba\(216,43,43,0\.3\)\]/,
  'border-2 border-brand-red/80 shadow-[0_0_30px_rgba(216,43,43,0.6)]'
);

fs.writeFileSync('src/components/HeroSection.tsx', hero);


// --- 2. Layout.tsx ---
let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Fix Logo Hover
layout = layout.replace(
  /className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-\[0_0_32px_rgba\(216,43,43,1\)\] origin-bottom animate-pulse"/,
  'className="logo-triangle font-display text-2xl text-brand-red leading-none origin-bottom"'
);
layout = layout.replace(
  /className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-\[0_0_24px_rgba\(216,43,43,1\)\] origin-bottom group-hover:animate-pulse"/,
  'className="logo-triangle font-display text-2xl text-brand-red leading-none origin-bottom"'
);

// Enhance Connect Wallet glow
layout = layout.replace(
  /hover:shadow-\[0_0_32px_rgba\(216,43,43,1\)\]/g,
  'hover:shadow-[0_0_48px_rgba(216,43,43,1)]'
);
layout = layout.replace(
  /hover:shadow-\[0_0_24px_rgba\(216,43,43,0\.8\)\]/g,
  'hover:shadow-[0_0_48px_rgba(216,43,43,1)]'
);

// Nav items hover
layout = layout.replace(
  /className=\{`nav-link px-4 py-1\.5 text-\[11px\] font-medium uppercase tracking-\[0\.18em\] transition-all duration-300 \$\{isActive \? 'text-brand-red drop-shadow-\[0_0_8px_rgba\(216,43,43,0\.8\)\]' : 'text-text-secondary hover:text-brand-red hover:drop-shadow-\[0_0_12px_rgba\(216,43,43,1\)\]'\} `\}/g,
  'className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-300 ${isActive ? \'text-brand-red drop-shadow-[0_0_12px_rgba(216,43,43,1)]\' : \'text-text-secondary hover:text-brand-red hover:drop-shadow-[0_0_16px_rgba(216,43,43,1)]\'}`} '
);

// Footer sentences single lines
layout = layout.replace(
  /<div className="flex flex-col gap-1\.5 font-light whitespace-nowrap overflow-hidden">[\s\S]*?<\/div>/,
  `<div className="flex flex-col gap-2 font-light text-[12px]"><p className="whitespace-nowrap">Multi-language reasoning traces secured on Arc L1.</p><p className="whitespace-nowrap">An institutional-grade intelligence layer for global macro.</p></div>`
);
layout = layout.replace(
  /<div className="flex flex-col gap-1\.5 font-light whitespace-nowrap">[\s\S]*?<\/div>/,
  `<div className="flex flex-col gap-2 font-light text-[12px]"><p className="whitespace-nowrap">Multi-language reasoning traces secured on Arc L1.</p><p className="whitespace-nowrap">An institutional-grade intelligence layer for global macro.</p></div>`
);

// Aristotle Quote Size
layout = layout.replace(
  /text-lg md:text-2xl font-display tracking-wide relative inline-flex items-center justify-center min-w-\[500px\] h-\[40px\]/,
  'text-2xl md:text-3xl font-display tracking-wide relative inline-flex items-center justify-center min-w-[600px] h-[50px] drop-shadow-[0_0_16px_rgba(255,255,255,0.2)]'
);

fs.writeFileSync('src/components/Layout.tsx', layout);


// --- 3. AllWeatherChart.tsx (Alignment) ---
let awc = fs.readFileSync('src/components/AllWeatherChart.tsx', 'utf8');
awc = awc.replace(
  /<div className="glass-panel border border-border\/20 rounded-2xl p-5 sm:p-8 shadow-none">/,
  '<div className="glass-panel border border-border/20 rounded-2xl p-5 sm:p-8 shadow-none h-full">'
);
awc = awc.replace(
  /<p className="text-\[10px\] text-text-tertiary leading-relaxed max-w-\[220px\] mx-auto">/,
  '<p className="text-[10px] text-text-tertiary leading-relaxed max-w-[220px] mx-auto text-center">'
);
fs.writeFileSync('src/components/AllWeatherChart.tsx', awc);


// --- 4. RegionSidebar.tsx (Alignment) ---
let sidebar = fs.readFileSync('src/components/RegionSidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  /<div className="glass-panel border border-border\/20 rounded-xl overflow-hidden shadow-none flex flex-col">/,
  '<div className="glass-panel border border-border/20 rounded-2xl overflow-hidden shadow-none flex flex-col h-full">'
);
sidebar = sidebar.replace(
  /<div className="px-5 py-5 border-b border-white\/\[0\.05\]">/,
  '<div className="px-5 sm:px-8 py-6 sm:py-7 border-b border-white/[0.05]">'
);
fs.writeFileSync('src/components/RegionSidebar.tsx', sidebar);


// --- 5. ThesisCard.tsx (Alignment) ---
let thesis = fs.readFileSync('src/components/ThesisCard.tsx', 'utf8');
thesis = thesis.replace(
  /<article className="glass-panel border border-border\/20 rounded-2xl overflow-hidden shadow-none">/,
  '<article className="glass-panel border border-border/20 rounded-2xl overflow-hidden shadow-none h-full flex flex-col">'
);
thesis = thesis.replace(
  /<footer className="px-8 py-5 border-t border-border flex items-center justify-between gap-4 flex-wrap">/,
  '<footer className="px-8 py-5 border-t border-border flex items-center justify-between gap-4 flex-wrap mt-auto">'
);
fs.writeFileSync('src/components/ThesisCard.tsx', thesis);


// --- 6. index.css (Grid fade & Logo pulse) ---
let css = fs.readFileSync('src/index.css', 'utf8');
css += `
.logo-triangle {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  animation: logo-idle-pulse 4s ease-in-out infinite;
}
.group:hover .logo-triangle {
  transform: scale(1.3);
  filter: drop-shadow(0 0 24px rgba(216,43,43,1)) drop-shadow(0 0 12px rgba(216,43,43,0.8));
  animation: none;
}
@keyframes logo-idle-pulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(216,43,43,0.4)); }
  50% { filter: drop-shadow(0 0 12px rgba(216,43,43,0.8)); }
}
`;

css = css.replace(
  /mask-image: linear-gradient\(to bottom, rgba\(0,0,0,1\) 0%, rgba\(0,0,0,0\.8\) 40%, transparent 100%\);/g,
  'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, transparent 100%);'
);
css = css.replace(
  /-webkit-mask-image: linear-gradient\(to bottom, rgba\(0,0,0,1\) 0%, rgba\(0,0,0,0\.8\) 40%, transparent 100%\);/g,
  '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, transparent 100%);'
);

fs.writeFileSync('src/index.css', css);

