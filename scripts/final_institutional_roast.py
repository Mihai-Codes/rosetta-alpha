import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")
    else:
        print(f"String not found in {path}: {old[:50]}...")

def replace_regex(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# ---------------------------------------------------------
# 1. ThesisCard: Bigger, Breathable Reasoning Chain
# ---------------------------------------------------------
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<ol className="space-y-12 sm:space-y-16">',
    '<ol className="space-y-8 sm:space-y-10 mt-6">'
)
# Update desktop reasoning block styling to be a distinct, padded card
old_desktop_block = '''      {/* Desktop: always expanded */}
      <div
        className="hidden md:block pl-12 pr-8 pb-6"
        style={{ borderLeft: `2px solid ${meta.color}30` }}
      >
        <span
          className="absolute -left-[13px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary"
          style={{ color: meta.color, border: `1px solid ${meta.color}80` }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: meta.color }}>
            {role}
          </p>
          {block.language && block.language !== 'en' && (
            <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary border border-border px-2 py-0.5">
              {block.language.toUpperCase()}
            </span>
          )}
        </div>
        <BlockContent block={block} meta={meta} />
      </div>'''

new_desktop_block = '''      {/* Desktop: always expanded */}
      <div
        className="hidden md:block relative bg-bg-secondary/30 border border-white/5 p-8 ml-8 rounded-sm shadow-sm"
        style={{ borderLeft: `3px solid ${meta.color}80` }}
      >
        <span
          className="absolute -left-[20px] top-8 w-8 h-8 flex items-center justify-center font-mono text-[11px] font-bold bg-bg-primary"
          style={{ color: meta.color, border: `2px solid ${meta.color}80` }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.25em]" style={{ color: meta.color }}>
            {role}
          </p>
          {block.language && block.language !== 'en' && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary border border-white/10 bg-white/5 px-2 py-1">
              {block.language.toUpperCase()}
            </span>
          )}
        </div>
        <BlockContent block={block} meta={meta} />
      </div>'''
replace_in_file('frontend/src/components/ThesisCard.tsx', old_desktop_block, new_desktop_block)

replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[14px] text-text-tertiary mb-6 font-light italic leading-relaxed">',
    '<p className="text-[13px] text-text-secondary mb-6 font-mono leading-relaxed bg-bg-primary p-4 border border-white/5 rounded-sm">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-base text-text-primary font-light leading-[2.2] mb-6 text-justify">',
    '<p className="text-[15px] text-text-primary font-light leading-[2] mb-8 text-justify">'
)

# ---------------------------------------------------------
# 2. DesksView: Widen the chart to fit 1-liner, remove dots
# ---------------------------------------------------------
replace_in_file('frontend/src/components/DesksView.tsx',
    'w-[420px] xl:w-[460px]',
    'w-[460px] xl:w-[500px]'
)
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[\d+px\] sm:text-\[\d+px\] text-text-secondary font-mono opacity-80 whitespace-normal">\{q\.assets\.join\(\', \'\)\}<\/p>',
    '<p className="text-[10px] sm:text-[11px] text-text-secondary font-mono opacity-90 whitespace-normal">{q.assets.join(\', \')}</p>'
)

# ---------------------------------------------------------
# 3. AllWeatherChart & EllipseView: Center texts
# ---------------------------------------------------------
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
    '''<div className="flex flex-col items-center justify-center text-center mb-4 px-4 pt-4 sm:px-6 shrink-0 border-b border-border/50 pb-4">
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
            <span className="w-2 h-2 rounded-full bg-brand-red"></span>
            <span className="text-[11px] text-text-tertiary text-center">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>'''
)

