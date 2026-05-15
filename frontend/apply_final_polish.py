import re
import os

# --- index.css ---
with open('src/index.css', 'r') as f:
    css = f.read()

# Make red pulse stronger for connect wallet and dots
css = css.replace(
    '@keyframes red-pulse {\n  0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 4px rgba(216,43,43,0.6)); }\n  50% { opacity: 1; filter: drop-shadow(0 0 16px rgba(216,43,43,1)) drop-shadow(0 0 6px rgba(216,43,43,0.8)); }\n}',
    '@keyframes red-pulse {\n  0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 8px rgba(216,43,43,0.8)); }\n  50% { opacity: 1; filter: drop-shadow(0 0 24px rgba(216,43,43,1)) drop-shadow(0 0 12px rgba(216,43,43,0.9)); }\n}'
)

css = css.replace(
    'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.05) 70%, transparent 100%);',
    'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);'
)
css = css.replace(
    '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.05) 70%, transparent 100%);',
    '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);'
)

# Inject .nav-link if not exists
if '.nav-link' not in css:
    css += """
.nav-link { position: relative; }
.nav-link::after {
  content: ''; position: absolute; width: 0; height: 2px; bottom: -4px; left: 50%;
  background-color: var(--color-brand-red); transition: all 0.3s ease; transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(216,43,43,0.8);
}
.nav-link:hover::after, .nav-link[data-active="true"]::after { width: 100%; }

.global-grid-bg {
  position: absolute;
  top: -100px; left: -100px; right: -100px; bottom: -100px;
  background-image:
    linear-gradient(rgba(216, 43, 43, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 43, 43, 0.2) 1px, transparent 1px);
  background-size: 100px 100px;
  animation: hero-grid-drift 20s linear infinite, red-pulse 3s ease-in-out infinite;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);
  z-index: 0;
}
"""

with open('src/index.css', 'w') as f:
    f.write(css)

# --- HeroSection.tsx ---
with open('src/components/HeroSection.tsx', 'r') as f:
    hero = f.read()

# Subtitle ONE line
hero = re.sub(
    r'Dalio\'s All Weather discipline, reimagined for every language.\s*Five regional AI analysts\. One verifiable thesis\.',
    r'Dalio\'s All Weather discipline, reimagined for every language. Five regional AI analysts. One verifiable thesis.',
    hero, flags=re.DOTALL
)
hero = re.sub(
    r'className={`text-lg md:text-xl text-text-secondary font-light max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-1000 delay-200 \$\{.*?`}',
    r'className={`text-lg md:text-xl text-text-secondary font-light max-w-max mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis mb-12 transition-all duration-1000 delay-150 ${visible.subtitle ? \'opacity-100 translate-y-0\' : \'opacity-0 translate-y-4\'}`}',
    hero, flags=re.DOTALL
)

# Regional dots pulsing (same as connect wallet)
hero = hero.replace(
    '<div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />',
    '<div className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80" style={{ backgroundColor: meta.color, boxShadow: `0 0 12px ${meta.color}` }} /><span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: meta.color }} /></div>'
)

# Enter Terminal button sliding hover fix
old_enter_cta = r'<button\s+onClick=\{onScrollDown\}\s+className="group inline-flex items-center gap-3 px-8 py-3\.5 glass-panel rounded-full border border-brand-red/40 text-brand-red text-\[11px\] font-medium uppercase tracking-\[0\.2em\] transition-all hover:bg-brand-red hover:text-black hover:shadow-glow-red cursor-pointer"\s*>\s*Enter Terminal\s*<span className="transition-transform group-hover:translate-x-1">→</span>\s*</button>'
new_enter_cta = """<button
            onClick={onScrollDown}
            className="group relative overflow-hidden inline-flex items-center gap-3 px-10 py-4 glass-panel rounded-full border border-brand-red/60 text-brand-red text-[12px] font-medium uppercase tracking-[0.25em] transition-all duration-500 hover:border-brand-red hover:shadow-glow-red cursor-pointer"
          >
            <div className="absolute inset-0 bg-brand-red translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" />
            <span className="relative z-10 transition-colors duration-500 group-hover:text-[#000000]">Enter Terminal</span>
            <span className="relative z-10 transition-all duration-500 group-hover:translate-x-1 group-hover:text-[#000000]">→</span>
          </button>"""
