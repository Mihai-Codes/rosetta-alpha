import os
import re

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Rewrote {path}")

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

# 1. format.ts -> Fix US color
replace_in_file('frontend/src/lib/format.ts', "color: 'var(--color-region-us)'", "color: '#4A90E2'")

# 2. AllWeatherChart.tsx -> Centered text, single line, no truncation
all_weather = ''''use client'

import React from 'react'

const QUADRANTS = [
  { title: 'Rising Growth', subtitle: 'Falling Inflation', assets: ['Equities', 'Corporate Credit'], pct: 30, color: 'var(--color-text-primary)' },
  { title: 'Rising Growth', subtitle: 'Rising Inflation', assets: ['Commodities', 'EM Credit'], pct: 15, color: 'var(--color-brand-red)' },
  { title: 'Falling Growth', subtitle: 'Falling Inflation', assets: ['Long Bonds', 'Nominal Bonds'], pct: 40, color: 'var(--color-warning)' },
  { title: 'Falling Growth', subtitle: 'Rising Inflation', assets: ['Crypto / Gold', 'ILBs'], pct: 15, color: 'var(--color-text-secondary)' },
]

export function AllWeatherChart() {
  return (
    <div className="solid-panel border border-border bg-bg-secondary p-5 sm:p-6 shadow-none h-full flex flex-col justify-between">
      <div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-1">
          Bridgewater Framework
        </p>
        <p className="font-display text-lg text-text-primary">Matrix View (Risk Parity)</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-0 w-full max-w-[400px] mx-auto py-2">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 relative w-full">
          {QUADRANTS.map((q, i) => (
            <div 
              key={i} 
              className="border border-white/5 bg-bg-primary p-4 sm:p-5 transition-colors hover:bg-white/[0.04] flex flex-col justify-between min-h-[130px] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: q.color }} />
              <div className="flex justify-between items-start mb-2">
                <span className="text-[12px] sm:text-[14px] font-mono text-text-primary font-bold">{q.pct}%</span>
              </div>
              
              <div className="space-y-1 mb-3">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-text-primary leading-tight">{q.title}</p>
                <p className="text-[8px] sm:text-[9px] uppercase tracking-wider text-text-tertiary leading-tight">{q.subtitle}</p>
              </div>

              <div className="border-t border-white/5 pt-2 mt-auto">
                <p className="text-[9px] sm:text-[10px] text-text-secondary font-mono opacity-80 whitespace-nowrap overflow-visible">{q.assets.join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pt-4 border-t border-border/50 shrink-0 mt-4 overflow-visible">
        <p className="text-[10px] text-text-tertiary whitespace-nowrap overflow-visible w-full text-center">
          Risk parity balances exposure across four distinct economic environments.
        </p>
      </div>
    </div>
  )
}
'''
write_file('frontend/src/components/AllWeatherChart.tsx', all_weather)

# 3. EllipseView.tsx -> Centered text
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

# 4. LeaderboardView.tsx -> Fix rank #2 color, smaller font for rank numbering, proper sorting of podium
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-base font-semibold text-text-tertiary')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-mono text-xl font-medium text-text-tertiary', 'font-mono text-base font-semibold text-text-tertiary')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
replace_regex('frontend/src/components/LeaderboardView.tsx', r'font-display text-2xl', 'font-mono text-base')
replace_regex('frontend/src/components/LeaderboardView.tsx', r"t\.rank === 2 \? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#C0C0C0]' :")
replace_regex('frontend/src/components/LeaderboardView.tsx', r"row\.rank === 2 \? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#C0C0C0]' :")
replace_in_file('frontend/src/components/LeaderboardView.tsx', "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")
replace_in_file('frontend/src/components/LeaderboardView.tsx', "border-l-[#FFFFFF]", "border-l-[#C0C0C0]")

# 5. DashboardView.tsx -> Historical Signal redesign, Leaderboard typography
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

# 6. CircleInfraPanel.tsx -> Professional webhook/API text
replace_in_file('frontend/src/components/CircleInfraPanel.tsx', 
    '''<span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''<span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>'''
)
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<span className="text-emerald-400/70 font-mono text-[10px] normal-case tracking-normal">/api/x402/agent-insight</span>''',
    '''<span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Secure Agent Intelligence API (x402-Protected)</span>'''
)

# 7. LiveFeedView.tsx -> True full top-to-bottom hover including border
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    # We will use regex to capture the whole item mapping block and replace it
    pattern = r'entries\.map\(\(e, i\) => \{[\s\S]*?className={`border-b border-border last:border-b-0[\s\S]*?<div\s*className="w-full flex flex-col relative h-full[\s\S]*?style=\{\{ borderLeft: `3px solid \$\{meta\.color\}` \}\}[\s\S]*?className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-\[44px\]">'
    
    new_start = '''entries.map((e, i) => {
            const meta = regionMeta(e.desk)
            const key = `${e.desk}-${e.ticker}-${i}`
            const isOpen = expanded.has(key)
            const isLong = e.direction === 'LONG'
            const isShort = e.direction === 'SHORT'
            const dirColor = isLong ? '#00FF00' : isShort ? '#D82B2B' : '#888888'

            return (
              <div
                key={key}
                className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                {/* Full height border line */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                
                <div className="w-full flex flex-col relative h-full pl-[3px]">
                  <div className="w-full flex items