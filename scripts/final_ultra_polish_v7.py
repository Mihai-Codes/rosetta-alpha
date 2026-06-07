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

# 1. DesksView: Remove Encrypted Telemetry for unsigned users
desks_path = 'frontend/src/components/DesksView.tsx'
if os.path.exists(desks_path):
    with open(desks_path, 'r', encoding='utf-8') as f:
        d_content = f.read()
    # Replace telemetry
    d_content = re.sub(r'\{\/\* ── Advanced Telemetry \(Gated\) ── \*\/\}.*?\{\/\* ── Advanced Telemetry \(Gated\) ── \*\/\}.*?\n\s*\{\/\* ── Advanced Telemetry \(Gated\) ── \*\/\}\n\s*\{active && \(\n\s*<motion\.div.*?\n\s*\{!isAuthed.*?\n.*?\n.*?\n.*?\n\s*\)\}\n\s*<div.*?\n\s*<div.*?\n.*?\n.*?\n\s*<\/div>\n\s*<NarrativeInsights.*?\n\s*<\/div>\n\s*<\/motion\.div>\n\s*\)\}', '', d_content, flags=re.DOTALL)
    
    # We will just replace the exact block if it exists
    d_content = re.sub(r'\{\/\* ── Advanced Telemetry \(Gated\) ── \*\/\}\n\s*\{active && \([\s\S]*?<\/motion\.div>\n\s*\)\}', '''{/* ── Advanced Telemetry (Hidden for unsigned) ── */}
      {active && isAuthed && (
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full relative mt-4">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </div>
            <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
          </div>
        </motion.div>
      )}''', d_content)
      
    # Widen chart area
    d_content = d_content.replace('w-[300px] xl:w-[320px]', 'w-[420px] xl:w-[460px]')
    d_content = d_content.replace('w-[340px] xl:w-[380px]', 'w-[420px] xl:w-[460px]')
    with open(desks_path, 'w', encoding='utf-8') as f:
        f.write(d_content)

# 2. Update US color to #4A90E2
replace_in_file('frontend/src/index.css', '--color-region-us: #FFFFFF;', '--color-region-us: #4A90E2;')
replace_in_file('frontend/tailwind.config.cjs', "us: '#FFFFFF',", "us: '#4A90E2',")
replace_in_file('frontend/src/components/DashboardView.tsx', "color: '#FFFFFF'", "color: '#4A90E2'")

# 3. AllWeatherChart: Fix truncating issue and text width
replace_in_file('frontend/src/components/AllWeatherChart.tsx', 
    '''<p className="text-[8px] sm:text-[9px] text-text-secondary font-mono opacity-80 truncate">{q.assets.join(', ')}</p>''',
    '''<p className="text-[8px] sm:text-[9px] text-text-secondary font-mono opacity-80 whitespace-nowrap overflow-visible">{q.assets.join(', ')}</p>'''
)
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '''<p className="text-[10px] text-text-tertiary whitespace-nowrap w-full text-center">''',
    '''<p className="text-[10px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">'''
)

# 4. DashboardView: Historical Signal text
replace_in_file('frontend/src/components/DashboardView.tsx',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <div className="p-5 border border-warning/20 bg-warning/5 rounded mb-5">
             <p className="font-mono text-sm font-bold text-warning leading-tight uppercase tracking-wider">
               Extreme agreement is treated as a reversal-risk warning, not confirmation.
             </p>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed border-l-[3px] border-border pl-4">
            Backtest hooks are ready for rosetta_dataset.jsonl. Live calibration updates after Arc settlements.
          </p>
        </div>''',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left border-l border-border/60">
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
)

# Agent Leaderboard sizing
replace_in_file('frontend/src/components/DashboardView.tsx', 'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_in_file('frontend/src/components/DashboardView.tsx', 'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
replace_in_file('frontend/src/components/LeaderboardView.tsx', 'font-display text-3xl font-bold tracking-tight', 'font-mono text-xl font-bold tracking-tight')
replace_in_file('frontend/src/components/LeaderboardView.tsx', 'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary')
replace_in_file('frontend/src/components/LeaderboardView.tsx', 'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_in_file('frontend/src/components/LeaderboardView.tsx', 'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
replace_in_file('frontend/src/components/LeaderboardView.tsx', 'font-display text-2xl', 'font-mono text-xl')

# 5. LiveFeedView: Fix hover structure
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    
    old_feed_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div 
                  className="w-full flex flex-col relative h-full"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''
    
    new_feed_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div 
                  className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''
    
    lf_content = lf_content.replace(old_feed_item, new_feed_item)

    old_view_chain = '''onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return'''
    new_view_chain = '''onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return'''
    
    lf_content = lf_content.replace(
        'className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:text-white hover:border-brand-red transition-colors text-[10px] uppercase tracking-[0.2em]"',
        'className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"'
    )
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)

# 6. PricingPage: Add Stripe Crypto button
pricing_path = 'frontend/src/app/pricing/page.tsx'
if os.path.exists(pricing_path):
    with open(pricing_path, 'r', encoding='utf-8') as f: p_content = f.read()

    stripe_btn = '''      </button>
      {price > 0 && (
        <button
          onClick={() => {}}
          className="mt-3 w-full rounded-md py-3 text-sm font-semibold transition-colors border border-border text-text-primary hover:bg-bg-tertiary"
        >
          Pay with Card (Stripe Crypto)
        </button>
      )}
    </div>'''
    p_content = p_content.replace('      </button>\n    </div>', stripe_btn)
    p_content = p_content.replace(
        '<p className="mt-4 w-full text-center truncate text-text-secondary text-sm">',
        '<p className="mt-4 w-full text-center whitespace-nowrap overflow-visible text-text-secondary text-sm">'
    )
    with open(pricing_path, 'w', encoding='utf-8') as f: f.write(p_content)

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
    
    replace_in_file('frontend/src/components/LiveFeedView.tsx', '⚠️ High Divergence (≥40)', 'HIGH DIVERGENCE (≥40)')
    replace_in_file('frontend/src/components/LiveFeedView.tsx', 'animate-rain', '')
    
    replace_regex('frontend/src/components/ShareButton.tsx', r'🤖 Rosetta Alpha just flagged this:', '[SYSTEM ALERT] Rosetta Alpha flagged:')
    replace_regex('frontend/src/components/ShareButton.tsx', r'📊 Verified on Arc Testnet', '[VERIFIED ON ARC L1]')
    replace_regex('frontend/src/components/ShareButton.tsx', r'🔗 https', 'URL: https')
    
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🌐'", "icon: '1'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🔗'", "icon: '2'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '💰'", "icon: '3'")

    replace_in_file('frontend/src/components/EarnQuiz.tsx', 
        '<p className="text-text-secondary text-xs leading-relaxed truncate w-full max-w-[400px] mx-auto">',
        '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-visible w-full text-center">'
    )

clean_up()

