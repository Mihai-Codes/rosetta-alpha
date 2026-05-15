import re
import os

# 1. Update index.css for intense glow and global grid
with open('src/index.css', 'r') as f:
    css = f.read()

# Enhance red pulse
css = re.sub(
    r'@keyframes red-pulse \{.*?\}',
    '@keyframes red-pulse {\\n  0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 8px rgba(216,43,43,0.8)); }\\n  50% { opacity: 1; filter: drop-shadow(0 0 24px rgba(216,43,43,1)) drop-shadow(0 0 12px rgba(216,43,43,1)); }\\n}',
    css, flags=re.DOTALL
)

# Ensure global grid exists and fades
if '.global-grid-bg' not in css:
    css += """
.global-grid-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    linear-gradient(rgba(216, 43, 43, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 43, 43, 0.15) 1px, transparent 1px);
  background-size: 100px 100px;
  animation: hero-grid-drift 30s linear infinite, red-pulse 3.5s ease-in-out infinite;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, transparent 100%);
  z-index: 0;
}
"""

with open('src/index.css', 'w') as f:
    f.write(css)


# 2. Update Layout.tsx
with open('src/components/Layout.tsx', 'r') as f:
    layout = f.read()

# R△ Hover Effect
layout = layout.replace(
    'group-hover:drop-shadow-[0_0_20px_rgba(216,43,43,1)]',
    'group-hover:drop-shadow-[0_0_24px_rgba(216,43,43,1)]'
)

# Nav items hover effect
layout = layout.replace(
    'text-text-secondary hover:text-text-primary',
    'text-text-secondary hover:text-brand-red hover:drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]'
)

# Connect Wallet intense glow
layout = layout.replace(
    'hover:shadow-glow-red',
    'hover:shadow-[0_0_24px_rgba(216,43,43,0.8)]'
)

# Footer Sentences to ONE line each without wrapping
layout = layout.replace(
    """<div className="flex flex-col gap-1.5 font-light whitespace-nowrap overflow-hidden">
              <span className="truncate">Multi-language reasoning traces secured on Arc L1.</span>
              <span className="truncate">An institutional-grade intelligence layer for global macro.</span>
            </div>""",
    """<div className="flex flex-col gap-1.5 font-light whitespace-nowrap">
              <span>Multi-language reasoning traces secured on Arc L1.</span>
              <span>An institutional-grade intelligence layer for global macro.</span>
            </div>"""
)

# Remove duplicate year
layout = layout.replace(
    """<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">Agora Agents Hackathon</a> · 2026<br />""",
    """<a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">Agora Agents Hackathon</a><br />"""
)

# Aristotle Quote sizing
layout = layout.replace(
    'text-sm font-display tracking-wide relative inline-flex items-center justify-center min-w-[360px] h-[24px]',
    'text-base md:text-lg font-display tracking-wide relative inline-flex items-center justify-center min-w-[440px] h-[32px]'
)

with open('src/components/Layout.tsx', 'w') as f:
    f.write(layout)


# 3. Update HeroSection.tsx
with open('src/components/HeroSection.tsx', 'r') as f:
    hero = f.read()

# Subtitle to strictly ONE line
hero = re.sub(
    r'className={`text-lg md:text-xl text-text-secondary font-light.*?`}',
    r'className={`text-lg md:text-xl text-text-secondary font-light w-full max-w-full whitespace-nowrap overflow-hidden text-ellipsis mb-12 px-4 transition-all duration-1000 delay-150 ${visible.subtitle ? \'opacity-100 translate-y-0\' : \'opacity-0 translate-y-4\'}`}',
    hero, flags=re.DOTALL
)

# Country dots hover intense glow
hero = hero.replace(
    'hover:border-brand-red/30 transition-colors duration-300',
    'hover:border-brand-red hover:shadow-[0_0_20px_rgba(216,43,43,0.6)] transition-all duration-300'
)

# Latest Trace visibility
hero = hero.replace(
    'glass-panel rounded-full border border-white/[0.05] mb-10',
    'glass-panel rounded-full border border-brand-red/60 shadow-[0_0_15px_rgba(216,43,43,0.3)] mb-10'
)

with open('src/components/HeroSection.tsx', 'w') as f:
    f.write(hero)


# 4. Update RegionSidebar.tsx for Alignment
with open('src/components/RegionSidebar.tsx', 'r') as f:
    sidebar = f.read()

# Move title inside glass panel
old_sidebar = """<aside className="w-full lg:w-[260px] shrink-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-4 px-1">
        Regional Desks
      </p>

      <div className="glass-panel border border-border/20 rounded-xl overflow-hidden shadow-none divide-y divide-white/[0.02]">"""

new_sidebar = """<aside className="w-full lg:w-[260px] shrink-0">
      <div className="glass-panel border border-border/20 rounded-xl overflow-hidden shadow-none flex flex-col">
        <div className="px-5 py-5 border-b border-white/[0.05]">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary">
            Regional Desks
          </p>
        </div>
        <div className="divide-y divide-white/[0.02]">"""

sidebar = sidebar.replace(old_sidebar, new_sidebar)
sidebar = sidebar.replace("</div>\n    </aside>", "</div>\n      </div>\n    </aside>")

with open('src/components/RegionSidebar.tsx', 'w') as f:
    f.write(sidebar)


# 5. Update DesksView.tsx
with open('src/components/DesksView.tsx', 'r') as f:
    desks = f.read()

# Align items to top
desks = desks.replace('<div className="flex flex-col lg:flex-row gap-8">', '<div className="flex flex-col lg:flex-row items-start gap-8">')

with open('src/components/DesksView.tsx', 'w') as f:
    f.write(desks)


# 6. Update AllWeatherChart.tsx
with open('src/components/AllWeatherChart.tsx', 'r') as f:
    awc = f.read()

awc = awc.replace(
    '<p className="text-[10px] text-text-tertiary leading-relaxed max-w-[220px] mx-auto">',
    '<p className="text-[10px] text-text-tertiary leading-relaxed max-w-[220px] mx-auto text-center">'
)

with open('src/components/AllWeatherChart.tsx', 'w') as f:
    f.write(awc)

