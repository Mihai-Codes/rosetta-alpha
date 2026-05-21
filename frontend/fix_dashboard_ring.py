import re

path = "src/components/DashboardView.tsx"
with open(path, "r") as f:
    dash = f.read()

# Increase radius and viewbox in Dashboard's RingChart
dash = re.sub(r'const radius = 72', 'const radius = 80', dash)
dash = re.sub(r'width="200" height="200" viewBox=\{`0 0 160 160`\}', 'width="200" height="200" viewBox={`0 0 200 200`}', dash)
dash = re.sub(r'width="180" height="180" viewBox=\{`0 0 180 180`\}', 'width="200" height="200" viewBox={`0 0 200 200`}', dash)
dash = re.sub(r'cx=\{cx\}', 'cx={100}', dash)
dash = re.sub(r'cy=\{cy\}', 'cy={100}', dash)
dash = re.sub(r'const cx = \d+', 'const cx = 100', dash)
dash = re.sub(r'const cy = \d+', 'const cy = 100', dash)

# Fix the center text
text_old = r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">\s*<p className="font-display text-xl sm:text-2xl text-text-primary font-light tracking-tight">\s*ALL WEATHER\s*</p>\s*<p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-0\.5">\s*Risk Parity\s*</p>\s*</div>'
text_new = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[14px] sm:text-base text-text-primary font-bold tracking-[0.15em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-brand-red mt-1.5">
            {total}% Div.
          </p>
        </div>'''
dash = re.sub(text_old, text_new, dash)

# In case it was the other text format:
text_old_2 = r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">\s*<p className="font-display text-3xl text-text-primary leading-none">\{total\}%</p>\s*<p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-1">Diversified</p>\s*</div>'
dash = re.sub(text_old_2, text_new, dash)

with open(path, "w") as f:
    f.write(dash)
print("Dashboard RingChart fixed!")
