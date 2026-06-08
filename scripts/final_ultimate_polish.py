import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

def replace_regex(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# 1. ThesisCard: Bigger, breathable reasoning chain
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<ol className="space-y-8 sm:space-y-12">',
    '<ol className="space-y-12 sm:space-y-16">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '''      <div
        className="hidden md:block pl-10 pr-6 pb-2"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >''',
    '''      <div
        className="hidden md:block pl-12 pr-8 pb-6"
        style={{ borderLeft: `2px solid ${meta.color}30` }}
      >'''
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[13px] text-text-tertiary mb-5 font-light italic">',
    '<p className="text-[14px] text-text-tertiary mb-6 font-light italic leading-relaxed">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[15px] text-text-primary font-light leading-loose mb-4 text-justify">',
    '<p className="text-base text-text-primary font-light leading-[2.2] mb-6 text-justify">'
)

# 2. DesksView: Elongate the chart container so everything fits on one line
replace_in_file('frontend/src/components/DesksView.tsx',
    'className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 solid-panel rounded-none border overflow-hidden"',
    'className="hidden lg:flex flex-col w-[420px] xl:w-[480px] shrink-0 solid-panel rounded-none border overflow-hidden"'
)

# 3. AllWeatherChart: Center text, remove truncation, and fix 1-liner
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">',
    '<div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">'
)
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<p className="text-[9px] sm:text-[10px] text-text-secondary font-mono opacity-80 truncate">{q.assets.join(', ')}</p>',
    '<p className="text-[10px] sm:text-[11px] text-text-secondary font-mono opacity-80 whitespace-normal">{q.assets.join(', ')}</p>'
)
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<p className="text-[10px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">',
    '<p className="text-[11px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">'
)

# 4. EllipseView: Center texts
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''<div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>
      </div>''',
    '''<div className="flex flex-col items-center justify-center mb-4 px-4 pt-4 sm:px-6 shrink-0 border-b border-border/50 pb-4 text-center w-full">
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

# 5. LeaderboardView & DashboardView fixes
for p in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    # Rank #2 Silver Color
    replace_in_file(p, "t.rank === 2 ? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
    # Sorting podium logic
    replace_in_file(p, "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")
    # Sizing for Agent Leaderboard rank numbers
    replace_regex(p, r'font-display text-3xl font-bold tracking-tight', 'font-mono text-xl font-bold tracking-tight')
    replace_regex(p, r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary')
    replace_regex(p, r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-2xl', 'font-mono text-base')

# 6. DashboardView Historical Signal Layout
replace_in_file('frontend/src/components/DashboardView.tsx',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left border-l-0 lg:border-l border-border/60">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-tertiary mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-red rounded-full"></span> Historical Signal
          </p>
          <p className="font-display text-xl text-text-primary leading-snug mb-3">
            Extreme agreement is a reversal-risk warning, not confirmation.
          </p>
          <div className="h-px w-8 bg-brand-red/50 mb-4" />
          <p className="text-[10px] font-mono text-text-secondary leading-relaxed">
            Backtest hooks ready for rosetta_dataset.jsonl. Live calibration updates after Arc settlements.
          </p>
        </div>''',
    '''        <div className="bg-bg-secondary p-6 sm:p-8 flex flex-col justify-center text-center items-center border-l-0 lg:border-l border-border/60">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <p className="font-display text-2xl text-text-primary leading-snug mb-3">
            Extreme agreement is a <span className="text-warning">reversal-risk</span> warning.
          </p>
          <p className="text-[11px] font-mono text-text-secondary leading-relaxed max-w-sm">
            Backtest hooks ready. Live calibration updates post-Arc settlement.
          </p>
        </div>'''
)

# 7. PricingPage Animation
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">''',
    '''<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">'''
)
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''        {/* x402 Callout */}''',
    '''      </motion.div>
        {/* x402 Callout */}'''
)

# 8. CircleInfraPanel one-liner
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''<span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>'''
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

# 9. LiveFeedView Full Hover
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    
    old_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div 
                  className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >'''
    new_item = '''              <div
                key={key}
                className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                <div className="w-full flex flex-col relative h-full pl-[3px]">'''
    lf_content = lf_content.replace(old_item, new_item)
    
    # Fix event stop propagation
    lf_content = lf_content.replace(
        '''onClick={() => {
                      if (!e.ipfs_thesis_cid) return
                      setSelectedProvenance(e)
                      posthog.capture('feed_provenance_opened',''',
        '''onClick={(ev) => {
                      ev.stopPropagation()
                      if (!e.ipfs_thesis_cid) return
                      setSelectedProvenance(e)
                      posthog.capture('feed_provenance_opened','''
    )
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)
    print("Updated LiveFeedView hover.")

