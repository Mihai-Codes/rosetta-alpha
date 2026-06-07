import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. Leaderboard Typography Fixes
lb_path = 'frontend/src/components/LeaderboardView.tsx'
replace_in_file(lb_path, 'font-display text-3xl font-bold tracking-tight', 'font-mono text-xl font-bold tracking-tight')
replace_in_file(lb_path, 'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary')
replace_in_file(lb_path, 'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_in_file(lb_path, 'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
replace_in_file(lb_path, 'font-display text-2xl', 'font-mono text-xl')

# 2. Desks View Layout & Auth Gating
desks_path = 'frontend/src/components/DesksView.tsx'
with open(desks_path, 'r', encoding='utf-8') as f:
    d_content = f.read()

# Add useSession import
if 'useSession' not in d_content:
    d_content = d_content.replace(
        "import { authModalState } from './SignInModal'",
        "import { authModalState } from './SignInModal'\nimport { useSession } from 'next-auth/react'"
    )

# Add isAuthed check
if 'const isAuthed =' not in d_content:
    d_content = d_content.replace(
        "const active = desks.find(d => d.desk === activeDesk) ?? desks[0]",
        "const active = desks.find(d => d.desk === activeDesk) ?? desks[0]\n  const { data: session } = useSession()\n  const isAuthed = isAuthenticated || !!session?.user"
    )

# Strip out old mobile telemetry blocks
d_content = d_content.replace('''        {active && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-8 grid grid-cols-1 gap-4">
            <MobMeter ticker={active.ticker} />
            <DivergenceGauge ticker={active.ticker} desks={desks} />
          </motion.div>
        )}''', '')

# Strip out old desktop telemetry blocks
d_content = d_content.replace('''          {active && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </motion.div>
          )}''', '')

# Strip out old narrative engine
d_content = d_content.replace('''      {/* Narrative Engine — collapsible insights panel */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-full">
        <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
      </motion.div>''', '')

# Append unified gated telemetry section at the end of the return statement before the closing div
unified_gate = '''      {/* ── Advanced Telemetry (Gated) ── */}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <MobMeter ticker={active.ticker} />
              <DivergenceGauge ticker={active.ticker} desks={desks} />
            </div>
            <NarrativeInsights ticker={active?.desk ?? 'Portfolio'} />
          </div>
        </motion.div>
      )}'''

d_content = d_content.replace('    </div>\n  )\n}', f'{unified_gate}\n    </div>\n  )\n}}')
with open(desks_path, 'w', encoding='utf-8') as f:
    f.write(d_content)
print(f"Updated {desks_path}")

