import re
import os

path = "src/components/AllWeatherChart.tsx"
if os.path.exists(path):
    with open(path, "r") as f:
        content = f.read()
    
    # 1. Revert radius and sizing
    content = re.sub(r'const radius = \d+', 'const radius = 64', content)
    content = re.sub(r'width="\d+" height="\d+" viewBox="[^"]+"', 'width="180" height="180" viewBox="0 0 180 180"', content)
    content = re.sub(r'cx="\d+"\s*cy="\d+"', 'cx="90" cy="90"', content)
    
    # 2. Revert to the original center text
    text_pattern = r'<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">[\s\S]*?</div>'
    text_repl = r'''<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-display text-3xl text-text-primary leading-none">{total}%</p>
          <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary mt-1">Diversified</p>
        </div>'''
    content = re.sub(text_pattern, text_repl, content, flags=re.DOTALL)

    with open(path, "w") as f:
        f.write(content)
    print("AllWeatherChart reverted to original compact size.")