# ---------------------------------------------------------
# 4. Leaderboard & Dashboard: #2 Silver Color & Normal Sizing & Fix Sorting Re-render
# ---------------------------------------------------------
for p in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    replace_in_file(p, "t.rank === 2 ? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
    
    # Fix the sorting map issue (using 'sorted.map' instead of 'TRADERS.map' or 'AGENT_LEADERBOARD.map')
    # It was using sorted, but the 'key' was t.rank. React doesn't reorder if key is index/rank.
    replace_in_file(p, 'key={t.rank}', 'key={t.address || t.agent}')
    replace_in_file(p, 'key={row.rank}', 'key={row.address || row.agent}')
    
    # Tone down big font sizes for rank numbering
    replace_regex(p, r'font-display text-3xl font-bold tracking-tight', 'font-mono text-xl font-bold tracking-tight')
    replace_regex(p, r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary')
    replace_regex(p, r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-[0-9xl]* font-bold', 'font-mono text-sm font-semibold')
    
    # Emojis clean up
    replace_in_file(p, "badge: '🏆',", "")
    replace_in_file(p, "badge: '🥈',", "")
    replace_in_file(p, "badge: '🥉',", "")
    replace_regex(p, r'\{trader\.badge \?\? `#\$\{trader\.rank\}`\}', '#{trader.rank}')
    replace_regex(p, r'\{t\.badge \?\? `#\$\{t\.rank\}`\}', '#{t.rank}')
    replace_in_file(p, '<p className="text-2xl">{trader.badge}</p>', '')
    replace_regex(p, r'🔥\s*\{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex(p, r'🔥\s*\{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex(p, r'🔥\s*\{row\.streak\}', 'STREAK: {row.streak}')

# ---------------------------------------------------------
# 5. DashboardView: Historical Signal Redesign
# ---------------------------------------------------------
dash_path = 'frontend/src/components/DashboardView.tsx'
old_hist = '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left border-l-0 lg:border-l border-border/60">
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
        </div>'''
new_hist = '''        <div className="bg-bg-secondary p-6 sm:p-8 flex flex-col justify-center text-left border-l-0 lg:border-l border-border">
          <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-3">
            <div className="w-6 h-6 rounded border border-brand-red/30 bg-brand-red/10 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-brand-red rounded-full" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
              Signal Calibration
            </p>
          </div>
          <p className="font-display text-xl text-text-primary leading-snug mb-4">
            Extreme consensus implies <span className="text-brand-red">reversal risk</span>, not confirmation.
          </p>
          <p className="text-[11px] font-mono text-text-secondary leading-relaxed border-l-[2px] border-border-strong pl-4 mt-2">
            Backtest hooks active. Live calibration updates post-Arc settlement.
          </p>
        </div>'''
replace_in_file(dash_path, old_hist, new_hist)

# ---------------------------------------------------------
# 6. CircleInfraPanel: Professional API/Webhook copy single line
# ---------------------------------------------------------
ci_path = 'frontend/src/components/CircleInfraPanel.tsx'
replace_in_file(ci_path, 
    '''<p className="text-[9px] text-text-tertiary uppercase tracking-widest leading-relaxed whitespace-nowrap overflow-visible">
                  Subscribed Events: <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>
                </p>''',
    '''<div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto scrollbar-hide">
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest">Subscribed Events:</span>
                  <span className="text-[9px] text-blue-400/70 uppercase tracking-widest">Automated Deposits / Institutional Verification / On-chain Minting</span>
                </div>'''
)
replace_in_file(ci_path,
    '''<span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Secure Agent Intelligence API (x402-Protected)</span>''',
    '''<span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Encrypted Agent API (x402-Protected)</span>'''
)
replace_in_file(ci_path, 'Endpoint Protection:', 'Security Layer:')

# ---------------------------------------------------------
# 7. LiveFeedView: True full top-to-bottom hover & Stop Propagation
# ---------------------------------------------------------
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    
    # Outer div hover wrapper
    old_feed_item = '''className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}'''
    new_feed_item = '''className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}'''
    lf_content = lf_content.replace(old_feed_item, new_feed_item)
    
    old_inner = '''className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"
                  style={{ borderLeft: `3px solid ${meta.color}` }}'''
    new_inner = '''className="w-full flex flex-col relative h-full pl-[3px]"'''
    lf_content = lf_content.replace(old_inner, new_inner)

    # Insert absolute border
    if 'className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />' not in lf_content:
        lf_content = lf_content.replace(
            '<div \n                  className="w-full flex flex-col relative h-full pl-[3px]"\n                >', 
            '<div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />\n                <div className="w-full flex flex-col relative h-full pl-[3px]">'
        )
    
    # Event stop prop on View Chain
    lf_content = lf_content.replace(
        '''onClick={() => {
                      if (!e.ipfs_thesis_cid) return''',
        '''onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return'''
    )
    # Remove emojis
    lf_content = lf_content.replace('⚠️ High Divergence (≥40)', 'HIGH DIVERGENCE (≥40)')
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)

# 8. Pricing Page Intro Effect
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">''',
    '''<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">'''
)
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''        {/* x402 Callout */}''',
    '''      </motion.div>\n        {/* x402 Callout */}'''
)

# 9. Clean up all animations and shadows to make it brutally institutional
def clean_up():
    for root, _, files in os.walk('frontend/src'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.css') or file.endswith('.cjs'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f: content = f.read()
                orig = content
                content = content.replace(' animate-pulse', '')
                content = content.replace(' animate-rain', '')
                content = content.replace(' shadow-[0_0_15px_rgba(216,43,43,1)]', '')
                content = content.replace(' shadow-[0_0_10px_rgba(192,57,43,0.8)]', '')
                content = content.replace("shadow-[0_0_30px_rgba(201,168,76,0.25)]", "")
                if content != orig:
                    with open(path, 'w', encoding='utf-8') as f: f.write(content)
clean_up()

