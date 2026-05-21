import os
import re

# 1. TONE DOWN BUTTON PULSE
index_css = "src/index.css"
if os.path.exists(index_css):
    with open(index_css, "r") as f:
        css = f.read()
    
    # We will redefine button-pulse to be very subtle
    pulse_def = """
@keyframes button-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(216,43,43,0.3); border-color: rgba(216,43,43,0.4); }
  50% { box-shadow: 0 0 16px rgba(216,43,43,0.6); border-color: rgba(216,43,43,0.8); }
}
.btn-pulse {
  transition: all 0.3s ease;
}
.btn-pulse:hover {
  animation: button-pulse 2.5s ease-in-out infinite;
  background-color: rgba(216,43,43,0.05) !important;
}
"""
    if ".btn-pulse" not in css:
        css += pulse_def
    else:
        # replace existing
        css = re.sub(r'\.btn-pulse[\s\S]*?\}', '', css)
        css = re.sub(r'@keyframes button-pulse[\s\S]*?\}', '', css)
        css += pulse_def
        
    with open(index_css, "w") as f:
        f.write(css)

# Update buttons to use btn-pulse instead of hover:red-pulse hover:!shadow-glow-red-strong
def replace_button_classes(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, "r") as f:
        content = f.read()
    content = content.replace("hover:!shadow-glow-red-strong hover:red-pulse cursor-pointer", "btn-pulse cursor-pointer")
    content = content.replace("hover:!shadow-[0_0_12px_rgba(216,43,43,0.5)] hover:bg-brand-red/5 hover:red-pulse cursor-pointer", "btn-pulse cursor-pointer")
    content = content.replace("hover:!shadow-[0_0_12px_rgba(216,43,43,0.5)] hover:bg-brand-red/5 hover:red-pulse", "btn-pulse")
    with open(filepath, "w") as f:
        f.write(content)

replace_button_classes("src/components/Layout.tsx")
replace_button_classes("src/components/WalletButton.tsx")


