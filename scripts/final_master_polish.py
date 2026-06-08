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

# 2. format.ts: US region color to #4A90E2
replace_in_file('frontend/src/lib/format.ts',
    "color: 'var(--color-region-us)'",
    "color: '#4A90E2'"
)

# 3. AllWeatherChart & EllipseView: Center the texts
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
            <span className="text-[10px] text-text-tertiary text-center">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 bg-white/5 border border-white/10 uppercase tracking-widest text-[9px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>'''
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

# 4. LeaderboardView.tsx & DashboardView.tsx -> Fix rank #2 color, smaller font for rank numbering, proper sorting of podium
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-base font-semibold text-text-tertiary')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-mono text-xl font-medium text-text-tertiary', 'font-mono text-base font-semibold text-text-tertiary')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-2xl', 'font-mono text-base')
replace_regex('frontend/src/components/LeaderboardView.tsx', r"t\.rank === 2 \? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
replace_regex('frontend/src/components/LeaderboardView.tsx', r"row\.rank === 2 \? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
replace_in_file('frontend/src/components/LeaderboardView.tsx', "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")
replace_in_file('frontend/src/components/LeaderboardView.tsx', "border-l-[#FFFFFF]", "border-l-[#C0C0C0]")

replace_regex('frontend/src/components/DashboardView.tsx', r"row\.rank === 2 \? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
replace_regex('frontend/src/components/DashboardView.tsx', r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_regex('frontend/src/components/DashboardView.tsx', r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')

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
hist_sig_new = '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left border-l-0 lg:border-l border-border/60">
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
replace_in_file('frontend/src/components/DashboardView.tsx', hist_sig_old, hist_sig_new)

# 5. CircleInfraPanel.tsx -> Professional webhook/API text
replace_in_file('frontend/src/components/CircleInfraPanel.tsx', 
    '''<span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''<span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>'''
)
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<span className="text-emerald-400/70 font-mono text-[10px] normal-case tracking-normal">/api/x402/agent-insight</span>''',
    '''<span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Secure Agent Intelligence API (x402-Protected)</span>'''
)

# 6. LiveFeedView.tsx -> True full top-to-bottom hover including border
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    # We will use regex to capture the whole item mapping block and replace it
    
    old_feed_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div 
                  className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''
    
    new_feed_item = '''              <div
                key={key}
                className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                <div 
                  className="w-full flex flex-col relative h-full pl-[3px]"
                >
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''
    
    lf_content = lf_content.replace(old_feed_item, new_feed_item)

    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)
    print("Updated LiveFeedView.tsx hover states")

# 7. REMOVE EMOJIS AND ANIMATIONS
def clean_up():
    replace_in_file('frontend/src/components/DeskCard.tsx', '⚔️ Debated', 'DEBATED')
    replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debated', 'DEBATED')
    replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debate Summary', 'DEBATE SUMMARY')
    
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🏆'", '')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🥈'", '')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🥉'", '')
    replace_regex('frontend/src/components/LeaderboardView.tsx', r'\{trader\.badge \?\? `#\$\{trader\.rank\}`\}', '#{trader.rank}')
    replace_regex('frontend/src/components/LeaderboardView.tsx', r'\{t\.badge \?\? `#\$\{t\.rank\}`\}', '#{t.rank}')
    replace_regex('frontend/src/components/LeaderboardView.tsx', r'🔥 \{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex('frontend/src/components/LeaderboardView.tsx', r'🔥 \{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex('frontend/src/components/LeaderboardView.tsx', r'🔥 \{row\.streak\}', 'STREAK: {row.streak}')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', '<p className="text-2xl">{trader.badge}</p>', '')
    
    replace_regex('frontend/src/components/DashboardView.tsx', r'🔥 \{row\.streak\}', 'STREAK: {row.streak}')
    replace_regex('frontend/src/components/DashboardView.tsx', r'🔥 \{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex('frontend/src/components/DashboardView.tsx', r'🔥 \{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex('frontend/src/components/DashboardView.tsx', r'🔥 \{t\.streak\} streak', 'STREAK: {t.streak}')
    
    replace_in_file('frontend/src/components/LiveFeedView.tsx', '⚠️ High Divergence (≥40)', 'HIGH DIVERGENCE (≥40)')
    replace_in_file('frontend/src/components/LiveFeedView.tsx', 'animate-rain', '')
    
    replace_regex('frontend/src/components/ShareButton.tsx', r'🤖 Rosetta Alpha just flagged this:', '[SYSTEM ALERT] Rosetta Alpha flagged:')
    replace_regex('frontend/src/components/ShareButton.tsx', r'📊 Verified on Arc Testnet', '[VERIFIED ON ARC L1]')
    replace_regex('frontend/src/components/ShareButton.tsx', r'🔗 https', 'URL: https')
    
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🌐'", "icon: '1'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🔗'", "icon: '2'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '💰'", "icon: '3'")

clean_up()

