import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")
    else:
        print(f"Skipped {path}: String not found")

def replace_regex(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# 1. ThesisCard: Make reasoning chain box breathable
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<ol className="space-y-4 sm:space-y-6">',
    '<ol className="space-y-8 sm:space-y-12">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '''      <div
        className="hidden md:block pl-8 pr-4"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >''',
    '''      <div
        className="hidden md:block pl-10 pr-6 pb-4"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >'''
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-sm text-text-primary font-light leading-relaxed mb-2 text-justify">',
    '<p className="text-[15px] text-text-primary font-light leading-loose mb-5 text-justify">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[11px] text-text-tertiary mb-3 font-light italic">',
    '<p className="text-[13px] text-text-tertiary mb-4 font-light italic">'
)

# 2. AllWeatherChart: Center text, remove truncation, and fix 1-liner
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">',
    '<div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">'
)
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[\d+px\] sm:text-\[\d+px\] text-text-secondary font-mono opacity-80 truncate">',
    '<p className="text-[10px] sm:text-[11px] text-text-secondary font-mono opacity-80 whitespace-normal">'
)
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<p className="text-[10px] text-text-secondary font-mono opacity-80 truncate">{q.assets.join(\', \')}</p>',
    '<p className="text-[10px] text-text-secondary font-mono opacity-80 whitespace-normal">{q.assets.join(\', \')}</p>'
)
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[\d+px\] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">',
    '<p className="text-[11px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">'
)

# 3. EllipseView: Center texts
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''<div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>
      </div>''',
    '''<div className="flex flex-col items-center justify-center text-center mb-4 px-4 pt-4 sm:px-6 shrink-0 border-b border-border/50 pb-4 w-full">
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
    '''<div className="flex flex-col items-center justify-center gap-3 w-full">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
            <span className="text-[11px] text-text-tertiary text-center">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>'''
)

# 4. LeaderboardView & DashboardView: Fix rank #2 color to silver and fix sorting
for p in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    replace_in_file(p, "t.rank === 2 ? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "t.rank === 2 ? 'text-[#E2E8F0]' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-[#E2E8F0]' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")
    
    # Sizing for Agent Leaderboard rank numbers
    replace_regex(p, r'font-display text-3xl font-bold tracking-tight', 'font-mono text-xl font-bold tracking-tight')
    replace_regex(p, r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary')
    replace_regex(p, r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-2xl', 'font-mono text-base')

# 5. PricingPage Animation & Circle Infra Single-line fix
replace_in_file('frontend/src/app/pricing/page.tsx',
    '<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">',
    '<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">'
)
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<p className="text-[9px] text-text-tertiary uppercase tracking-widest leading-relaxed">
                  Subscribed Events:<br/>
                  <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>
                </p>''',
    '''<p className="text-[9px] text-text-tertiary uppercase tracking-widest leading-relaxed whitespace-nowrap overflow-visible">
                  Subscribed Events: <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>
                </p>'''
)
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''<span className="whitespace-nowrap"><span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span></span>'''
)

# 6. DashboardView Historical Signal Center alignment
hist_sig_old = '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left border-l border-border/60">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 bg-brand-red rounded-full" />
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Historical Signal Engine
            </p>
          </div>
          <p className="font-display text-2xl text-text-primary leading-snug mb-4">
            Extreme agreement is a <span className="text-brand-red">reversal-risk</span> warning, not confirmation.
          </p>
          <p className="text-[11px] text-text-secondary font-mono leading-relaxed border-l-[2px] border-border-strong pl-4">
            Backtest hooks ready for rosetta_dataset.jsonl. Live calibration updates post-Arc settlement.
          </p>
        </div>'''
hist_sig_new = '''        <div className="bg-bg-secondary p-6 sm:p-8 flex flex-col justify-center items-center text-center border-l-0 lg:border-l border-border/60">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-tertiary mb-4 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-red rounded-full"></span> Historical Signal
          </p>
          <p className="font-display text-xl text-text-primary leading-snug mb-3">
            Extreme agreement is a <span className="text-warning">reversal-risk</span> warning.
          </p>
          <div className="h-px w-8 bg-brand-red/50 mb-4" />
          <p className="text-[11px] font-mono text-text-secondary leading-relaxed max-w-sm">
            Backtest hooks ready. Live calibration updates post-Arc settlement.
          </p>
        </div>'''
replace_in_file('frontend/src/components/DashboardView.tsx', hist_sig_old, hist_sig_new)

# 7. LiveFeedView Hover Fix
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_c = f.read()
    
    # Try replacing the outer div
    old_div = 'className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? \'bg-white/[0.01]\' : \'\'}`}'
    new_div = 'className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? \'bg-white/[0.01]\' : \'\'}`}'
    lf_c = lf_c.replace(old_div, new_div)
    
    old_inner = 'className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"'
    new_inner = 'className="w-full flex flex-col relative h-full pl-[3px]"'
    lf_c = lf_c.replace(old_inner, new_inner)

    old_style = 'style={{ borderLeft: `3px solid ${meta.color}` }}'
    new_style = ''
    lf_c = lf_c.replace(old_style, new_style)

    # Insert the border div before the w-full flex flex-col
    lf_c = lf_c.replace('<div \n                  className="w-full flex flex-col relative h-full pl-[3px]"\n                  \n                >', '<div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />\n                <div className="w-full flex flex-col relative h-full pl-[3px]">')
    
    # Button fix
    lf_c = lf_c.replace(
        'onClick={() => {\n                      if (!e.ipfs_thesis_cid) return',
        'onClick={(ev) => {\n                      ev.stopPropagation();\n                      if (!e.ipfs_thesis_cid) return'
    )
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_c)

