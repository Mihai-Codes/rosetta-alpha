import os

path = "src/components/DashboardView.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. FIX RING CHART
ring_old = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
          <p className="font-mono text-[9px] sm:text-[10px] text-text-secondary tracking-[0.25em] uppercase mb-1.5 leading-tight text-center">
            All<br/>Weather
          </p>
          <p className="font-display text-3xl sm:text-4xl text-text-primary font-bold leading-none mt-0.5">
            {total}%
          </p>
        </div>'''
ring_new = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
          <p className="font-mono text-[10px] text-text-secondary tracking-[0.2em] uppercase mb-1">
            All Weather
          </p>
          <p className="font-display text-2xl sm:text-3xl text-text-primary font-bold leading-none">
            {total}%
          </p>
          <p className="text-[8px] uppercase tracking-[0.2em] text-brand-red mt-1.5 font-mono">
            Diversified
          </p>
        </div>'''

if ring_old in content:
    content = content.replace(ring_old, ring_new)
else:
    # Try generic replacement
    import re
    content = re.sub(r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">[\s\S]*?</div>', ring_new, content)

# Also fix the RingChart SVG dimensions just to be absolutely sure it doesn't clip
content = re.sub(r'const radius = \d+', 'const radius = 80', content)
content = re.sub(r'width="\d+" height="\d+" viewBox="0 0 \d+ \d+"', 'width="200" height="200" viewBox="0 0 200 200"', content)
content = re.sub(r'cx=\{\d+\}\s+cy=\{\d+\}', 'cx={100} cy={100}', content)

# 2. OVERHAUL UPPER STATS
stats_old = r'''{/* ── Stat tiles row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-6">
        {[
          { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'Arc Testnet', accent: 'text-accent-gold' },
          { label: 'Total Earned', value: `${totalEarned.toFixed(2)} USDC`, sub: 'From predictions', accent: 'text-positive' },
          { label: 'Accuracy', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} correct`, accent: '' },
          { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'Open positions', accent: '' },
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

stats_new = r'''{/* ── High-End Terminal Stats Dashboard ── */}
      <div className="mb-10 solid-panel bg-[#050505] p-6 sm:p-8 border-l border-brand-red/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/30 to-transparent" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
           <div className="flex items-center gap-3">
              <span className="w-1.5 h-3 bg-positive shadow-glow-green" />
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
      </div>'''

content = content.replace(stats_old, stats_new)

# 3. OVERHAUL CONNECTED TERMINAL ACCESS BOX
terminal_old = r'''<motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#050505] p-6 sm:p-10 flex flex-col gap-6 border-l border-border/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-positive/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary relative z-10">
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
                        // Using an alert or a simple state, we'll just show it natively or rely on the dropdown
                      }
                    }}
                    className="font-mono text-[11px] text-text-primary hover:text-brand-red transition-colors flex items-center gap-2 cursor-copy"
                    title="Click to copy"
                  >
                    {r.value}
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
        </motion.div>'''

content = content.replace(terminal_old, terminal_new)

with open(path, "w") as f:
    f.write(content)

print("DashboardView authenticated sections upgraded!")
