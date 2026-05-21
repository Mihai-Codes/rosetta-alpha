import re
import os

dash_path = "src/components/DashboardView.tsx"
with open(dash_path, "r") as f:
    dash = f.read()

# Make sure we have copiedDash state
if "const [copiedDash, setCopiedDash] = useState(false)" not in dash:
    dash = dash.replace(
        "const { openConnectModal } = useConnectModal()",
        "const { openConnectModal } = useConnectModal()\n  const [copiedDash, setCopiedDash] = useState(false)"
    )

auth_dashboard_old = r'\{/\* ── High-End Terminal Stats Dashboard ── \*/\}[\s\S]*?(?=\{\/\* ── My Predictions ── \*/\})'

auth_dashboard_new = r'''{/* ── Genuine Terminal Telemetry Dashboard ── */}
      <div className="mb-10 solid-panel bg-[#050505] p-6 sm:p-8 border border-border/80 shadow-2xl relative overflow-hidden">
        {/* Subtle top red glow */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
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
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 group-hover:text-brand-red transition-colors flex items-center justify-between">
                {s.label}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">↗</span>
              </span>
              <span className={`font-mono text-3xl sm:text-4xl tracking-tight font-bold ${s.color}`}>
                {s.value}
              </span>
              <span className="text-[8px] font-mono uppercase text-text-tertiary mt-2 tracking-widest">{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Portfolio Overview (ring chart + terminal access) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-none shadow-2xl">
        <div className="lg:col-span-2 bg-[#0A0A0A] p-6 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red/50" />
              Portfolio Overview
            </p>
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-secondary opacity-60">Risk Parity Strategy</span>
          </div>
          <div className="flex-1 flex items-center justify-center pt-2 sm:pt-4">
             <RingChart />
          </div>
        </div>

        <motion.div
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
            <span className="flex items-center gap-1.5 px-2 py-1 bg-positive/10 border border-positive/30 text-positive text-[9px] uppercase tracking-[0.2em] shadow-glow-green">
              <span className="w-1.5 h-3 bg-positive animate-pulse" /> Connected
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
                    {copiedDash ? <span className="text-positive text-[9px] ml-1 font-bold">✓</span> : null}
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
            className="group mt-auto pt-6 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-brand-red hover:text-white transition-colors relative z-10"
          >
            <span>View on ArcScan</span>
            <span className="transition-transform group-hover:translate-x-1 font-bold">→</span>
          </a>
        </motion.div>
      </div>

      '''

dash = re.sub(auth_dashboard_old, auth_dashboard_new, dash)

with open(dash_path, "w") as f:
    f.write(dash)

print("Dashboard authenticated state overhauled!")
