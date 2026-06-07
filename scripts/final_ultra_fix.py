import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. SignInModal: Red line and crisp box
replace_in_file('frontend/src/components/SignInModal.tsx',
    'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-white/20 bg-black hover:border-brand-red text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50"',
    'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-border-strong border-l-[3px] border-l-brand-red bg-bg-secondary hover:bg-white/[0.04] text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 shadow-md"'
)

# 2. MobMeter & DivergenceGauge: Revert to sleek institutional styling
replace_in_file('frontend/src/components/MobMeter.tsx',
    'className={`border border-white/10 bg-bg-secondary relative overflow-hidden ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}',
    'className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}'
)

replace_in_file('frontend/src/components/DivergenceGauge.tsx',
    'className="border border-white/10 bg-bg-secondary p-6 relative flex flex-col justify-between h-full"',
    'className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full"'
)

# 3. EarnQuiz: Force text onto one line
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    '<p className="text-text-secondary text-xs leading-relaxed max-w-xs mx-auto">',
    '<p className="text-text-secondary text-xs leading-relaxed truncate w-full max-w-[400px] mx-auto">'
)
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    'Your USDC reward is being processed — a claim\\n            transaction has been sent to the rewards pool on Arc Testnet.',
    'Your USDC has been sent to the Arc Testnet pool.'
)

# 4. Pricing Page: One-liner text
replace_in_file('frontend/src/app/pricing/page.tsx',
    '<p className="mt-4 w-full text-center truncate text-text-secondary text-sm">\\n            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.\\n          </p>',
    '<p className="mt-4 w-full text-center whitespace-nowrap overflow-hidden text-ellipsis text-text-secondary text-sm">\\n            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.\\n          </p>'
)

# 5. Ellipse View: Fix the hover jumping state
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''                <circle
                  key={i} cx={x} cy={y} r={isHovered ? 6 : 14}
                  fill={isHovered ? "#FFFFFF" : "transparent"}
                  stroke={isHovered ? "#D82B2B" : "transparent"} strokeWidth={2}
                  className="cursor-crosshair transition-all duration-200"
                  onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                  onClick={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                  onTouchStart={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                />''',
    '''                <g key={i}>
                  <circle cx={x} cy={y} r={isHovered ? 6 : 2} fill={isHovered ? "var(--color-text-primary)" : "var(--color-brand-red)"} className="pointer-events-none transition-all duration-200" />
                  <circle
                    cx={x} cy={y} r={20} fill="transparent"
                    className="cursor-crosshair"
                    style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onClick={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                    onTouchStart={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                  />
                </g>'''
)
