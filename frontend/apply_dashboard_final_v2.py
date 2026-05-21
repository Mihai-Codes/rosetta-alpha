import re
import os

dash_path = "src/components/DashboardView.tsx"
if os.path.exists(dash_path):
    with open(dash_path, "r") as f:
        dash = f.read()

    # 1. Authentic Terminal Locked Box Redesign
    # We replace the entire locked analytics box with a much cooler encrypted text readout instead of a blurry ring chart
    lockedBoxOld = r'''{/\* Locked Analytics Preview \*/}
        <div className="bg-\[#050505\] p-6 sm:p-10 flex flex-col relative overflow-hidden border-l border-border/60">
          <div className="absolute top-0 left-0 w-full h-\[2px\] bg-gradient-to-r from-transparent via-brand-red/80 to-transparent opacity-60" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <p className="text-\[10px\] font-medium uppercase tracking-\[0\.3em\] text-text-tertiary flex items-center gap-2">
              <span className="w-1\.5 h-1\.5 bg-brand-red/50" />
              Target Allocation
            </p>
            <span className="flex items-center gap-1\.5 px-2 py-1 bg-brand-red/10 border border-brand-red/30 text-brand-red text-\[9px\] uppercase tracking-\[0\.2em\] shadow-glow-red">
              <Lock className="w-3 h-3" /> Encrypted
            </span>
          </div>
          
          <div className="relative z-10 opacity-10 grayscale pointer-events-none transition-all duration-700 blur-\[4px\]">
            <RingChart />
          </div>
          
          {/\* Overlay text \*/}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex flex-col items-center gap-3">
               <span className="font-mono text-\[11px\] uppercase tracking-\[0\.3em\] text-brand-red bg-bg-primary/90 px-4 py-2 border border-brand-red/20 backdrop-blur-sm shadow-glow-red flex items-center gap-2">
                 <span className="w-1\.5 h-3 bg-brand-red animate-pulse" />
                 Awaiting Decryption
               </span>
            </div>
          </div>
          
          <div className="mt-10 space-y-4 relative z-10">
            <div className="flex justify-between items-center opacity-40">
              <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-\[11px\] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-\[1px\]">████ USDC</span>
            </div>
            <div className="flex justify-between items-center opacity-40">
              <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-\[11px\] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-\[1px\]">██\.█%</span>
            </div>
          </div>
        </div>'''

    lockedBoxNew = r'''{/* Locked Analytics Preview */}
        <div className="bg-[#050505] p-6 sm:p-10 flex flex-col relative overflow-hidden border-l border-border/60 justify-between">
          
          <div className="flex flex-col gap-6 relative z-10 opacity-50">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-text-tertiary">
                Target Allocation
              </p>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-brand-red/5 border border-brand-red/20 text-brand-red text-[8px] uppercase tracking-[0.2em]">
                <span className="w-1 h-1 bg-brand-red animate-pulse rounded-none" /> SECURE
              </span>
            </div>
            
            <div className="space-y-4 font-mono text-[10px] text-text-tertiary uppercase tracking-widest">
               <div className="flex justify-between"><span>Equities</span> <span className="text-text-secondary">██%</span></div>
               <div className="flex justify-between"><span>Bonds</span> <span className="text-text-secondary">██%</span></div>
               <div className="flex justify-between"><span>Commodities</span> <span className="text-text-secondary">██%</span></div>
               <div className="flex justify-between"><span>Crypto</span> <span className="text-text-secondary">██%</span></div>
            </div>
          </div>
          
          {/* Overlay scanning effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] z-20 pointer-events-none opacity-40" />
          
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-bg-primary/40 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3">
               <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-brand-red bg-bg-primary/95 px-5 py-3 border border-brand-red/30 shadow-glow-red flex items-center gap-2">
                 <Lock className="w-3.5 h-3.5" />
                 Awaiting Decryption
               </span>
            </div>
          </div>
          
          <div className="mt-12 space-y-4 relative z-10 opacity-50">
            <div className="h-px w-full bg-border/50" />
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-[11px] text-text-secondary">-- USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-[11px] text-text-secondary">-- %</span>
            </div>
          </div>
        </div>'''

    dash = re.sub(lockedBoxOld, lockedBoxNew, dash)

    # 2. Fix the chopped Ring Chart & text
    # The chopped chart happens if the svg width/height and viewBox doesn't perfectly match the radius + stroke
    ring_chart_old = r'''function RingChart\(\) \{[\s\S]*?<\/svg>
        \{/\* Center label \*/\}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-\[11px\] text-text-secondary tracking-\[0\.3em\] uppercase mb-1">
            All Weather
          </p>
          <p className="font-display text-3xl sm:text-4xl text-text-primary font-bold leading-none">
            \{total\}%
          </p>
        </div>
      </div>'''

    ring_chart_new = r'''function RingChart() {
  const total = QUADRANTS.reduce((s, q) => s + q.pct, 0)
  const radius = 80 // Reduced radius slightly to completely avoid clipping
  const cx = 100
  const cy = 100
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xs mx-auto">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          {/* Track */}
          <circle cx={100} cy={100}
            r={radius}
            fill="none"
            stroke="#1A1A24"
            strokeWidth="12"
          />
          {/* Segments */}
          {QUADRANTS.map((q, i) => {
            const len = (q.pct / total) * circumference
            const seg = (
              <circle key={i} cx={100} cy={100}
                r={radius}
                fill="none"
                stroke={q.color}
                strokeWidth="12"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
          <p className="font-mono text-[9px] sm:text-[10px] text-text-secondary tracking-[0.25em] uppercase mb-1.5 leading-tight text-center">
            All<br/>Weather
          </p>
          <p className="font-display text-3xl sm:text-4xl text-text-primary font-bold leading-none mt-0.5">
            {total}%
          </p>
        </div>
      </div>'''

    dash = re.sub(ring_chart_old, ring_chart_new, dash)

    with open(dash_path, "w") as f:
        f.write(dash)
    print("Dashboard Target Allocation box upgraded and RingChart fixed!")
