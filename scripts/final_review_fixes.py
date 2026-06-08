import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")
    else:
        print(f"String not found in {path}: {old[:50]}...")

# 1. ThesisCard: Make the reasoning chain box more breathable
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
        className="hidden md:block pl-10 pr-6 pb-2"
        style={{ borderLeft: `1px solid ${meta.color}30` }}
      >'''
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-sm text-text-primary font-light leading-relaxed mb-2 text-justify">',
    '<p className="text-[15px] text-text-primary font-light leading-loose mb-4 text-justify">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[11px] text-text-tertiary mb-3 font-light italic">',
    '<p className="text-[13px] text-text-tertiary mb-5 font-light italic">'
)

# 2. AllWeatherChart & EllipseView: Center the title texts and trailing descriptions
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">',
    '<div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">'
)

replace_in_file('frontend/src/components/EllipseView.tsx',
    '<div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">',
    '<div className="flex flex-col items-center justify-center text-center mb-4 px-4 pt-4 sm:px-6 shrink-0">'
)
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
            <span className="text-[10px] text-text-tertiary">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 uppercase tracking-widest text-[8px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>''',
    '''        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
            <span className="text-[10px] text-text-tertiary text-center">Pos: <strong className="text-text-primary font-medium">{viz.orbitalPosition}</strong></span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 uppercase tracking-widest text-[8px] text-text-secondary">Regime: Volatile Transition</span>
          </div>
        </div>'''
)

# 3. Leaderboards: Fix Rank #2 color and alter dummy data to showcase proper sorting
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    "t.rank === 2 ? 'text-text-secondary' :",
    "t.rank === 2 ? 'text-[#C0C0C0]' :"
)
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    "row.rank === 2 ? 'text-text-secondary' :",
    "row.rank === 2 ? 'text-[#C0C0C0]' :"
)
# Modify mock data so sorting visibly changes the order!
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    "{ rank: 2,  address: '0x3E7d...2B1a', label: 'satoshi99',    correct: 41, total: 50, earned: 20.5, arcTxCount: 41, streak: 5,   }",
    "{ rank: 2,  address: '0x3E7d...2B1a', label: 'satoshi99',    correct: 45, total: 50, earned: 20.5, arcTxCount: 41, streak: 5,   }"
)
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    "{ rank: 4,  address: '0x8B2f...1C7d',                         correct: 34, total: 44, earned: 17.0, arcTxCount: 34, streak: 3  }",
    "{ rank: 4,  address: '0x8B2f...1C7d',                         correct: 44, total: 44, earned: 17.0, arcTxCount: 34, streak: 12  }"
)

# DashboardView Leaderboard fixes
replace_in_file('frontend/src/components/DashboardView.tsx',
    "row.rank === 2 ? 'text-text-secondary' :",
    "row.rank === 2 ? 'text-[#C0C0C0]' :"
)
replace_in_file('frontend/src/components/DashboardView.tsx',
    "{ rank: 3, agent: 'Dragon-9',     region: 'China',           accuracy: 84, theses: 156, streak: 5 },",
    "{ rank: 3, agent: 'Dragon-9',     region: 'China',           accuracy: 84, theses: 256, streak: 5 },"
)
replace_in_file('frontend/src/components/DashboardView.tsx',
    "{ rank: 4, agent: 'Samurai-X',    region: 'Japan',           accuracy: 81, theses: 134, streak: 4 },",
    "{ rank: 4, agent: 'Samurai-X',    region: 'Japan',           accuracy: 81, theses: 134, streak: 15 },"
)

# 4. CircleInfraPanel: Make text non-technical and professional
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''                  <span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''                  <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>'''
)
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''                  <span className="text-emerald-400/70 font-mono text-[10px] normal-case tracking-normal">/api/x402/agent-insight</span>''',
    '''                  <span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Secure Agent Intelligence API (x402-Protected)</span>'''
)

# 5. format.ts: Explicitly define the US region color as #4A90E2 to fix inline styling fallbacks
replace_in_file('frontend/src/lib/format.ts',
    "color: 'var(--color-region-us)'", "color: '#4A90E2'"
)
replace_in_file('frontend/src/lib/format.ts',
    "color: 'var(--color-region-cn)'", "color: '#D82B2B'"
)
replace_in_file('frontend/src/lib/format.ts',
    "color: 'var(--color-region-eu)'", "color: '#888888'"
)
replace_in_file('frontend/src/lib/format.ts',
    "color: 'var(--color-region-jp)'", "color: '#FFD700'"
)
replace_in_file('frontend/src/lib/format.ts',
    "color: 'var(--color-region-crypto)'", "color: '#00FF00'"
)

