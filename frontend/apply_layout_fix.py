import re
import os

os.chdir('rosetta-alpha/frontend')

with open("src/components/Layout.tsx", "r") as f:
    layout = f.read()

# Fix Nav Logo Hover & Pulse
layout = layout.replace(
    """<span className="font-display text-2xl text-brand-red leading-none transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_rgba(216,43,43,1)] origin-bottom">""",
    """<span className="font-display text-2xl text-brand-red leading-none transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_20px_rgba(216,43,43,1)] origin-bottom group-hover:animate-pulse">"""
)

# Nav Links Slider Effect
layout = re.sub(
    r'className={`\s*relative px-4 py-1\.5 text-\[11px\] font-medium uppercase tracking-\[0\.18em\] transition-colors duration-200\s*\$\{isActive \? \'text-brand-red\' : \'text-text-secondary hover:text-text-primary\'\}\s*`}',
    r'className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors duration-200 ${isActive ? \'text-brand-red\' : \'text-text-secondary hover:text-text-primary\'}`} data-active={isActive}',
    layout
)
layout = re.sub(r'<span\s+className={`absolute left-4 right-4 -bottom-px h-px transition-all duration-300 \$\{\s*isActive \? \'bg-brand-red opacity-100\' : \'bg-brand-red opacity-0\'\s*\}\s*`}\s*/>', '', layout)

# Background Grain and Matrix Grid
if '<div className="global-grid-bg" aria-hidden="true" />' not in layout:
    layout = layout.replace('<div className="bg-grain" aria-hidden="true" />', '<div className="bg-grain" aria-hidden="true" />\n      <div className="global-grid-bg" aria-hidden="true" />')

# Footer Lines
layout = layout.replace(
    """<p className="font-light leading-relaxed max-w-[240px]">
              Multi-language reasoning traces secured on Arc L1.<br className="hidden sm:block" />
              An institutional-grade intelligence layer for global macro.
            </p>""",
    """<div className="flex flex-col gap-1.5 font-light whitespace-nowrap overflow-hidden">
              <span className="truncate">Multi-language reasoning traces secured on Arc L1.</span>
              <span className="truncate">An institutional-grade intelligence layer for global macro.</span>
            </div>"""
)

# Aristotle Quote Matrix
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

layout = re.sub(
    r'<div className="w-full max-w-\[1440px\] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/\[0\.02\] flex items-center justify-between text-\[10px\] text-text-tertiary uppercase tracking-\[0\.25em\]">\s*<span>© 2026 Rosetta Alpha</span>\s*<span className="italic text-text-secondary">.*?</span>\s*</div>',
    """<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 mt-12 pt-8 border-t border-white/[0.02] flex items-center justify-between flex-wrap gap-4 text-[10px] text-text-tertiary uppercase tracking-[0.25em]">
          <span>© 2026 Rosetta Alpha</span>
          <QuoteMatrix />
          <span>Aristotle</span>
        </div>""",
    layout, flags=re.DOTALL
)

with open("src/components/Layout.tsx", "w") as f:
    f.write(layout)

# DesksView Layout Fix (Alignment)
with open("src/components/DesksView.tsx", "r") as f:
    desks = f.read()

# Make sure all three columns start at exactly the same vertical level by moving the title
desks = desks.replace(
    """<p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-4 px-1">
        Regional Desks
      </p>""",
    """<p className="text-[10px] font-medium uppercase tracking-[0.25em] text-transparent mb-4 px-1 select-none">
        Spacer
      </p>""" # Hide it but keep the physical space so it aligns perfectly with the ThesisCard header
)

with open("src/components/DesksView.tsx", "w") as f:
    f.write(desks)

print("Fixed layout")
