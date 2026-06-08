import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")
    else:
        pass

def replace_regex(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# 1. ThesisCard Layout Box Breathing Room
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
        className="hidden md:block pl-10 pr-6 pb-6"
        style={{ borderLeft: `2px solid ${meta.color}50` }}
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
# Emojis in ThesisCard
replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debated', 'DEBATED')
replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debate Summary', 'DEBATE SUMMARY')
replace_in_file('frontend/src/components/DeskCard.tsx', '⚔️ Debated', 'DEBATED')

# 2. DesksView: Remove the un-authed telemetry lock screen entirely and widen chart container
desks_path = 'frontend/src/components/DesksView.tsx'
if os.path.exists(desks_path):
    with open(desks_path, 'r', encoding='utf-8') as f: d_c = f.read()
    
    # Expand box
    d_c = d_c.replace('w-[300px] xl:w-[320px]', 'w-[420px] xl:w-[460px]')
    d_c = d_c.replace('w-[340px] xl:w-[380px]', 'w-[420px] xl:w-[460px]')
    
    # Erase the entire block rendering if not authenticated
    lock_screen = '''          {!isAuthed && (
            <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/70 flex flex-col items-center justify-center border border-border">
              <Lock className="w-6 h-6 text-brand-red mb-3" />
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-red mb-4">Encrypted Telemetry</p>
              <button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors shadow-[0_0_15px_rgba(216,43,43,0.3)]">Sign in to Decrypt</button>
            </div>
          )}'''
    d_c = d_c.replace(lock_screen, '')
    d_c = d_c.replace('${!isAuthed ? \'opacity-20 pointer-events-none select-none blur-sm\' : \'\'}', '')
    
    # Hide entire block if not authed
    d_c = d_c.replace('{active && (', '{active && isAuthed && (')
    d_c = d_c.replace('{active && isAuthed && isAuthed && (', '{active && isAuthed && (')
    with open(desks_path, 'w', encoding='utf-8') as f: f.write(d_c)

# 3. AllWeatherChart & EllipseView: Centered text & truncation removal
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">',
    '<div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">'
)
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[9px\] sm:text-\[10px\] text-text-secondary font-mono opacity-80 truncate">\{q\.assets\.join\(.*?\)\}<\/p>',
    '<p className="text-[10px] sm:text-[11px] text-text-secondary font-mono opacity-90 whitespace-normal">{q.assets.join(\', \')}</p>'
)
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[10px\] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">',
    '<p className="text-[11px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">'
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
    '''<div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
            <span className="text-[10px] text-text-tertiary text-center">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2">
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

# 4. LeaderboardView: Fix sorting podium and Silver Rank #2
for p in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    replace_in_file(p, "t.rank === 2 ? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
    replace_in_file(p, "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")
    # Reduce giant fonts
    replace_regex(p, r'font-display text-3xl font-bold tracking-tight', 'font-mono text-xl font-bold tracking-tight')
    replace_regex(p, r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary')
    replace_regex(p, r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
    
    # Emojis
    replace_in_file(p, "badge: '🏆',", "")
    replace_in_file(p, "badge: '🥈',", "")
    replace_in_file(p, "badge: '🥉',", "")
    replace_regex(p, r'\{trader\.badge \?\? `#\$\{trader\.rank\}`\}', '#{trader.rank}')
    replace_regex(p, r'\{t\.badge \?\? `#\$\{t\.rank\}`\}', '#{t.rank}')
    replace_in_file(p, '<p className="text-2xl">{trader.badge}</p>', '')
    replace_regex(p, r'🔥\s*\{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex(p, r'🔥\s*\{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex(p, r'🔥\s*\{row\.streak\}', 'STREAK: {row.streak}')

# 5. DashboardView: Professional Historical Signal layout
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

# 6. PricingPage: Stripe & entrance animation
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">''',
    '''<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">'''
)
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''        {/* x402 Callout */}''',
    '''      </motion.div>
        {/* x402 Callout */}'''
)

# 7. LiveFeedView: Full hover and fix "View Chain" propagation
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_c = f.read()
    
    # Outer div hover wrapper
    old_div = 'className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? \'bg-white/[0.01]\' : \'\'}`}'
    new_div = 'className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? \'bg-white/[0.01]\' : \'\'}`}'
    lf_c = lf_c.replace(old_div, new_div)
    
    old_div2 = 'className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? \'bg-white/[0.01]\' : \'\'}`}'
    new_div2 = 'className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? \'bg-white/[0.01]\' : \'\'}`}'
    lf_c = lf_c.replace(old_div2, new_div2)

    old_inner = 'className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"'
    new_inner = 'className="w-full flex flex-col relative h-full pl-[3px]"'
    lf_c = lf_c.replace(old_inner, new_inner)

    old_style = 'style={{ borderLeft: `3px solid ${meta.color}` }}'
    new_style = ''
    lf_c = lf_c.replace(old_style, new_style)

    # Insert absolute border
    lf_c = lf_c.replace(
        '<div \n                  className="w-full flex flex-col relative h-full pl-[3px]"\n                  \n                >', 
        '<div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />\n                <div className="w-full flex flex-col relative h-full pl-[3px]">'
    )
    
    # Event stop prop
    lf_c = lf_c.replace(
        '''onClick={() => {
                      if (!e.ipfs_thesis_cid) return''',
        '''onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return'''
    )
    lf_c = lf_c.replace('⚠️ High Divergence (≥40)', 'HIGH DIVERGENCE (≥40)')
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_c)

# 8. Circle Infra text
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<p className="text-[9px] text-text-tertiary uppercase tracking-widest leading-relaxed whitespace-nowrap overflow-visible">
                  Subscribed Events: <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>
                </p>''',
    '''<p className="text-[9px] text-text-tertiary uppercase tracking-widest leading-relaxed whitespace-nowrap overflow-visible">
                  Subscribed Events: <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>
                </p>'''
)