# 2. OVERHAUL DASHBOARD PORTFOLIO (Upper stats + Terminal Access + Ring Chart)
dash_path = "src/components/DashboardView.tsx"
if os.path.exists(dash_path):
    with open(dash_path, "r") as f:
        dash = f.read()

    # Upper stats
    stats_old = r'\{/\* ── High-End Terminal Stats Dashboard ── \*/\}[\s\S]*?(?=\{/\* ── Portfolio Overview)'
    stats_old_2 = r'<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-6">[\s\S]*?(?=\{/\* ── Portfolio Overview)'
    
    stats_new = r'''{/* ── Genuine Terminal Telemetry Dashboard ── */}
      <div className="mb-10 solid-panel bg-[#050505] p-6 sm:p-8 border-l-[3px] border-brand-red shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4 relative z-10">
           <div className="flex items-center gap-3">
              <span className="w-1.5 h-3 bg-positive animate-pulse shadow-glow-green" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-primary font-bold">Live Telemetry</span>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[9px] font-mono text-text-tertiary uppercase tracking-[0.1em] hidden sm:inline-block">
                SYS.TIME: {new Date().toISOString().split('T')[1].slice(0, 8)}Z
              </span>
              <span className="text-[9px] font-mono text-brand-red uppercase tracking-[0.15em] font-bold border border-brand-red/30 px-2 py-1 bg-brand-red/10">
                ARC_TESTNET
              </span>
           </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-white/5 relative z-10">
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
              className="lg:px-8 flex flex-col justify-between group"
            >
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 group-hover:text-brand-red transition-colors flex items-center justify-between">
                {s.label}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-brand-red">↗</span>
              </span>
              <span className={`font-mono text-3xl sm:text-4xl tracking-tight font-bold ${s.color}`}>
                {s.value}
              </span>
              <span className="text-[8px] font-mono uppercase text-text-tertiary mt-2 tracking-widest">{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>

      '''
    if "High-End Terminal Stats Dashboard" in dash:
        dash = re.sub(stats_old, stats_new, dash)
    else:
        dash = re.sub(stats_old_2, stats_new, dash)

    # Terminal Access Redesign (Connected State)
    term_old = r'''<motion\.div
          initial=\{\{ opacity: 0, y: 16 \}\}
          animate=\{\{ opacity: 1, y: 0 \}\}
          transition=\{\{ delay: 0\.3 \}\}
          className="bg-\[#050505\] p-6 sm:p-10 flex flex-col gap-6 border-l border-border/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-\[radial-gradient\(ellipse_at_top_right,_var\(--tw-gradient-stops\)\)\] from-positive/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          <p className="text-\[10px\] font-medium uppercase tracking-\[0\.3em\] text-text-tertiary relative z-10">
            Terminal Access
          </p>
          <div className="flex items-center gap-3 px-4 py-3 border border-positive/30 bg-positive/5 rounded-none">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <span className="font-mono text-\[11px\] text-positive uppercase tracking-widest">
              Connected
            </span>
          </div>
          <div className="space-y-4">
            \{\[
              \{ label: 'Address', value: `\$\{address\?\.slice\(0, 6\)\}\.\.\.\$\{address\?\.slice\(-4\)\}` \},
              \{ label: 'Network', value: 'Arc Testnet' \},
              \{ label: 'Chain ID', value: '5042002' \},
              \{ label: 'Balance', value: balance \? `\$\{parseFloat\(balance\.formatted\)\.toFixed\(4\)\} USDC` : 'Loading\.\.\.' \},
            \]\.map\(r => \(
              <div key=\{r\.label\} className="flex justify-between items-end pb-3 border-b border-white/5">
                <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">\{r\.label\}</span>
                <span className="font-mono text-\[11px\] text-text-primary">\{r\.value\}</span>
              </div>
            \)\)\}
          </div>
          <a
            href=\{`https://testnet\.arcscan\.app/address/\$\{address\}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-\[10px\] uppercase tracking-\[0\.2em\] text-brand-red hover:text-white transition-colors mt-auto pt-4"
          >
            View on ArcScan →
          </a>
        </motion\.div>'''
        
    term_new = r'''<motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#050505] p-6 sm:p-10 flex flex-col gap-6 border-l border-border/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-positive/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Terminal Access
            </p>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-positive/5 border border-positive/30 text-positive text-[9px] uppercase tracking-[0.2em] shadow-glow-green">
              <span className="w-1.5 h-1.5 bg-positive animate-pulse" /> Connected
            </span>
          </div>

          <div className="space-y-4 relative z-10 mt-4">
            {[
              { label: 'Address', value: `${address?.slice(0, 6)}...${address?.slice(-4)}` },
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Chain ID', value: '5042002' },
              { label: 'Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(4)} USDC` : 'Loading...' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-end pb-3 border-b border-border/50">
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">{r.label}</span>
                <span className={`font-mono text-[11px] ${r.label === 'Balance' ? 'text-accent-gold font-bold' : 'text-text-primary'}`}>{r.value}</span>
              </div>
            ))}
          </div>
          
          <a
            href={`https://testnet.arcscan.app/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="group mt-auto pt-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-brand-red hover:text-white transition-colors relative z-10"
          >
            <span>View on ArcScan</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </motion.div>'''
    dash = re.sub(term_old, term_new, dash)

    # Ring Chart Text and Size Fix
    ring_old = r'''function RingChart\(\) \{[\s\S]*?<\/svg>[\s\S]*?<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">[\s\S]*?<\/div>\s*<\/div>'''
    
    ring_new = r'''function RingChart() {
  const total = QUADRANTS.reduce((s, q) => s + q.pct, 0)
  const radius = 96
  const cx = 120
  const cy = 120
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xs mx-auto">
      <div className="relative">
        <svg width="240" height="240" viewBox={`0 0 240 240`} className="transform -rotate-90">
          {/* Track */}
          <circle cx={120} cy={120}
            r={radius}
            fill="none"
            stroke="#1A1A24"
            strokeWidth="14"
          />
          {/* Segments */}
          {QUADRANTS.map((q, i) => {
            const len = (q.pct / total) * circumference
            const seg = (
              <circle key={i} cx={120} cy={120}
                r={radius}
                fill="none"
                stroke={q.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            )
            offset += len
            return seg
          })}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[11px] text-text-secondary tracking-[0.3em] uppercase mb-1">
            All Weather
          </p>
          <p className="font-display text-4xl sm:text-5xl text-text-primary font-bold leading-none">
            {total}%
          </p>
        </div>
      </div>'''
    dash = re.sub(ring_old, ring_new, dash)
    
    with open(dash_path, "w") as f:
        f.write(dash)

