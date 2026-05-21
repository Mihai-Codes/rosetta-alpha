import re

# 1. FIX DESKSVIEW BUILD ERROR
with open("src/components/DesksView.tsx", "r") as f:
    desks = f.read()

# Replace the mismatched </div> with </motion.div> for the tablet chart
desks = re.sub(
    r'<motion\.div([^>]*)className="hidden md:block lg:hidden w-full  solid-panel rounded-none border overflow-hidden mt-2">\s*<AllWeatherChart />\s*</div>',
    r'<motion.div\1className="hidden md:block lg:hidden w-full solid-panel rounded-none border overflow-hidden mt-2">\n        <AllWeatherChart />\n      </motion.div>',
    desks
)
with open("src/components/DesksView.tsx", "w") as f:
    f.write(desks)
print("DesksView syntax fixed!")

# 2. DASHBOARD RING CHART & LOCK FIXES
with open("src/components/DashboardView.tsx", "r") as f:
    dash = f.read()

# Fix the lock screen right box
dash_locked_old = r'''<div className="bg-\[#050505\] p-6 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <p className="text-\[10px\] font-medium uppercase tracking-\[0\.3em\] text-text-tertiary">
              Target Allocation
            </p>
            <span className="flex items-center gap-1\.5 px-2 py-1 bg-brand-red/10 border border-brand-red/20 text-brand-red text-\[9px\] uppercase tracking-\[0\.2em\]">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
          
          <div className="opacity-40 grayscale pointer-events-none transition-all duration-700 hover:grayscale-0 hover:opacity-100">
            <RingChart />
          </div>
          
          <div className="mt-12 space-y-4">
            <div className="h-px w-full bg-border/50" />
            <div className="flex justify-between items-center">
              <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-\[11px\] text-text-tertiary">-- USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-\[11px\] text-text-tertiary">-- %</span>
            </div>
          </div>
        </div>'''

dash_locked_new = r'''<div className="bg-[#050505] p-6 sm:p-10 flex flex-col relative overflow-hidden border-l border-border/60">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/80 to-transparent opacity-60" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red/50" />
              Target Allocation
            </p>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#111111] border border-border text-text-secondary text-[9px] uppercase tracking-[0.2em] shadow-glow-red">
              <span className="w-1.5 h-1.5 bg-brand-red animate-pulse rounded-none" /> Encrypted
            </span>
          </div>
          
          <div className="relative z-10 opacity-10 grayscale pointer-events-none transition-all duration-700 blur-[4px]">
            <RingChart />
          </div>
          
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex flex-col items-center gap-3">
               <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand-red bg-bg-primary/90 px-4 py-2 border border-brand-red/20 backdrop-blur-sm shadow-glow-red flex items-center gap-2">
                 <span className="w-1.5 h-3 bg-brand-red animate-pulse" />
                 Awaiting Decryption
               </span>
            </div>
          </div>
          
          <div className="mt-10 space-y-4 relative z-10">
            <div className="h-px w-full bg-border/50" />
            <div className="flex justify-between items-center opacity-30">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-[1px]">████ USDC</span>
            </div>
            <div className="flex justify-between items-center opacity-30">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-[1px]">██.█%</span>
            </div>
          </div>
        </div>'''
dash = re.sub(dash_locked_old, dash_locked_new, dash)

# Fix Dashboard RingChart size
dash = re.sub(r'const radius = 72', 'const radius = 94', dash)
dash = re.sub(r'const cx = 90\s*const cy = 90', 'const cx = 110\n  const cy = 110', dash)
dash = re.sub(r'const cx = 80\s*const cy = 80', 'const cx = 110\n  const cy = 110', dash)
dash = re.sub(r'width="180" height="180" viewBox={`0 0 180 180`}', 'width="220" height="220" viewBox={`0 0 220 220`}', dash)
dash = re.sub(r'width="200" height="200" viewBox={`0 0 160 160`}', 'width="220" height="220" viewBox={`0 0 220 220`}', dash)
dash = re.sub(
    r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">\s*<p className="font-display text-3xl text-text-primary leading-none">\{total\}%</p>\s*<p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-1">Diversified</p>\s*</div>',
    r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-sm sm:text-base text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red mt-1.5">
            Risk Parity
          </p>
        </div>''', dash)
dash = re.sub(
    r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">\s*<p className="font-display text-xl sm:text-2xl text-text-primary font-light tracking-tight">\s*ALL WEATHER\s*</p>\s*<p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-0\.5">\s*Risk Parity\s*</p>\s*</div>',
    r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-sm sm:text-base text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red mt-1.5">
            Risk Parity
          </p>
        </div>''', dash)

with open("src/components/DashboardView.tsx", "w") as f:
    f.write(dash)
print("DashboardView fixed!")

# 3. FIX ALLWEATHERCHART.TSX (The one on the Desks page)
if os.path.exists("src/components/AllWeatherChart.tsx"):
    with open("src/components/AllWeatherChart.tsx", "r") as f:
        awc = f.read()
    awc = re.sub(r'const radius = 64', 'const radius = 80', awc)
    awc = re.sub(r'width="180" height="180" viewBox="0 0 180 180"', 'width="200" height="200" viewBox="0 0 200 200"', awc)
    awc = re.sub(r'cx="90"\s*cy="90"', 'cx="100" cy="100"', awc)
    awc = re.sub(
        r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">\s*<p className="font-display text-3xl text-text-primary leading-none">\{total\}%</p>\s*<p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-1">Diversified</p>\s*</div>',
        r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-base text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red mt-1.5">
            {total}% Diver.
          </p>
        </div>''', awc)
    with open("src/components/AllWeatherChart.tsx", "w") as f:
        f.write(awc)
    print("AllWeatherChart fixed!")
