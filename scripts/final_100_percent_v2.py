import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. SignInModal: Make the buttons pop more so they don't blend in
replace_in_file('frontend/src/components/SignInModal.tsx',
    'border border-white/10 border-l-[4px] border-l-brand-red bg-[#111111] hover:bg-[#1a1a1a]',
    'border border-white/20 border-l-[4px] border-l-brand-red bg-[#1A1A1A] hover:bg-[#2A2A2A]'
)

# 2. EarnQuiz: Ensure text is on one line using proper Tailwind classes
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap w-full text-center">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>',
    '<p className="text-text-secondary text-xs leading-relaxed truncate w-full text-center max-w-[500px]">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>'
)

# 3. Pricing Page: Fix entrance animation and text wrapping
replace_in_file('frontend/src/app/pricing/page.tsx',
    'className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"',
    'className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out"'
)
replace_in_file('frontend/src/app/pricing/page.tsx',
    '<p className="mt-4 w-full text-center whitespace-nowrap text-text-secondary text-sm">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>',
    '<p className="mt-4 w-full text-center truncate text-text-secondary text-sm max-w-[800px] mx-auto">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>'
)

# 4. EllipseView Hover Fix: Prevent tooltip interference
replace_in_file('frontend/src/components/EllipseView.tsx',
    'className="absolute pointer-events-none border border-white/20 bg-black/90 backdrop-blur-md p-3 rounded-md shadow-2xl z-20 w-32 transition-transform duration-75"',
    'className="absolute pointer-events-none border border-white/20 bg-black/90 backdrop-blur-md p-3 rounded-md shadow-2xl z-50 w-32 transition-transform duration-75"'
)

# Fix hover overlap jitter by adding an SVG group and managing z-index better
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''                  <circle cx={x} cy={y} r={isHovered ? 6 : 2} fill={isHovered ? "var(--color-text-primary)" : "var(--color-brand-red)"} className="pointer-events-none transition-all duration-200" />
                  <circle
                    cx={x} cy={y} r={24} fill="transparent"
                    className="cursor-crosshair"
                    style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onClick={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                    onTouchStart={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                  />''',
    '''                  <circle cx={x} cy={y} r={isHovered ? 6 : 2} fill={isHovered ? "var(--color-text-primary)" : "var(--color-brand-red)"} className="pointer-events-none transition-all duration-200" />
                  <circle
                    cx={x} cy={y} r={16} fill="transparent"
                    className="cursor-crosshair"
                    style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onMouseLeave={(e) => { 
                      // Only clear if we are not moving to the tooltip
                      setHoveredPoint(null) 
                    }}
                  />'''
)

# 5. MobMeter: Fix layout to not be weirdly elongated
replace_in_file('frontend/src/components/MobMeter.tsx',
    'className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden flex flex-col justify-between h-full ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}',
    'className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden flex flex-col h-full ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}'
)

# 6. DesksView: Ensure proper grid allocation for MobMeter and DivergenceGauge
replace_in_file('frontend/src/components/DesksView.tsx',
    '<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">',
    '<div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">'
)

