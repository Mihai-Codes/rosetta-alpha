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

def replace_regex_in_file(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# 1. Remove Encrypted Telemetry completely for unsigned users in DesksView
desks_path = 'frontend/src/components/DesksView.tsx'
with open(desks_path, 'r', encoding='utf-8') as f:
    d_content = f.read()

# Replace the Gated Telemetry block to ONLY show if isAuthed
old_telemetry_block1 = '''      {/* ── Advanced Telemetry (Gated) ── */}
      {active && (
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full relative mt-4">
          {!isAuthed && (
            <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/70 flex flex-col items-center justify-center border border-border">
              <Lock className="w-6 h-6 text-brand-red mb-3" />
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-red mb-4">Encrypted Telemetry</p>
              <button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors shadow-[0_0_15px_rgba(216,43,43,0.3)]">Sign in to Decrypt</button>
            </div>
          )}
          <div className={`flex flex-col gap-6 lg:gap-8 ${!isAuthed ? 'opacity-20 pointer-events-none select-none blur-sm' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </div>
            <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
          </div>
        </motion.div>
      )}'''

new_telemetry_block1 = '''      {/* ── Advanced Telemetry (Hidden for unsigned) ── */}
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
      )}'''

d_content = d_content.replace(old_telemetry_block1, new_telemetry_block1)

# Ensure mobile block is also updated or removed (we already centralized it)
old_mobile_telemetry = '''        {active && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-8 relative">
            {!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center border border-white/10"><button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors">Sign in for Telemetry</button></div>}
            <div className={`grid grid-cols-1 gap-4 ${!isAuthed ? 'opacity-20 pointer-events-none' : ''}`}>
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </div>
          </motion.div>
        )}'''
d_content = d_content.replace(old_mobile_telemetry, '')

old_desktop_telemetry = '''          {active && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full relative">
              {!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center border border-white/10"><button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors">Sign in for Advanced Telemetry</button></div>}
              <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 ${!isAuthed ? 'opacity-20 pointer-events-none' : ''}`}>
                <MobMeter ticker={active.ticker} />
                <DivergenceGauge ticker={active.ticker} desks={desks} />
              </div>
            </motion.div>
          )}'''
d_content = d_content.replace(old_desktop_telemetry, '')

old_narrative = '''      {/* Narrative Engine — collapsible insights panel */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-full relative">
        {!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center border border-white/10"><button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors">Sign in for Narrative Engine</button></div>}
        <div className={!isAuthed ? 'opacity-20 pointer-events-none' : ''}>
          <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
        </div>
      </motion.div>'''
d_content = d_content.replace(old_narrative, '')

# Widen chart area
d_content = d_content.replace('w-[300px] xl:w-[320px]', 'w-[400px] xl:w-[440px]')

with open(desks_path, 'w', encoding='utf-8') as f:
    f.write(d_content)

# 2. Fix AllWeatherChart description line
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<p className="text-[9px] text-text-tertiary leading-relaxed mx-auto text-center">',
    '<p className="text-[10px] text-text-tertiary whitespace-nowrap w-full text-center">'
)

# 3. Fix DashboardView Historical Signal text
replace_in_file('frontend/src/components/DashboardView.tsx',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <p className="font-display text-2xl text-text-primary leading-tight">
            Extreme agreement is treated as a reversal-risk warning, not confirmation.
          </p>
          <p className="text-[11px] text-text-tertiary leading-relaxed mt-4">
            Backtest hooks are ready for rosetta_dataset.jsonl; live calibration updates after Arc settlements.
          </p>
        </div>''',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <div className="p-5 border border-warning/20 bg-warning/5 rounded-none mb-5">
             <p className="font-mono text-xs sm:text-sm font-bold text-warning leading-relaxed uppercase tracking-wider text-justify">
               Extreme agreement is treated as a reversal-risk warning, not confirmation.
             </p>
          </div>
          <p className="text-[10px] sm:text-[11px] text-text-secondary leading-relaxed border-l-[3px] border-border-strong pl-4 text-justify">
            Backtest hooks are ready for rosetta_dataset.jsonl. Live calibration updates after Arc settlements.
          </p>
        </div>'''
)

# 4. Fix DashboardView Agent Leaderboard rank numbers
replace_in_file('frontend/src/components/DashboardView.tsx',
    'font-display text-lg font-bold',
    'font-mono text-sm font-semibold'
)
replace_in_file('frontend/src/components/DashboardView.tsx',
    'font-display text-xl font-bold',
    'font-mono text-sm font-semibold'
)

# 5. LiveFeedView Hover Fix
lf_path = 'frontend/src/components/LiveFeedView.tsx'
with open(lf_path, 'r', encoding='utf-8') as f:
    lf_content = f.read()

