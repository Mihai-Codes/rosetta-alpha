import os

def replace_in_file(path, replacements):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f: f.write(content)
        print(f"Updated {path}")

# 1. SignInModal: Proper red line and styling
replace_in_file('frontend/src/components/SignInModal.tsx', [
    ('className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-white/10 border-l-[3px] border-l-brand-red bg-[#111111] hover:bg-[#1a1a1a] hover:border-white/30 text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 shadow-md"',
     'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-border border-l-[4px] border-l-brand-red bg-bg-secondary hover:bg-white/[0.04] text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50"')
])

# 2. EllipseView: Fix hover jumping (add pointerEvents: 'all' to hit area)
replace_in_file('frontend/src/components/EllipseView.tsx', [
    ('''<circle
                    cx={x} cy={y} r={18} fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}''',
     '''<circle
                    cx={x} cy={y} r={24} fill="transparent"
                    className="cursor-crosshair"
                    style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}''')
])

# 3. EarnQuiz: Ensure text is perfectly on one line
replace_in_file('frontend/src/components/EarnQuiz.tsx', [
    ('''<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis">
            All {total}/{total} correct. Your USDC reward is being processed — a claim
            transaction has been sent to the rewards pool on Arc Testnet.
          </p>''',
     '''<p className="text-text-secondary text-xs leading-relaxed truncate w-full max-w-[400px] mx-auto">
            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.
          </p>'''),
    ('''<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis">
            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.
          </p>''',
     '''<p className="text-text-secondary text-xs leading-relaxed truncate w-full max-w-[400px] mx-auto">
            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.
          </p>''')
])

# 4. MobMeter & DivergenceGauge: Revert to sleek institutional styling
replace_in_file('frontend/src/components/MobMeter.tsx', [
    ('className={`solid-panel bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.8)] ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}',
     'className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden ${compact ? \\\'p-4\\\' : \\\'p-6\\\'}`}')
])

replace_in_file('frontend/src/components/DivergenceGauge.tsx', [
    ('className="solid-panel bg-gradient-to-br from-[#111] to-[#050505] border border-white/10 p-6 relative flex flex-col justify-between h-full shadow-[0_4px_24px_rgba(0,0,0,0.8)]"',
     'className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full"')
])

