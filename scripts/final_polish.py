import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. Fix global borders so they don't blend with the background
replace_in_file('frontend/src/index.css', 
    '--color-border: #0A0A0A;\n  --color-border-strong: #0A0A0A;',
    '--color-border: #1A1A1A;\n  --color-border-strong: #2A2A2A;'
)

# 2. Sign In Modal Buttons: Add a distinctive red left-border and fix text wrapping
replace_in_file('frontend/src/components/SignInModal.tsx',
    'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-border-strong bg-bg-secondary hover:bg-bg-secondary hover:border-brand-red/60 text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"',
    'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-border-strong border-l-2 border-l-brand-red bg-bg-secondary hover:bg-bg-secondary hover:border-brand-red text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"'
)

# 3. Rename Circle View to Matrix View (which is more accurate for the 2x2 grid)
with open('frontend/src/components/DesksView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("setChartView('circle')", "setChartView('matrix')")
content = content.replace("chartView === 'circle'", "chartView === 'matrix'")
content = content.replace("Circle View", "Matrix View")
content = content.replace("<AllWeatherChart />", "<AllWeatherChart />")
with open('frontend/src/components/DesksView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DesksView.tsx")

# 4. Fix Ellipse View Hover jumping (invisible larger hit area overlay)
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
                    onMouseEnter={() => setHoveredPoint({ x, y, data: d })}
                    onClick={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                    onTouchStart={(e) => { e.stopPropagation(); setHoveredPoint({ x, y, data: d }) }}
                  />
                </g>'''
)

# 5. Earn Quiz Text Layout (prevent unnatural wrapping)
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    'max-w-xs mx-auto',
    'max-w-xl mx-auto'
)
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    'Your USDC reward is being processed — a claim\\n            transaction has been sent to the rewards pool on Arc Testnet.',
    'Your USDC has been sent to the Arc Testnet pool.'
)
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    "toast.success('Reward Claimed', { description: 'Your USDC has been sent to the Arc Testnet pool.', duration: 5000 })",
    "toast.success('Reward Claimed', { description: 'Your USDC has been sent to the Arc Testnet pool.', duration: 5000 })"
)

