import os
import re

dash_path = "src/components/DashboardView.tsx"
with open(dash_path, "r") as f:
    dash = f.read()

# 1. Fix Ring Chart Size and Text Overlap
ring_old = r'''const radius = 72
  const cx = 90
  const cy = 90
  const circumference = 2 \* Math\.PI \* radius'''
ring_new = r'''const radius = 86
  const cx = 110
  const cy = 110
  const circumference = 2 * Math.PI * radius'''
dash = re.sub(ring_old, ring_new, dash)

dash = dash.replace('width="180" height="180" viewBox={`0 0 180 180`}', 'width="220" height="220" viewBox={`0 0 220 220`}')

text_old = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-display text-3xl text-text-primary leading-none">\{total\}%<\/p>
          <p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-1">Diversified<\/p>
        <\/div>'''
text_new = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-sm sm:text-base text-text-primary font-bold tracking-[0.2em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-text-tertiary mt-1.5">
            Risk Parity
          </p>
        </div>'''
dash = re.sub(text_old, text_new, dash)

# 2. Redesign the Upper Stats Row
stats_old = r'''\{/\* ── Stat tiles row ── \*/\}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-6">
        \{\[
          \{ label: 'USDC Balance', value: balance \? `\$\{parseFloat\(balance\.formatted\)\.toFixed\(2\)\}` : '—', sub: 'Arc Testnet', accent: 'text-accent-gold' \},
          \{ label: 'Total Earned', value: `\$\{totalEarned\.toFixed\(2\)\} USDC`, sub: 'From predictions', accent: 'text-positive' \},
          \{ label: 'Accuracy', value: `\$\{accuracy\}%`, sub: `\$\{PREDICTIONS\.filter\(p => p\.status === 'RESOLVED_WIN'\)\.length\}/\$\{PREDICTIONS\.length\} correct`, accent: '' \},
          \{ label: 'Active Stakes', value: String\(PREDICTIONS\.filter\(p => p\.status === 'OPEN'\)\.length\), sub: 'Open positions', accent: '' \},
        \]\.map\(\(s, i\) => \(
          <motion\.div
            key=\{s\.label\}
            initial=\{\{ opacity: 0, y: 12 \}\}
            animate=\{\{ opacity: 1, y: 0 \}\}
            transition=\{\{ delay: i \* 0\.07 \}\}
            className="bg-\[#050505\] px-6 py-8 flex flex-col gap-3 hover:bg-\[#0A0A0F\] border-b-2 border-transparent hover:border-brand-red/50 transition-colors relative group"
          >
            <div className="absolute top-0 left-0 w-full h-\[1px\] bg-border group-hover:bg-brand-red/30 transition-colors" />
            <p className="text-\[10px\] font-mono uppercase tracking-\[0\.2em\] text-text-tertiary">\{s\.label\}<\/p>
            <p className=\{`font-display text-3xl font-bold tracking-tight \$\{s\.accent || 'text-text-primary'\}`\}>
              \{s\.value\}
            <\/p>
            \{s\.sub && <p className="text-\[9px\] text-text-tertiary font-mono tracking-wide">\{s\.sub\}<\/p>\}
          <\/motion\.div>
        \)\)\}
      <\/div>'''

stats_new = r'''{/* ── High-End Terminal Stats Banner ── */}
      <div className="border border-border/80 bg-[#0A0A0A] rounded-none mb-10 relative overflow-hidden shadow-2xl">
        <div className="h-[2px] w-full bg-gradient-to-r from-brand-red/80 via-brand-red/20 to-transparent" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-[#050505]">
           <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red animate-pulse" /> Live Telemetry
           </span>
           <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Session Active</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/40">
          {[
            { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'Arc Testnet', accent: 'text-text-primary' },
            { label: 'Total Earned', value: `+${totalEarned.toFixed(2)}`, sub: 'USDC Generated', accent: 'text-positive' },
            { label: 'Accuracy', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} Correct`, accent: 'text-accent-gold' },
            { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'Open positions', accent: 'text-brand-red' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#050505] px-6 py-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group relative"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-transparent group-hover:bg-brand-red/50 transition-colors" />
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-5 group-hover:text-text-secondary transition-colors">{s.label}</p>
              <div>
                <p className={`font-mono text-3xl font-bold tracking-tight ${s.accent || 'text-text-primary'}`}>
                  {s.value}
                </p>
                {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-widest mt-2">{s.sub}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>'''

dash = re.sub(stats_old, stats_new, dash)

with open(dash_path, "w") as f:
    f.write(dash)
print("Dashboard stats and ring chart updated!")
