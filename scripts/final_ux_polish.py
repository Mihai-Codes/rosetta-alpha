import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. Sign In Modal: Fix the blending buttons to stand out with a distinct red line
replace_in_file('frontend/src/components/SignInModal.tsx',
    'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-border-strong border-l-2 border-l-brand-red bg-bg-secondary hover:bg-bg-secondary hover:border-brand-red text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"',
    'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-white/10 border-l-[3px] border-l-brand-red bg-[#111111] hover:bg-[#1a1a1a] hover:border-white/30 text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 shadow-md"'
)

# 2. MobMeter & DivergenceGauge: Elevate design from cheap borders to solid panels with gradients
replace_in_file('frontend/src/components/MobMeter.tsx',
    'className={`border border-white/10 bg-bg-secondary relative overflow-hidden ${compact ? \'p-4\' : \'p-6\'}`}',
    'className={`solid-panel bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.8)] ${compact ? \'p-4\' : \'p-6\'}`}'
)

replace_in_file('frontend/src/components/DivergenceGauge.tsx',
    'className="border border-white/10 bg-bg-secondary p-6 relative flex flex-col justify-between h-full"',
    'className="solid-panel bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 p-6 relative flex flex-col justify-between h-full shadow-[0_4px_24px_rgba(0,0,0,0.8)]"'
)

# 3. EarnQuiz: Force text onto one line
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    '<p className="text-text-secondary text-xs leading-relaxed max-w-xl mx-auto">',
    '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis">'
)

# 4. Pricing Page: One-liner text
replace_in_file('frontend/src/app/pricing/page.tsx',
    '<p className="mt-4 w-full text-center whitespace-normal md:whitespace-nowrap text-text-secondary">\n            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.\n          </p>',
    '<p className="mt-4 w-full text-center whitespace-nowrap text-text-secondary text-sm">\n            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.\n          </p>'
)

# 5. Ellipse View: Fix the hover jumping state
# The issue occurs because the visual circle's radius changes, triggering mouseLeave. We use an invisible static hit area instead.
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''                <g key={i}>
                  <circle cx={x} cy={y} r={isHovered ? 6 : 2} fill={isHovered ? "var(--color-text-primary)" : "var(--color-brand-red)"} className="pointer-events-none transition-all duration-200" />
                  <circle
                    cx={x} cy={y} r={20} fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onClick={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                    onTouchStart={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                  />
                </g>''',
    '''                <g key={i}>
                  <circle cx={x} cy={y} r={isHovered ? 6 : 2} fill={isHovered ? "var(--color-text-primary)" : "var(--color-brand-red)"} className="pointer-events-none transition-all duration-200" />
                  <circle
                    cx={x} cy={y} r={18} fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onClick={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                    onTouchStart={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                  />
                </g>'''
)

