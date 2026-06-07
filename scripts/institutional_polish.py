import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")
    else:
        print(f"String not found in {path}")

# 1. AllWeatherChart: Fix truncation (remove truncate class) and text layout
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<p className="text-[8px] sm:text-[9px] text-text-secondary font-mono opacity-80 truncate">{q.assets.join(', ')}</p>',
    '<p className="text-[8px] sm:text-[9px] text-text-secondary font-mono opacity-80">{q.assets.join(', ')}</p>'
)

# 2. DesksView: Elongate the chart container to fit the text on one line
replace_in_file('frontend/src/components/DesksView.tsx',
    'className="hidden lg:flex flex-col w-[300px] xl:w-[320px] shrink-0 solid-panel rounded-none border overflow-hidden"',
    'className="hidden lg:flex flex-col w-[380px] xl:w-[420px] shrink-0 solid-panel rounded-none border overflow-hidden"'
)

# 3. DashboardView: Redesign Historical Signal Layout
replace_in_file('frontend/src/components/DashboardView.tsx',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <div className="p-5 border border-warning/20 bg-warning/5 rounded-none mb-5">
             <p className="font-mono text-xs sm:text-sm font-bold text-warning leading-relaxed uppercase tracking-wider text-justify">
               Extreme agreement is treated as a reversal-risk warning, not confirmation.
             </p>
          </div>
          <p className="text-[10px] sm:text-[11px] text-text-secondary leading-relaxed border-l-[3px] border-border-strong pl-4 text-justify">
            Backtest hooks are ready for rosetta_dataset.jsonl. Live calibration updates after Arc settlements.
          </p>
        </div>''',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left border-l border-border/60">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 bg-brand-red rounded-full" />
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary">
              Historical Signal Engine
            </p>
          </div>
          <p className="font-display text-2xl text-text-primary leading-snug mb-4">
            Extreme agreement is a <span className="text-brand-red">reversal-risk</span> warning, not confirmation.
          </p>
          <p className="text-xs text-text-secondary font-mono leading-relaxed border-l-[2px] border-border-strong pl-4">
            Backtest hooks ready for rosetta_dataset.jsonl. Live calibration updates post-Arc settlement.
          </p>
        </div>'''
)

# 4. LeaderboardView: Fix rank numbering size to be normal
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'font-mono text-xl font-medium text-text-tertiary',
    'font-mono text-sm font-semibold text-text-tertiary'
)
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'font-mono text-base font-semibold text-text-tertiary',
    'font-mono text-sm font-semibold text-text-tertiary'
)

# 5. LiveFeedView: Fix the hover to encompass the entire component (top to bottom)
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    
    old_feed = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-all duration-300 group ${i === 0 ? 'animate-[pulse_2s_ease-in-out_infinite] bg-white/[0.02]' : ''}`}
              >
                <div 
                  className="w-full flex flex-col hover:bg-white/[0.03] transition-colors relative"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <button
                    onClick={() => toggleExpand(key, e.desk, e.ticker)}
                    className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]"
                  >'''
    
    new_feed = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div 
                  className="w-full flex flex-col relative h-full"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''
    
    lf_content = lf_content.replace(old_feed, new_feed)
    
    # Fix the closing tags and button structure for the feed item
    old_button_close = '''                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary shrink-0 mt-0.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className="px-4 sm:px-5 pb-4 flex justify-end">'''
    
    new_button_close = '''                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary shrink-0 mt-0.5 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                <div className="px-4 sm:px-5 pb-4 flex justify-end relative z-10">'''
                
    lf_content = lf_content.replace(old_button_close, new_button_close)
    
    # Ensure View Chain button stops propagation
    lf_content = lf_content.replace(
        'onClick={() => {',
        'onClick={(ev) => {\n                      ev.stopPropagation();'
    )
    
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)
    print("Updated LiveFeedView.tsx hover box")

# 6. Remove childish animations (animate-rain, animate-levitate)
def remove_animations(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f: content = f.read()
                orig = content
                content = content.replace(' animate-rain', '')
                content = content.replace('animate-rain ', '')
                content = content.replace(' animate-levitate', '')
                content = content.replace('animate-levitate ', '')
                if content != orig:
                    with open(path, 'w', encoding='utf-8') as f: f.write(content)
                    print(f"Removed animations from {path}")

remove_animations('frontend/src/components')
remove_animations('frontend/src/app')

