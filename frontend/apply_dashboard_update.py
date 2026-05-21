import re

dash_path = "src/components/DashboardView.tsx"
with open(dash_path, "r") as f:
    content = f.read()

# 1. Fix RingChart centers and text overlap
parts = content.split("function RingChart() {")
if len(parts) == 2:
    ring_chart = parts[1]
    # The SVG size was expanded to 220x220, so cx and cy need to be 110!
    ring_chart = ring_chart.replace('cx={100}', 'cx={110}')
    ring_chart = ring_chart.replace('cy={100}', 'cy={110}')
    
    text_pattern = r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">[\s\S]*?</div>'
    text_repl = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[14px] sm:text-base text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red mt-1.5">
            {total}% Div.
          </p>
        </div>'''
    ring_chart = re.sub(text_pattern, text_repl, ring_chart)
    content = parts[0] + "function RingChart() {" + ring_chart

# 2. Redesign Upper Dashboard Stats into authentic telemetry cards
stats_pattern = r'\{\/\* ── True Terminal Stats Banner ── \*\/\}[\s\S]*?(?=\{\/\* ── Portfolio Overview)'
stats_repl = r'''{/* ── High-End Terminal Stats Dashboard ── */}
      <div className="mb-10 space-y-4">
        <div className="flex items-center justify-between px-2">
           <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-positive animate-pulse" /> Telemetry Active
           </span>
           <span className="text-[10px] font-mono text-brand-red uppercase tracking-[0.2em] font-bold">
              ARC_TESTNET
           </span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              className="solid-panel p-5 sm:p-6 flex flex-col relative group overflow-hidden border border-border/60 hover:border-brand-red/30 transition-all duration-300 rounded-none bg-[#050505]"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-red/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-tertiary group-hover:text-text-secondary transition-colors">{s.label}</span>
                <span className="text-[8px] font-mono uppercase text-brand-red/60 border border-brand-red/20 px-1 py-0.5 bg-brand-red/5">{s.sub}</span>
              </div>
              <div className="mt-auto">
                <span className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight ${s.color}`}>
                  {s.value}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      '''
content = re.sub(stats_pattern, stats_repl, content, flags=re.DOTALL)

with open(dash_path, "w") as f:
    f.write(content)

print("Dashboard RingChart centered and Telemetry UI applied!")
