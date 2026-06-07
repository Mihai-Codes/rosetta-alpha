import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. SignInModal: Make the button box distinctly visible with a solid red line and contrasting background
replace_in_file('frontend/src/components/SignInModal.tsx',
    'border border-border-strong border-l-[3px] border-l-brand-red bg-bg-secondary hover:bg-white/[0.04]',
    'border border-white/20 border-l-[4px] border-l-brand-red bg-[#1A1A1A] hover:bg-[#2A2A2A]'
)
replace_in_file('frontend/src/components/SignInModal.tsx',
    'border border-white/20 border-l-[4px] border-l-brand-red bg-[#1A1A1A] hover:bg-[#2A2A2A]',
    'border border-[#333333] border-l-[4px] border-l-brand-red bg-[#111111] hover:bg-[#222222]'
)

# 2. EarnQuiz: Ensure text is forced onto exactly one line and fully visible
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    '<p className="text-text-secondary text-xs leading-relaxed truncate w-full text-center max-w-[500px]">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>',
    '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-visible w-full text-center">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>'
)

# 3. Pricing Page: Ensure the descriptive text is strictly one line and add entrance effect
replace_in_file('frontend/src/app/pricing/page.tsx',
    '<p className="mt-4 w-full text-center truncate text-text-secondary text-sm max-w-[800px] mx-auto">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>',
    '<p className="mt-4 w-full text-center whitespace-nowrap overflow-visible text-text-secondary text-sm">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>'
)
# Ensure the wrapper has the smooth fade-in
replace_in_file('frontend/src/app/pricing/page.tsx',
    'className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48"',
    'className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out"'
)

# 4. EllipseView: Fix the hover point jitter by setting exact pointer events on the hit area
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''                  <circle
                    cx={x} cy={y} r={16} fill="transparent"
                    className="cursor-crosshair"
                    style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onMouseLeave={(e) => { 
                      // Only clear if we are not moving to the tooltip
                      setHoveredPoint(null) 
                    }}
                  />''',
    '''                  <circle
                    cx={x} cy={y} r={24} fill="transparent"
                    className="cursor-crosshair pointer-events-auto"
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />'''
)

# 5. MobMeter: Remove the weird elongation by adding a max-width and centering it, ensuring it looks compact
replace_in_file('frontend/src/components/MobMeter.tsx',
    'className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden flex flex-col justify-between h-full ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}',
    'className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden flex flex-col justify-between h-full w-full max-w-md mx-auto ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}'
)
replace_in_file('frontend/src/components/DivergenceGauge.tsx',
    'className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full"',
    'className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full w-full max-w-md mx-auto"'
)

