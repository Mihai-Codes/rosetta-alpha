import re
import os

os.chdir('rosetta-alpha/frontend')

# 1. Update tailwind.config.js for intense glow
with open("tailwind.config.js", "r") as f:
    tw = f.read()
tw = tw.replace("'glow-red':  '0 0 20px rgba(191,74,74,0.15)'", "'glow-red': '0 0 24px rgba(216,43,43,0.6)',\n        'glow-red-strong': '0 0 32px rgba(216,43,43,0.9)'")
with open("tailwind.config.js", "w") as f:
    f.write(tw)

# 2. Update index.css for Global Grid & animations
with open("src/index.css", "r") as f:
    css = f.read()

new_grid_css = """
@keyframes neon-grid-pulse {
  0%, 100% { opacity: 0.3; filter: drop-shadow(0 0 2px rgba(216,43,43,0.8)); }
  50% { opacity: 1; filter: drop-shadow(0 0 12px rgba(216,43,43,1)) drop-shadow(0 0 4px rgba(216,43,43,0.8)); }
}

.global-grid-bg {
  position: fixed;
  top: -100px; left: -100px; right: -100px; bottom: -100px;
  background-image:
    linear-gradient(rgba(216, 43, 43, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 43, 43, 0.3) 1px, transparent 1px);
  background-size: 100px 100px;
  animation: hero-grid-drift 20s linear infinite, neon-grid-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.05) 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.05) 80%, transparent 100%);
  z-index: 0;
}

.nav-link {
  position: relative;
}
.nav-link::after {
  content: '';
  position: absolute;
  width: 0;
  height: 2px;
  bottom: -4px;
  left: 50%;
  background-color: var(--color-brand-red);
  transition: all 0.3s ease;
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(216,43,43,0.8);
}
.nav-link:hover::after, .nav-link[data-active="true"]::after {
  width: 100%;
}
"""
css = re.sub(r'@keyframes neon-grid-pulse \{.*?\pointer-events: none;\n}', new_grid_css, css, flags=re.DOTALL)
with open("src/index.css", "w") as f:
    f.write(css)

# 3. Update Layout.tsx (Nav hover, Footer, Global Grid, Quote)
with open("src/components/Layout.tsx", "r") as f:
    layout = f.read()

# Inject QuoteMatrix component
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
layout = layout.replace("export function Layout", quote_comp)

# Fix Nav Logo
layout = layout.replace(
    """<span className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(216,43,43,0.8)] origin-bottom group-hover:animate-pulse">""",
    """<span className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_20px_rgba(216,43,43,1)] origin-bottom group-hover:animate-pulse">"""
)

# Nav items cool hover
layout = re.sub(
    r'className={`\s*relative px-4 py-1\.5 text-\[11px\] font-medium uppercase tracking-\[0\.18em\] transition-colors duration-200.*?`}',
    r'className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200 ${isActive ? \'text-brand-red\' : \'text-text-secondary hover:text-text-primary\'}`} data-active={isActive}',
    layout, flags=re.DOTALL
)
layout = re.sub(r'<span\s+className={`absolute left-4 right-4 -bottom-px h-px.*?/>\s*</button>','</button>', layout, flags=re.DOTALL)

# Add Global Grid
layout = layout.replace('<div className="bg-grain" aria-hidden="true" />', '<div className="bg-grain" aria-hidden="true" />\n      <div className="global-grid-bg" aria-hidden="true" />')

# Fix Footer Sentences (No wrapping)
layout = layout.replace(
    """<p className="font-light leading-relaxed">
              Multi-language reasoning traces secured on Arc L1.<br/>
              An institutional-grade intelligence layer for global macro.
            </p>""",
    """<div className="flex flex-col gap-1.5 font-light whitespace-nowrap overflow-hidden">
              <span className="truncate">Multi-language reasoning traces secured on Arc L1.</span>
              <span className="truncate">An institutional-grade intelligence layer for global macro.</span>
            </div>"""
)

# Fix Footer Links & Quote & Year
layout = layout.replace(
    """<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-brand-red transition-colors font-medium">Agora Agents Hackathon</a> · 2026<br />
              Inspired by the <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-brand-red transition-colors font-medium">All Weather discipline</a> of Bridgewater Associates.""",
    """<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">Agora Agents Hackathon</a><br />
              Inspired by the <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">All Weather discipline</a> of Bridgewater Associates."""
)