hero = re.sub(old_enter_cta, new_enter_cta, hero)

# Latest Trace highlight
hero = hero.replace(
    'border border-white/[0.05]',
    'border border-brand-red/60 shadow-[0_0_15px_rgba(216,43,43,0.3)]'
)
hero = hero.replace(
    '<span className="font-mono text-[11px] text-brand-red">{truncateHash(latestHash, 10, 6)}</span>',
    '<span key={latestHash} className="font-mono text-[11px] text-brand-red animate-in fade-in zoom-in-95 duration-1000">{truncateHash(latestHash, 10, 6)}</span>'
)
with open('src/components/HeroSection.tsx', 'w') as f:
    f.write(hero)

# --- Layout.tsx ---
with open('src/components/Layout.tsx', 'r') as f:
    layout = f.read()

# Quote Matrix
quote_comp = """
function QuoteMatrix() {
  const [isGreek, setIsGreek] = React.useState(true)
  React.useEffect(() => {
    const i = setInterval(() => setIsGreek(g => !g), 4000)
    return () => clearInterval(i)
  }, [])
  return (
    <span className="italic text-text-secondary text-sm font-display tracking-wide relative inline-flex items-center justify-center min-w-[360px] h-[24px]">
      <span className={`absolute transition-all duration-1000 ${isGreek ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-95'}`}>
        "Τὸ γὰρ ὅλον παρὰ τὰ μόρια"
      </span>
      <span className={`absolute transition-all duration-1000 ${!isGreek ? 'opacity-100 blur-0 scale-100 text-brand-red drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]' : 'opacity-0 blur-md scale-105'}`}>
        "The whole is something besides the parts"
      </span>
    </span>
  )
}

export function Layout"""
if "QuoteMatrix" not in layout:
    layout = layout.replace("export function Layout", quote_comp)

# Nav Logo Neon pulse
layout = layout.replace(
    '<span className="font-display text-2xl text-[#E63946] leading-none transition-transform group-hover:scale-110 origin-bottom">',
    '<span className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_20px_rgba(216,43,43,1)] origin-bottom group-hover:animate-pulse">'
)

# Nav items sliding line
layout = re.sub(
    r'className={`\s*relative px-4 py-1\.5 text-\[11px\] font-medium uppercase tracking-\[0\.18em\] transition-colors duration-200.*?`}',
    r'className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200 ${isActive ? \'text-brand-red\' : \'text-text-secondary hover:text-text-primary\'}`} data-active={isActive}',
    layout, flags=re.DOTALL
)

# Global Grid injection
if '<div className="global-grid-bg" aria-hidden="true" />' not in layout:
    layout = layout.replace('<div className="bg-grain" aria-hidden="true" />', '<div className="bg-grain" aria-hidden="true" />\n      <div className="global-grid-bg" aria-hidden="true" />')

# Footer sentences
layout = layout.replace(
    '<p className="font-light leading-relaxed">\n              Multi-language reasoning traces secured on Arc L1.<br/>\n              An institutional-grade intelligence layer for global macro.\n            </p>',
    '<div className="flex flex-col gap-1.5 font-light whitespace-nowrap overflow-hidden"><span className="truncate">Multi-language reasoning traces secured on Arc L1.</span><span className="truncate">An institutional-grade intelligence layer for global macro.</span></div>'
)

# Footer Links
layout = layout.replace(
    '<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-brand-red transition-colors font-medium">Agora Agents Hackathon</a> · 2026<br />\n              Inspired by the <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-brand-red transition-colors font-medium">All Weather discipline</a> of Bridgewater Associates.',
    '<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">Agora Agents Hackathon</a><br />\n              Inspired by the <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">All Weather discipline</a> of Bridgewater Associates.'
)

# Replace duplicate year / add quote
layout = re.sub(
    r'<div className="w-full max-w-\[1440px\] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/\[0\.02\] flex items-center justify-between text-\[10px\] text-text-tertiary uppercase tracking-\[0\.25em\]">\s*<span>© 2026 Rosetta Alpha</span>\s*<span>Made with discipline · Not noise</span>\s*</div>',
    """<div className="w-full max-