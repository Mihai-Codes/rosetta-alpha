import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. EarnQuiz text one-liner
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    '<p className="text-text-secondary text-xs leading-relaxed truncate w-full max-w-[400px] mx-auto">\\n            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.\\n          </p>',
    '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap w-full text-center">\\n            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.\\n          </p>'
)

# 2. Leaderboard ranks formatting
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'className={`font-display text-lg font-bold ${',
    'className={`font-mono text-sm font-semibold ${'
)
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'className={`font-display text-xl font-bold ${',
    'className={`font-mono text-sm font-semibold ${'
)

# 3. MobMeter & DivergenceGauge styling enhancements
# Make MobMeter horizontal and compact instead of weirdly elongated
replace_in_file('frontend/src/components/MobMeter.tsx',
    '''          <div className="relative h-44 w-12 shrink-0 border border-white/10 bg-bg-primary rounded-full overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#00FF00] via-[#FFD700] to-[#D82B2B] transition-all duration-1000 ease-out" style={{ height: fillHeight }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            {[0, 25, 50, 75, 100].map(mark => (
              <div
                key={mark}
                className="absolute left-0 w-full border-t border-black/50"
                style={{ bottom: `${mark}%` }}
              />
            ))}
          </div>''',
    '''          <div className="w-full mt-4">
            <div className="relative h-4 w-full shrink-0 border border-white/10 bg-bg-primary rounded-full overflow-hidden mb-4">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-positive via-warning to-negative transition-all duration-1000 ease-out" style={{ width: fillHeight }} />
            </div>
          </div>'''
)

# Fix MobMeter flex layout to accommodate the horizontal bar
replace_in_file('frontend/src/components/MobMeter.tsx',
    '<div className={`relative z-10 flex ${compact ? \\\'gap-4\\\' : \\\'gap-6\\\'} items-center`}>',
    '<div className={`relative z-10 flex flex-col items-start`}>'
)

# 4. DesksView Advanced Telemetry Gating
# We will wrap the advanced telemetry in a gate that requires authentication
replace_in_file('frontend/src/components/DesksView.tsx',
    'import { authModalState } from \'./SignInModal\'',
    'import { authModalState } from \'./SignInModal\'\nimport { useSession } from \'next-auth/react\''
)
replace_in_file('frontend/src/components/DesksView.tsx',
    'const active = desks.find(d => d.desk === activeDesk) ?? desks[0]',
    'const active = desks.find(d => d.desk === activeDesk) ?? desks[0]\n  const { data: session } = useSession()\n  const isAuthed = isAuthenticated || !!session?.user'
)
replace_in_file('frontend/src/components/DesksView.tsx',
    '''        {active && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-8 grid grid-cols-1 gap-4">
            <MobMeter ticker={active.ticker} />
            <DivergenceGauge ticker={active.ticker} desks={desks} />
          </motion.div>
        )}''',
    '''        {active && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-8 relative">
            {!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center border border-white/10"><button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors">Sign in for Telemetry</button></div>}
            <div className={`grid grid-cols-1 gap-4 ${!isAuthed ? 'opacity-20 pointer-events-none' : ''}`}>
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </div>
          </motion.div>
        )}'''
)
replace_in_file('frontend/src/components/DesksView.tsx',
    '''          {active && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </motion.div>
          )}''',
    '''          {active && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full relative">
              {!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center border border-white/10"><button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors">Sign in for Advanced Telemetry</button></div>}
              <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 ${!isAuthed ? 'opacity-20 pointer-events-none' : ''}`}>
                <MobMeter ticker={active.ticker} />
                <DivergenceGauge ticker={active.ticker} desks={desks} />
              </div>
            </motion.div>
          )}'''
)
replace_in_file('frontend/src/components/DesksView.tsx',
    '''      {/* Narrative Engine — collapsible insights panel */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-full">
        <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
      </motion.div>''',
    '''      {/* Narrative Engine — collapsible insights panel */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-full relative">
        {!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md bg-bg-primary/60 flex items-center justify-center border border-white/10"><button onClick={() => authModalState.open()} className="px-6 py-3 bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/80 transition-colors">Sign in for Narrative Engine</button></div>}
        <div className={!isAuthed ? 'opacity-20 pointer-events-none' : ''}>
          <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
        </div>
      </motion.div>'''
)

