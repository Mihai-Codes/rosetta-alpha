import re
import os

dash_path = "src/components/DashboardView.tsx"
if os.path.exists(dash_path):
    with open(dash_path, "r") as f:
        dash = f.read()

    # 1. Fix RingChart clipping and text overlap
    dash = re.sub(r'const radius = \d+', 'const radius = 90', dash)
    dash = re.sub(r'const cx = \d+', 'const cx = 110', dash)
    dash = re.sub(r'const cy = \d+', 'const cy = 110', dash)
    dash = re.sub(r'width="\d+" height="\d+" viewBox=\{`0 0 \d+ \d+`\}', 'width="220" height="220" viewBox={`0 0 220 220`}', dash)
    dash = re.sub(r'strokeWidth="\d+"', 'strokeWidth="14"', dash)
    dash = re.sub(r'text-\[14px\] sm:text-base', 'text-[11px] sm:text-[12px]', dash)

    # 2. Authentic Terminal Dashboard Upper Stats
    stats_banner_old = r'\{/\* ── High-End Terminal Stats Banner ── \*/\}[\s\S]*?\{/\* ── Portfolio Overview'
    stats_banner_new = r'''{/* ── True Terminal Stats Banner ── */}
      <div className="border border-border/80 bg-[#020202] rounded-none mb-10 relative shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-positive animate-pulse shadow-glow-green rounded-full" />
            <span className="text-[9px] font-mono text-positive uppercase tracking-[0.2em]">Link Established : Active</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-[0.1em] hidden sm:inline-block">
              SYS.TIME: {new Date().toISOString().split('T')[1].slice(0, 8)}Z
            </span>
            <span className="text-[9px] font-mono text-brand-red uppercase tracking-[0.15em] font-bold border border-brand-red/30 px-1.5 py-0.5 bg-brand-red/10">
              ARC_TESTNET
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/60">
          {[
            { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'AVAILABLE', color: 'text-text-primary' },
            { label: 'Total Earned', value: `+${totalEarned.toFixed(2)}`, sub: 'USDC (PnL)', color: 'text-positive' },
            { label: 'Win Rate', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} TRADES`, color: 'text-accent-gold' },
            { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'OPEN POSITIONS', color: 'text-brand-red' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 sm:p-6 flex flex-col relative group overflow-hidden bg-[#050505] hover:bg-[#0A0A0A] transition-colors"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-transparent group-hover:bg-brand-red/40 transition-colors" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-tertiary group-hover:text-text-secondary transition-colors">{s.label}</span>
                <span className="text-[8px] font-mono uppercase text-text-tertiary border border-border/50 px-1 py-0.5 bg-bg-primary">{s.sub}</span>
              </div>
              <div className="mt-auto">
                <span className={`font-mono text-2xl sm:text-3xl font-normal tracking-tight ${s.color}`}>
                  {s.value}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Portfolio Overview'''
    dash = re.sub(stats_banner_old, stats_banner_new, dash)
    
    with open(dash_path, "w") as f:
        f.write(dash)
    print("DashboardView terminal upgrades and RingChart applied!")

# 3. FIX ALLWEATHERCHART.TSX (for the Desks page)
awc_path = "src/components/AllWeatherChart.tsx"
if os.path.exists(awc_path):
    with open(awc_path, "r") as f:
        awc = f.read()
    awc = re.sub(r'const radius = \d+', 'const radius = 90', awc)
    awc = re.sub(r'width="\d+" height="\d+" viewBox="0 0 \d+ \d+"', 'width="220" height="220" viewBox="0 0 220 220"', awc)
    awc = re.sub(r'cx="\d+"\s*cy="\d+"', 'cx="110" cy="110"', awc)
    awc = re.sub(r'strokeWidth="\d+"', 'strokeWidth="14"', awc)
    awc = re.sub(r'text-\[14px\] sm:text-base', 'text-[11px] sm:text-[12px]', awc)
    with open(awc_path, "w") as f:
        f.write(awc)
    print("AllWeatherChart unchopped and fixed!")
