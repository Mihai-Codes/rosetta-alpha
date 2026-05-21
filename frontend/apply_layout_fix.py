import os
import re

# 1. Update Leaderboard Stats Banner
lead_file = "src/components/LeaderboardView.tsx"
with open(lead_file, "r") as f:
    lead = f.read()

lead_stats_old = r'<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">[\s\S]*?\{/\* ── Podium \(top 3\) ── \*/\}'
lead_stats_new = r'''<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-10">
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
      </div>

      {/* ── Podium (top 3) ── */}'''

lead = re.sub(lead_stats_old, lead_stats_new, lead)
with open(lead_file, "w") as f:
    f.write(lead)


# 2. Update Layout Footer 
layout_file = "src/components/Layout.tsx"
with open(layout_file, "r") as f:
    layout = f.read()

footer_old = r'<div className="w-full max-w-\[1440px\] mx-auto px-4 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 text-\[11px\] text-text-tertiary">[\s\S]*?<div className="w-full max-w-\[1440px\]'
footer_new = r'''<div className="w-full max-w-[1250px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-12 md:gap-6 text-[11px] text-text-tertiary">
          {/* Left: Rosetta Alpha */}
          <div className="flex-1 max-w-[320px]">
            <p className="font-display text-text-primary text-base mb-2">
              Rosetta <span className="text-brand-red">Alpha</span>
            </p>
            <div className="flex flex-col gap-0.5 font-light text-[12px] text-text-secondary">
              <p>Multi-language reasoning traces secured on Arc L1.</p>
              <p>An institutional-grade intelligence layer for global macro.</p>
            </div>
          </div>

          {/* Separator 1 - Claw */}
          <div className="hidden md:block w-[1px] h-28 bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-80 red-pulse shadow-[0_0_12px_rgba(216,43,43,0.8)]" />

          {/* Center: Stack */}
          <div className="flex-1 max-w-[320px] flex flex-col items-center text-left">
            <div className="w-fit">
              <p className="uppercase tracking-[0.25em] text-text-secondary mb-3 text-[10px] text-center md:text-left">Stack</p>
              <ul className="space-y-3 font-light">
                <li className="flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-brand-red opacity-80"/> AdalFlow · Multi-agent reasoning</li>
                <li className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-brand-red opacity-80"/> Arc L1 · On-chain provenance</li>
                <li className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5 text-brand-red opacity-80"/> IPFS · Permanent storage</li>
                <li className="flex items-center gap-2"><CircleDollarSign className="w-3.5 h-3.5 text-brand-red opacity-80"/> Circle Paymaster · Gasless USDC</li>
              </ul>
            </div>
          </div>

          {/* Separator 2 - Claw */}
          <div className="hidden md:block w-[1px] h-28 bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-80 red-pulse shadow-[0_0_12px_rgba(216,43,43,0.8)]" />

          {/* Right: Reference */}
          <div className="flex-1 max-w-[320px] flex flex-col items-end text-right">
            <div className="w-full text-right">
              <p className="uppercase tracking-[0.25em] text-text-secondary mb-3 text-[10px]">Reference</p>
              <p className="font-light leading-relaxed">
                <a href="https://agora.thecanteenapp.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium underline underline-offset-4 decoration-white/10">Agora Agents Hackathon</a><br />
                Engineered for <a href="https://www.principles.com/" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:text-text-primary transition-colors font-medium drop-shadow-[0_0_8px_rgba(216,43,43,0.4)]">Radical Truth</a>.
              </p>
            </div>
          </div>
        </div>
        <div className="w-full max-w-[1440px]'''

layout = re.sub(footer_old, footer_new, layout)
with open(layout_file, "w") as f:
    f.write(layout)

print("UI fixes applied via python script!")
