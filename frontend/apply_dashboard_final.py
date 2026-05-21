import re
import os

dash_path = "src/components/DashboardView.tsx"
with open(dash_path, "r") as f:
    dash = f.read()

# 1. ADD copiedDash state
if "const [copiedDash, setCopiedDash] = useState(false)" not in dash:
    dash = dash.replace(
        "const { openConnectModal } = useConnectModal()",
        "const { openConnectModal } = useConnectModal()\n  const [copiedDash, setCopiedDash] = useState(false)"
    )

# 2. OVERHAUL UPPER DASHBOARD STATS
stats_old = r'\{/\* ── High-End Terminal Stats Dashboard ── \*/\}[\s\S]*?(?=\{\/\* ── Portfolio Overview \(ring chart \+ wallet summary\) ── \*/\})'
stats_new = r'''{/* ── Genuine Terminal Telemetry Dashboard ── */}
      <div className="mb-10 solid-panel bg-[#050505] p-6 sm:p-8 border-l-[3px] border-brand-red shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
           <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-positive animate-pulse shadow-glow-green" /> Live Telemetry
           </span>
           <span className="text-[10px] font-mono text-brand-red uppercase tracking-[0.2em] font-bold">
              ARC_TESTNET
           </span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-white/5">
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
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 group-hover:text-brand-red transition-colors">{s.label}</span>
              <span className={`font-mono text-3xl sm:text-4xl tracking-tight font-bold ${s.color}`}>
                {s.value}
              </span>
              <span className="text-[8px] font-mono uppercase text-text-tertiary mt-2 tracking-widest">{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>

      '''
dash = re.sub(stats_old, stats_new, dash)

# 3. FIX RING CHART
ring_old = r'''<svg width="\d+" height="\d+" viewBox=\{`0 0 \d+ \d+`\} className="transform -rotate-90">
          \{/\* Track \*/\}
          <circle cx=\{\d+\} cy=\{\d+\}
            r=\{radius\}
            fill="none"
            stroke="#1A1A24"
            strokeWidth="14"
          />
          \{/\* Segments \*/\}
          \{QUADRANTS\.map\(\(q, i\) => \{
            const len = \(q\.pct / total\) \* circumference
            const seg = \(
              <circle
                key=\{i\}
                cx=\{\d+\}
                cy=\{\d+\}
                r=\{radius\}
                fill="none"
                stroke=\{q\.color\}
                strokeWidth="14"
                strokeDasharray=\{`\$\{len\} \$\{circumference\}`}
                strokeDashoffset=\{-offset\}
                strokeLinecap="butt"
                style=\{\{ transition: 'stroke-dashoffset 1\.2s ease-out' \}\}
              />
            \)
            offset \+= len
            return seg
          \}\)\}
        </svg>
        \{/\* Center label \*/\}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-\[11px\] text-text-secondary tracking-\[0\.3em\] uppercase mb-1">
            All Weather
          </p>
          <p className="font-display text-3xl sm:text-4xl text-text-primary font-bold leading-none">
            \{total\}%
          </p>
        </div>'''

ring_new = r'''<svg width="240" height="240" viewBox={`0 0 240 240`} className="transform -rotate-90">
          {/* Track */}
          <circle cx={120} cy={120} r={100} fill="none" stroke="#1A1A24" strokeWidth="12" />
          {/* Segments */}
          {QUADRANTS.map((q, i) => {
            const currentCircumference = 2 * Math.PI * 100
            const len = (q.pct / total) * currentCircumference
            const seg = (
              <circle
                key={i} cx={120} cy={120} r={100} fill="none" stroke={q.color} strokeWidth="12"
                strokeDasharray={`${len} ${currentCircumference}`} strokeDashoffset={-offset} strokeLinecap="butt"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            )
            offset += len
            return seg
          })}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[10px] text-text-secondary tracking-[0.25em] uppercase mb-1">
            All Weather
          </p>
          <p className="font-display text-3xl sm:text-4xl text-text-primary font-bold leading-none">
            {total}%
          </p>
        </div>'''
dash = re.sub(ring_old, ring_new, dash)

# 4. UPGRADE TERMINAL ACCESS BOX
terminal_old = r'''<motion\.div
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

terminal_new = r'''<motion.div
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
              { label: 'Address', value: `${address?.slice(0, 6)}...${address?.slice(-4)}`, isAddress: true },
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Chain ID', value: '5042002' },
              { label: 'Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(4)} USDC` : 'Loading...' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-end pb-3 border-b border-border/50">
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">{r.label}</span>
                {r.isAddress ? (
                  <button 
                    onClick={() => {
                      if (address) {
                        navigator.clipboard.writeText(address);
                        setCopiedDash(true);
                        setTimeout(() => setCopiedDash(false), 2000);
                      }
                    }}
                    className="font-mono text-[11px] text-text-primary hover:text-brand-red transition-colors flex items-center gap-2"
                  >
                    {r.value}
                    {copiedDash ? <span className="text-positive text-[9px] ml-1">Copied ✓</span> : null}
                  </button>
                ) : (
                  <span className={`font-mono text-[11px] ${r.label === 'Balance' ? 'text-accent-gold font-bold' : 'text-text-primary'}`}>{r.value}</span>
                )}
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
dash = re.sub(terminal_old, terminal_new, dash)

with open(dash_path, "w") as f:
    f.write(dash)
print("Dashboard completely overhauled!")
