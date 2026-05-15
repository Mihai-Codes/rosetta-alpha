const fs = require('fs');

// 1. Layout.tsx
let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Fix nav logo
layout = layout.replace(
  /<span className="font-display text-2xl text-brand-red leading-none transition-all duration-[0-9]+ group-hover:scale-[0-9]+ group-hover:drop-shadow-\[.*?\] origin-bottom(?: group-hover:animate-pulse| animate-pulse)?">\s*△\s*<\/span>/,
  '<span className="logo-triangle font-display text-2xl text-brand-red leading-none animate-pulse">△</span>'
);

// Fix Connect Wallet
layout = layout.replace(/hover:shadow-\[0_0_[0-9]+px_rgba\(216,43,43,[0-9\.]+\)\]/, 'hover:shadow-[0_0_48px_rgba(216,43,43,1)]');

// Nav items
layout = layout.replace(/hover:drop-shadow-\[0_0_12px_rgba\(216,43,43,1\)\]/, 'hover:drop-shadow-[0_0_24px_rgba(216,43,43,1)]');

// Footer sentences (each on one line)
layout = layout.replace(
  /<div className="flex flex-col gap-[0-9\.]+ font-light whitespace-nowrap(?: overflow-hidden)?">[\s\S]*?<\/div>/,
  `<div className="flex flex-col gap-1.5 font-light text-[12px] whitespace-nowrap overflow-visible">
              <p>Multi-language reasoning traces secured on Arc L1.</p>
              <p>An institutional-grade intelligence layer for global macro.</p>
            </div>`
);

// Aristotle matrix scale up
layout = layout.replace(/text-lg md:text-2xl/, 'text-2xl md:text-3xl');

// Footer year
layout = layout.replace(
  /<a href="https:\/\/agora.thecanteenapp.com\/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-\[0_0_8px_rgba\(216,43,43,0.4\)\]">Agora Agents Hackathon<\/a><br \/>/,
  '<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_16px_rgba(216,43,43,0.8)]">Agora Agents Hackathon</a><br />'
);

fs.writeFileSync('src/components/Layout.tsx', layout);

// 2. HeroSection.tsx
let hero = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');
hero = hero.replace(
  /<p\s+data-reveal-id="subtitle"\s+className=\{`.*?`\}\s*>\s*Dalio's All Weather discipline, reimagined for every language\. Five regional AI analysts\. One verifiable thesis\.\s*<\/p>/s,
  `<p
          data-reveal-id="subtitle"
          className={\`text-[clamp(11px,1.3vw,1.125rem)] text-text-secondary font-light w-full max-w-none flex justify-center whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 \${
            visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }\`}
        >
          Dalio's All Weather discipline, reimagined for every language. Five regional AI analysts. One verifiable thesis.
        </p>`
);

hero = hero.replace(/hover:shadow-\[0_0_[0-9]+px_rgba\(216,43,43,[0-9\.]+\)\]/g, 'hover:shadow-[0_0_48px_rgba(216,43,43,1)]');
hero = hero.replace(/border-brand-red\/[0-9]+ shadow-\[0_0_[0-9]+px_rgba\(216,43,43,[0-9\.]+\)\]/, 'border-brand-red/80 border-2 shadow-[0_0_32px_rgba(216,43,43,0.8)]');

fs.writeFileSync('src/components/HeroSection.tsx', hero);

// 3. index.css
let css = fs.readFileSync('src/index.css', 'utf8');

if (!css.includes('.logo-triangle')) {
  css += `\n.logo-triangle { transition: all 0.3s ease; display: inline-block; transform-origin: bottom; }\n.group:hover .logo-triangle { transform: scale(1.3); filter: drop-shadow(0 0 24px rgba(216,43,43,1)); }`;
}

css = css.replace(/@keyframes red-pulse \{[\s\S]*?\}/, `@keyframes red-pulse {\n  0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 16px rgba(216,43,43,0.8)); }\n  50% { opacity: 1; filter: drop-shadow(0 0 48px rgba(216,43,43,1)) drop-shadow(0 0 24px rgba(216,43,43,1)); }\n}`);

css = css.replace(/mask-image: linear-gradient\(to bottom, rgba\(0,0,0,1\) 0%, rgba\(0,0,0,[0-9\.]+\) [0-9]+%, transparent 100%\);/, 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 80%, transparent 100%);');
css = css.replace(/-webkit-mask-image: linear-gradient\(to bottom, rgba\(0,0,0,1\) 0%, rgba\(0,0,0,[0-9\.]+\) [0-9]+%, transparent 100%\);/, '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 80%, transparent 100%);');

fs.writeFileSync('src/index.css', css);

// 4. AllWeatherChart.tsx
let awc = fs.readFileSync('src/components/AllWeatherChart.tsx', 'utf8');
awc = awc.replace(/<p className="text-\[10px\] text-text-tertiary leading-relaxed max-w-\[220px\] mx-auto">/, '<p className="text-[10px] text-text-tertiary leading-relaxed max-w-[240px] mx-auto text-center">');
fs.writeFileSync('src/components/AllWeatherChart.tsx', awc);

// 5. DesksView.tsx
let desks = fs.readFileSync('src/components/DesksView.tsx', 'utf8');
desks = desks.replace(/<div className="flex flex-col lg:flex-row gap-[0-9]+ sm:p-[0-9]+">/, '<div className="flex flex-col lg:flex-row items-start gap-6 sm:p-8">');
fs.writeFileSync('src/components/DesksView.tsx', desks);

// 6. ThesisCard.tsx
let thesis = fs.readFileSync('src/components/ThesisCard.tsx', 'utf8');
thesis = thesis.replace(/text-left pr-4/g, 'text-justify pr-4');
fs.writeFileSync('src/components/ThesisCard.tsx', thesis);