layout = re.sub(
    r'<div className="w-full max-w-\[1440px\] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/\[0\.02\] flex items-center justify-between text-\[10px\] text-text-tertiary uppercase tracking-\[0\.25em\]">\s*<span>© 2026 Rosetta Alpha</span>\s*<span className="italic">"Τὸ γὰρ ὅλον παρὰ τὰ μόρια" — Aristotle</span>\s*</div>',
    """<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/[0.02] flex items-center justify-between flex-wrap gap-4 text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <span>© 2026 Rosetta Alpha</span>
          <QuoteMatrix />
          <span>Aristotle</span>
        </div>""",
    layout, flags=re.DOTALL
)
with open("src/components/Layout.tsx", "w") as f:
    f.write(layout)


# 4. Update HeroSection.tsx
with open("src/components/HeroSection.tsx", "r") as f:
    hero = f.read()

# Subtitle to strictly one line
hero = re.sub(r'className={`text-lg md:text-xl text-text-secondary font-light.*?`}', 'className={`text-lg md:text-xl text-text-secondary font-light max-w-full mx-auto px-4 whitespace-nowrap overflow-hidden text-ellipsis leading-relaxed mb-10 transition-all duration-1000 delay-200 ${visible.subtitle ? \'opacity-100 translate-y-0\' : \'opacity-0 translate-y-4\'}`}', hero, flags=re.DOTALL)

# Regional Dots Pulse - More intense glow
hero = hero.replace(
    """<div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />""",
    """<div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }} />"""
)
hero = hero.replace("hover:border-white/[0.05]", "hover:border-brand-red/50 hover:shadow-glow-red-strong transition-all duration-300 cursor-pointer")

# Latest Trace button
hero = hero.replace("border-white/[0.05] mb-10", "border-brand-red/60 shadow-[0_0_15px_rgba(216,43,43,0.3)] mb-10")

# Remove internal grid from hero since it's now global
hero = hero.replace('<div className="absolute inset-0 hero-grid-bg" aria-hidden />', '')

with open("src/components/HeroSection.tsx", "w") as f:
    f.write(hero)


# 5. Update AllWeatherChart.tsx (Alignment)
with open("src/components/AllWeatherChart.tsx", "r") as f:
    awc = f.read()

awc = awc.replace(
    """<p className="text-[10px] text-text-tertiary leading-relaxed mt-5 pt-5 border-t border-border">
        Inspired by Bridgewater's All Weather strategy — balanced exposure
        across four economic regimes: rising/falling growth and inflation.
      </p>""",
    """<div className="text-center mt-6 pt-5 border-t border-border/50">
        <p className="text-[10px] text-text-tertiary leading-relaxed max-w-[220px] mx-auto">
          Inspired by Bridgewater's <a href="https://www.bridgewater.com/research-and-insights/the-all-weather-story" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.5)]">All Weather strategy</a><br/>
          balanced exposure across four economic regimes: rising/falling growth and inflation.
        </p>
      </div>"""
)
with open("src/components/AllWeatherChart.tsx", "w") as f:
    f.write(awc)


# 6. Update ThesisCard.tsx (Claude-like typewriter generation + clean indent)
with open("src/components/ThesisCard.tsx", "r") as f:
    thesis = f.read()

typewriter_comp = """
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = React.useState('')
  
  React.useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i))
      i += 3 // Spits out 3 chars at a time
      if (i > text.length) {
        setDisplayed(text)
        clearInterval(interval)
      }
    }, 15)
    return () => clearInterval(interval)
  }, [text])

  return <span>{displayed}<span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand-red animate-pulse align-middle" /></span>
}

export function ThesisCard"""
if "TypewriterText" not in thesis:
    thesis = thesis.replace("export function ThesisCard", typewriter_comp)

# Inject Typewriter into Analysis blocks
thesis = re.sub(
    r'<p className="text-sm text-text-primary font-light leading-relaxed mb-2 text-justify[^>]*>\s*\{block\.analysis\}\s*</p>',
    r'<p className="text-sm text-text-primary font-light leading-relaxed mb-2 text-left pr-4"><TypewriterText text={block.analysis} /></p>',
    thesis
)
thesis = re.sub(
    r'<p className="text-sm text-text-secondary font-light leading-relaxed mb-2 pl-4 border-l border-border text-justify[^>]*>\s*\{block\.analysis_en\}\s*</p>',
    r'<p className="text-sm text-text-secondary font-light leading-relaxed mb-2 pl-4 border-l-2 border-border/50 text-left pr-4"><TypewriterText text={block.analysis_en} /></p>',
    thesis
)

with open("src/components/ThesisCard.tsx", "w") as f:
    f.write(thesis)

print("Applied strict UI/UX fixes.")
