import os
import re

def update_file(path, old, new):
    with open(path, 'r') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"NOT FOUND in {path}")

# 1. Fix RingChart clipping
dash_path = "src/components/DashboardView.tsx"
with open(dash_path, 'r') as f:
    dash = f.read()
dash = dash.replace("const cx = 80\n  const cy = 80", "const cx = 90\n  const cy = 90")
dash = dash.replace("viewBox={`0 0 160 160`}", "viewBox={`0 0 180 180`}")

# 2. Add copy to clipboard for address in Terminal Access
if "const [copiedDash, setCopiedDash] = useState(false)" not in dash:
    dash = dash.replace("const { openConnectModal } = useConnectModal()", "const { openConnectModal } = useConnectModal()\n  const [copiedDash, setCopiedDash] = useState(false)")

dash_terminal_old = r'''<motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#050505] p-6 sm:p-10 flex flex-col gap-6"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
            Terminal Access
          </p>
          <div className="flex items-center gap-3 px-4 py-3 border border-positive/30 bg-positive/5 rounded-none">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <span className="font-mono text-[11px] text-positive uppercase tracking-widest">
              Connected
            </span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Address', value: `${address?.slice(0, 6)}...${address?.slice(-4)}` },
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Chain ID', value: '5042002' },
              { label: 'Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(4)} USDC` : 'Loading...' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-end pb-3 border-b border-white/5">
                <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">{r.label}</span>
                <span className="font-mono text-[11px] text-text-primary">{r.value}</span>
              </div>
            ))}
          </div>
          <a
            href={`https://testnet.arcscan.app/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[10px] uppercase tracking-[0.2em] text-brand-red hover:text-white transition-colors mt-auto pt-4"
          >
            View on ArcScan →
          </a>
        </motion.div>'''

dash_terminal_new = r'''<motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#050505] p-6 sm:p-10 flex flex-col gap-6 border-l border-border/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-positive/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Terminal Access
            </p>
            <span className="text-[9px] font-mono text-positive uppercase tracking-widest px-2 py-1 bg-positive/10 border border-positive/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-positive animate-pulse" />
              Connected
            </span>
          </div>

          <div className="space-y-5 mt-4 relative z-10">
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
            className="group mt-auto pt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-brand-red hover:text-white transition-colors"
          >
            <span>View on ArcScan</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </motion.div>'''

dash = dash.replace(dash_terminal_old, dash_terminal_new)

# 3. Enhance Locked Box in Dashboard
locked_box_old = r'''{/* Locked Analytics Preview */}
        <div className="bg-[#050505] p-6 sm:p-10 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-30" />
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Target Allocation
            </p>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#111111] border border-border text-text-secondary text-[9px] uppercase tracking-[0.2em]">
              <Lock className="w-3 h-3 text-brand-red" /> Encrypted
            </span>
          </div>
          
          <div className="relative z-10 opacity-20 grayscale pointer-events-none transition-all duration-700 blur-[3px]">
            <RingChart />
          </div>
          
          {/* Ominous overlay text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="border border-brand-red/30 bg-bg-primary/80 backdrop-blur-md px-6 py-4 flex flex-col items-center gap-2 shadow-glow-red">
               <span className="text-brand-red text-xl">⚠</span>
               <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-brand-red">Insufficient Clearance</span>
            </div>
          </div>
          
          <div className="mt-12 space-y-4 relative z-10">
            <div className="h-px w-full bg-border/50" />
            <div className="flex justify-between items-center opacity-30">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/20 px-2">██████ USDC</span>
            </div>
            <div className="flex justify-between items-center opacity-30">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/20 px-2">██.█%</span>
            </div>
          </div>
        </div>'''

locked_box_new = r'''{/* Locked Analytics Preview */}
        <div className="bg-[#050505] p-6 sm:p-10 flex flex-col relative overflow-hidden border-l border-border/60">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/80 to-transparent opacity-60" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red/50" />
              Target Allocation
            </p>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-brand-red/10 border border-brand-red/30 text-brand-red text-[9px] uppercase tracking-[0.2em] shadow-glow-red">
              <Lock className="w-3 h-3" /> Encrypted
            </span>
          </div>
          
          <div className="relative z-10 opacity-10 grayscale pointer-events-none transition-all duration-700 blur-[4px]">
            <RingChart />
          </div>
          
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex flex-col items-center gap-3">
               <div className="w-12 h-12 border border-brand-red/30 bg-brand-red/10 flex items-center justify-center rounded-full backdrop-blur-md">
                 <Lock className="w-5 h-5 text-brand-red" />
               </div>
               <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand-red bg-bg-primary/90 px-4 py-2 border border-brand-red/20 backdrop-blur-sm">
                 Auth Required
               </span>
            </div>
          </div>
          
          <div className="mt-10 space-y-4 relative z-10">
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-[1px]">████ USDC</span>
            </div>
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-[1px]">██.█%</span>
            </div>
          </div>
        </div>'''

dash = dash.replace(lockedBoxOld, lockedBoxNew)
with open(dash_path, 'w') as f:
    f.write(dash)
print("DashboardView updated!")

# 4. Enhance Leaderboard Stats Banner
lead_path = "src/components/LeaderboardView.tsx"
with open(lead_path, 'r') as f:
    lead = f.read()

lead_stats_old = r'''<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-10">
        {[
          { label: 'Active Traders',  value: String(TRADERS.length), accent: 'text-accent-gold' },
          { label: 'USDC Distributed', value: `${TRADERS.reduce((s, t) => s + t.earned, 0)}`, sub: 'USDC', accent: 'text-positive' },
          { label: 'Correct Calls',   value: String(TRADERS.reduce((s, t) => s + t.correct, 0)), accent: '' },
          { label: 'Arc Settlements', value: String(TRADERS.reduce((s, t) => s + t.arcTxCount, 0)), accent: '' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-[#050505] px-6 py-8 flex flex-col gap-3 hover:bg-[#0A0A0F] border-b-2 border-transparent hover:border-brand-red/50 transition-colors relative group"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-border group-hover:bg-brand-red/30 transition-colors" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">{s.label}</p>
            <p className={`font-display text-3xl font-bold tracking-tight ${s.accent || 'text-text-primary'}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-wide">{s.sub}</p>}
          </motion.div>
        ))}
      </div>'''

lead_stats_new = r'''{/* ── High-End Stats Banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/80 border border-border/80 rounded-none mb-10">
        {[
          { label: 'Active Traders',  value: String(TRADERS.length), accent: 'text-text-primary' },
          { label: 'USDC Distributed', value: `${TRADERS.reduce((s, t) => s + t.earned, 0)}`, sub: 'USDC', accent: 'text-positive' },
          { label: 'Correct Calls',   value: String(TRADERS.reduce((s, t) => s + t.correct, 0)), accent: 'text-accent-gold' },
          { label: 'Arc Settlements', value: String(TRADERS.reduce((s, t) => s + t.arcTxCount, 0)), accent: 'text-brand-red' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0A0A0A] px-6 py-8 flex flex-col gap-3 hover:bg-[#111111] transition-colors relative group border-t-2 border-transparent hover:border-brand-red"
          >
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-border group-hover:bg-brand-red transition-colors" />
               <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary group-hover:text-text-primary transition-colors">{s.label}</p>
            </div>
            <p className={`font-mono text-3xl font-bold tracking-tight ${s.accent}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-widest">{s.sub}</p>}
          </motion.div>
        ))}
      </div>'''

lead = lead.replace(lead_stats_old, lead_stats_new)
with open(lead_path, 'w') as f:
    f.write(lead)
print("LeaderboardView updated!")

