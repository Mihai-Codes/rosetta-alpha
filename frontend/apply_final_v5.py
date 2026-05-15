import re
import os

# --- index.css ---
with open('src/index.css', 'r') as f:
    css = f.read()

# Enhance red pulse for maximum neon intensity
css = re.sub(
    r'@keyframes red-pulse \{.*?\}',
    '@keyframes red-pulse {\\n  0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 12px rgba(216,43,43,0.8)); }\\n  50% { opacity: 1; filter: drop-shadow(0 0 32px rgba(216,43,43,1)) drop-shadow(0 0 16px rgba(216,43,43,1)); }\\n}',
    css, flags=re.DOTALL
)

# Ensure global grid fades seamlessly into the bottom
if '.global-grid-bg' not in css:
    css += """
.global-grid-bg {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    linear-gradient(rgba(216, 43, 43, 0.25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 43, 43, 0.25) 1px, transparent 1px);
  background-size: 100px 100px;
  animation: hero-grid-drift 20s linear infinite, red-pulse 3s ease-in-out infinite;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, transparent 100%);
  z-index: 0;
}
"""
else:
    css = re.sub(
        r'\.global-grid-bg \{.*?\}',
        '.global-grid-bg {\\n  position: fixed;\\n  top: 0; left: 0; right: 0; bottom: 0;\\n  background-image:\\n    linear-gradient(rgba(216, 43, 43, 0.25) 1px, transparent 1px),\\n    linear-gradient(90deg, rgba(216, 43, 43, 0.25) 1px, transparent 1px);\\n  background-size: 100px 100px;\\n  animation: hero-grid-drift 30s linear infinite, red-pulse 3.5s ease-in-out infinite;\\n  pointer-events: none;\\n  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, transparent 100%);\\n  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, transparent 100%);\\n  z-index: 0;\\n}',
        css, flags=re.DOTALL
    )

with open('src/index.css', 'w') as f:
    f.write(css)


# --- Layout.tsx ---
with open('src/components/Layout.tsx', 'r') as f:
    layout = f.read()

# Nav Menu sliding hover effect
layout = re.sub(
    r'className={`nav-link px-4 py-1\.5 text-\[11px\] font-medium uppercase tracking-\[0\.18em\] transition-colors duration-200 \$\{isActive \? \'text-brand-red\' : \'text-text-secondary hover:text-brand-red hover:drop-shadow-\[0_0_8px_rgba\(216,43,43,0\.8\)\]\'\}`} data-active=\{isActive\}',
    r'className={`nav-link px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-300 ${isActive ? \'text-brand-red drop-shadow-[0_0_8px_rgba(216,43,43,0.8)]\' : \'text-text-secondary hover:text-brand-red hover:drop-shadow-[0_0_12px_rgba(216,43,43,1)]\'}`} data-active={isActive}',
    layout, flags=re.DOTALL
)

# Connect Wallet super intense glow
layout = layout.replace(
    'hover:shadow-[0_0_24px_rgba(216,43,43,0.8)]',
    'hover:shadow-[0_0_32px_rgba(216,43,43,1)]'
)

# Aristotle Matrix Quote scale up & text-brand-red