import re
import os

# 1. Fix Dashboard Ring Chart
dash_path = "src/components/DashboardView.tsx"
if os.path.exists(dash_path):
    with open(dash_path, "r") as f:
        dash = f.read()

    dash_old = r'<div className="relative z-10 flex flex-col items-center justify-center pointer-events-none mt-1">[\s\S]*?</div>'
    dash_new = r'''<div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[10px] text-text-secondary tracking-[0.2em] uppercase mb-1 pl-[0.2em]">
            All Weather
          </p>
          <p className="font-display text-4xl text-text-primary font-bold leading-none" style={{ transform: 'translateX(3px)' }}>
            {total}%
          </p>
        </div>'''
    
    dash = re.sub(dash_old, dash_new, dash)
    with open(dash_path, "w") as f:
        f.write(dash)
    print("Dashboard RingChart perfectly centered!")

# 2. Fix AllWeatherChart (Desks Page)
awc_path = "src/components/AllWeatherChart.tsx"
if os.path.exists(awc_path):
    with open(awc_path, "r") as f:
        awc = f.read()

    awc_old = r'<div className="relative z-10 flex flex-col items-center justify-center pointer-events-none mt-1">[\s\S]*?</div>'
    awc_new = r'''<div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-xs sm:text-sm text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight mb-1.5 pl-[0.15em]">
            All Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red pl-[0.25em]" style={{ transform: 'translateX(2px)' }}>
            {total}% Div.
          </p>
        </div>'''
    
    awc = re.sub(awc_old, awc_new, awc)
    with open(awc_path, "w") as f:
        f.write(awc)
    print("AllWeatherChart perfectly centered!")

