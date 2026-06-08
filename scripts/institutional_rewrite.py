import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. ThesisCard: More breathable reasoning chain
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<ol className="space-y-4 sm:space-y-6">',
    '<ol className="space-y-8 sm:space-y-10">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '''      <div
        className="hidden md:block pl-8 pr-4"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >''',
    '''      <div
        className="hidden md:block pl-10 pr-6 pb-2"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >'''
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-sm text-text-primary font-light leading-relaxed mb-2 text-justify">',
    '<p className="text-[14px] text-text-primary font-light leading-loose mb-5 text-justify">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[11px] text-text-tertiary mb-3 font-light italic">',
    '<p className="text-[12px] text-text-tertiary mb-5 font-light italic">'
)

# 2. AllWeatherChart & EllipseView: Centered headers
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">',
    '<div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">'
)
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''<div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
            <p className="font-display text-lg text-text-primary">The Ellipse View</p>
          </div>
        </div>''',
    '''<div className="flex flex-col items-center justify-center text-center mb-4 px-4 pt-4 sm:px-6 shrink-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>'''
)
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''<div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
            <span className="text-[10px] text-text-tertiary">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 uppercase tracking-widest text-[8px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>''',
    '''<div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
            <span className="text-[10px] text-text-tertiary text-center">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 uppercase tracking-widest text-[8px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>'''
)

# 3. Leaderboards: Fix Rank #2 color to Bright Silver and sort the podium correctly
for lb_path in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    replace_in_file(lb_path, "row.rank === 2 ? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#E5E4E2]' :")
    replace_in_file(lb_path, "t.rank === 2 ? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#E5E4E2]' :")
    # Fix the slice to use 'sorted' instead of 'TRADERS'
    replace_in_file(lb_path, "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")

# 4. CircleInfraPanel: Professional API/Webhook copy
ci_path = 'frontend/src/components/CircleInfraPanel.tsx'
replace_in_file(ci_path, 
    '''<span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''<span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>'''
)
replace_in_file(ci_path,
    '''<span className="text-emerald-400/70 font-mono text-[10px] normal-case tracking-normal">/api/x402/agent-insight</span>''',
    '''<span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Secure Agent Intelligence API (x402-Protected)</span>'''
)