# Make the entire block a hoverable group so 'View Chain' inherits the hover background
old_feed_item = '''              <div
                key={key}
                className={`border-b border-white/[0.02] last:border-b-0 transition-all duration-300 ${i === 0 ? 'animate-[pulse_2s_ease-in-out_infinite] bg-white/[0.02]' : ''}`}
              >
                <button
                  onClick={() => toggleExpand(key, e.desk, e.ticker)}
                  className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 text-left min-h-[44px] hover:bg-white/[0.03] transition-colors"
                  style={{ borderLeft: `2px solid ${meta.color}` }}
                >'''

new_feed_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-all duration-300 group ${i === 0 ? 'animate-[pulse_2s_ease-in-out_infinite] bg-white/[0.02]' : ''}`}
              >
                <div 
                  className="w-full flex flex-col hover:bg-white/[0.03] transition-colors relative"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <button
                    onClick={() => toggleExpand(key, e.desk, e.ticker)}
                    className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]"
                  >'''

lf_content = lf_content.replace(old_feed_item, new_feed_item)

old_feed_footer = '''                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary shrink-0 mt-0.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className="px-4 sm:px-5 pb-3 sm:pb-4 flex justify-end">'''

new_feed_footer = '''                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary shrink-0 mt-0.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className="px-4 sm:px-5 pb-4 flex justify-end">'''

lf_content = lf_content.replace(old_feed_footer, new_feed_footer)

old_expand = '''                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-4 sm:pl-[10rem] space-y-3">
                    {e.reasoning_blocks.map((b, j) => (
                      <div
                        key={j}
                        className="border-l border-border pl-4 py-1"
                        style={{ borderColor: meta.color + '40' }}
                      >
                        <p
                          className="text-[10px] font-medium uppercase tracking-[0.2em] mb-1"
                          style={{ color: meta.color }}
                        >
                          {b.agent_role.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-text-secondary font-light leading-relaxed">
                          {b.analysis_en || b.analysis}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )'''

new_expand = '''                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-4 sm:pl-[10rem] space-y-3">
                    {e.reasoning_blocks.map((b, j) => (
                      <div
                        key={j}
                        className="border-l pl-4 py-1"
                        style={{ borderColor: meta.color + '40' }}
                      >
                        <p
                          className="text-[10px] font-medium uppercase tracking-[0.2em] mb-1"
                          style={{ color: meta.color }}
                        >
                          {b.agent_role.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-text-secondary font-light leading-relaxed">
                          {b.analysis_en || b.analysis}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            )'''

lf_content = lf_content.replace(old_expand, new_expand)

with open(lf_path, 'w', encoding='utf-8') as f:
    f.write(lf_content)
print("Updated LiveFeedView.tsx hover states")

# 6. Check for any remaining emojis
def remove_emojis():
    # DeskCard & ThesisCard
    replace_in_file('frontend/src/components/DeskCard.tsx', '⚔️ Debated', 'DEBATED')
    replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debated', 'DEBATED')
    replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debate Summary', 'DEBATE SUMMARY')
    
    # LeaderboardView
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🏆'", '')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🥈'", '')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🥉'", '')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'\{trader\.badge \?\? `#\$\{trader\.rank\}`\}', '#{trader.rank}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'\{t\.badge \?\? `#\$\{t\.rank\}`\}', '#{t.rank}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'🔥 \{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'🔥 \{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'🔥 \{row\.streak\}', 'STREAK: {row.streak}')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', '<p className="text-2xl">{trader.badge}</p>', '')
    
    # DashboardView
    replace_regex_in_file('frontend/src/components/DashboardView.tsx', r'🔥 \{row\.streak\}', 'STREAK: {row.streak}')
    replace_regex_in_file('frontend/src/components/DashboardView.tsx', r'🔥 \{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex_in_file('frontend/src/components/DashboardView.tsx', r'🔥 \{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex_in_file('frontend/src/components/DashboardView.tsx', r'🔥 \{t\.streak\} streak', 'STREAK: {t.streak}')
    
    # LiveFeedView
    replace_in_file('frontend/src/components/LiveFeedView.tsx', '⚠️ High Divergence (≥40)', 'HIGH DIVERGENCE (≥40)')
    
    # ShareButton
    replace_regex_in_file('frontend/src/components/ShareButton.tsx', r'🤖 Rosetta Alpha just flagged this:', '[SYSTEM ALERT] Rosetta Alpha flagged:')
    replace_regex_in_file('frontend/src/components/ShareButton.tsx', r'📊 Verified on Arc Testnet', '[VERIFIED ON ARC L1]')
    replace_regex_in_file('frontend/src/components/ShareButton.tsx', r'🔗 https', 'URL: https')
    
    # OnboardingModal
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🌐'", "icon: '1'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🔗'", "icon: '2'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '💰'", "icon: '3'")

remove_emojis()

