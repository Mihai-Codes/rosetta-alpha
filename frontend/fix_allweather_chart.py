import re
import os

path = "src/components/AllWeatherChart.tsx"
if os.path.exists(path):
    with open(path, "r") as f:
        awc = f.read()
    
    # Increase radius and viewbox to prevent clipping
    awc = re.sub(r'const radius = 64', 'const radius = 80', awc)
    awc = re.sub(r'width="180" height="180" viewBox="0 0 180 180"', 'width="200" height="200" viewBox="0 0 200 200"', awc)
    awc = re.sub(r'width="180" height="180" viewBox={`0 0 180 180`}', 'width="200" height="200" viewBox={`0 0 200 200`}', awc)
    awc = re.sub(r'cx="90"', 'cx="100"', awc)
    awc = re.sub(r'cy="90"', 'cy="100"', awc)
    
    # Redesign the center text
    text_old = r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">\s*<p className="font-display text-3xl text-text-primary leading-none">\{total\}%</p>\s*<p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-1">Diversified</p>\s*</div>'
    text_new = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[14px] sm:text-base text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red mt-1.5">
            {total}% Div.
          </p>
        </div>'''
    awc = re.sub(text_old, text_new, awc)
    
    with open(path, "w") as f:
        f.write(awc)
    print("AllWeatherChart fixed!")
else:
    print(f"{path} not found!")

