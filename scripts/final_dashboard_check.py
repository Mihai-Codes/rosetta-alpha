import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# Ensure the Historical Signal in Dashboard is perfectly sleek
replace_in_file('frontend/src/components/DashboardView.tsx',
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
          <p className="text-xs text-text-secondary font-mono leading-relaxed border-l-[2px] border-border-strong pl-4">
            Backtest hooks ready for rosetta_dataset.jsonl. Live calibration updates post-Arc settlement.
          </p>
        </div>''',
    '''        <div className="solid-panel bg-bg-secondary p-6 sm:p-8 flex flex-col justify-center text-left border-l-0 lg:border-l border-border/60">
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
)

# Ensure Dashboard's Agent Leaderboard uses the small rank styling
replace_in_file('frontend/src/components/DashboardView.tsx', 'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_in_file('frontend/src/components/DashboardView.tsx', 'font-display text-xl font-bold', 'font-mono text-sm font-semibold')

# Ensure Mobile cards in LeaderboardView also use small rank styling
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'font-display text-xl font-bold',
    'font-mono text-sm font-semibold'
)

