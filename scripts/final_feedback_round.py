import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

def replace_regex(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# 1. ThesisCard: Make Reasoning Chain breathable and much more readable
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<ol className="space-y-12 sm:space-y-16">',
    '<ol className="space-y-8 sm:space-y-12">'
)
# Redesign the desktop reasoning block to look like a premium institutional card
old_desktop_block = '''      {/* Desktop: always expanded */}
      <div
        className="hidden md:block pl-12 pr-8 pb-6"
        style={{ borderLeft: `2px solid ${meta.color}30` }}
      >
        <span
          className="absolute -left-[13px] top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary"
          style={{ color: meta.color, border: `1px solid ${meta.color}80` }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: meta.color }}>
            {role}
          </p>
          {block.language && block.language !== 'en' && (
            <span className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary border border-border px-2 py-0.5">
              {block.language.toUpperCase()}
            </span>
          )}
        </div>
        <BlockContent block={block} meta={meta} />
      </div>'''

new_desktop_block = '''      {/* Desktop: always expanded */}
      <div
        className="hidden md:block bg-bg-secondary/40 border border-white/5 p-6 ml-6 mb-8 rounded-lg relative"
        style={{ borderLeft: `3px solid ${meta.color}` }}
      >
        <span
          className="absolute -left-[14px] top-6 w-6 h-6 flex items-center justify-center font-mono text-[10px] bg-bg-primary"
          style={{ color: meta.color, border: `1px solid ${meta.color}80` }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.25em]" style={{ color: meta.color }}>
            {role}
          </p>
          {block.language && block.language !== 'en' && (
            <span className="text-[10px] uppercase tracking-[0.25em] text-text-secondary border border-white/10 bg-white/5 px-2 py-1">
              {block.language.toUpperCase()}
            </span>
          )}
        </div>
        <BlockContent block={block} meta={meta} />
      </div>'''
replace_in_file('frontend/src/components/ThesisCard.tsx', old_desktop_block, new_desktop_block)

replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-[14px] text-text-tertiary mb-6 font-light italic leading-relaxed">',
    '<p className="text-[14px] text-text-secondary mb-6 font-mono leading-relaxed bg-bg-primary p-4 border border-white/5">'
)
replace_in_file('frontend/src/components/ThesisCard.tsx',
    '<p className="text-base text-text-primary font-light leading-[2.2] mb-6 text-justify">',
    '<p className="text-[16px] text-text-primary font-light leading-[1.8] mb-8 text-justify">'
)

# 2. DesksView: Widen the chart view so the text natively fits on one line
replace_in_file('frontend/src/components/DesksView.tsx',
    'className="hidden lg:flex flex-col w-[420px] xl:w-[460px] shrink-0 solid-panel rounded-none border overflow-hidden"',
    'className="hidden lg:flex flex-col w-[460px] xl:w-[520px] shrink-0 solid-panel rounded-none border overflow-hidden"'
)

# 3. AllWeatherChart: Center text completely and remove truncation
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[9px\] sm:text-\[10px\] text-text-secondary font-mono opacity-80 truncate">\{q\.assets\.join\(.*?\)\}<\/p>',
    '<p className="text-[10px] sm:text-[11px] text-text-secondary font-mono opacity-90 whitespace-normal">{q.assets.join(\', \')}</p>'
)
replace_regex('frontend/src/components/AllWeatherChart.tsx',
    r'<p className="text-\[10px\] text-text-secondary font-mono opacity-80 truncate">\{q\.assets\.join\(.*?\)\}<\/p>',
    '<p className="text-[11px] text-text-secondary font-mono opacity-90 whitespace-normal">{q.assets.join(\', \')}</p>'
)

# 4. Rank #2 Silver Color & Shuffled Leaderboard Data (so sorting visually triggers changes)
for p in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    replace_in_file(p, "text-[#C0C0C0]", "text-[#E5E7EB]") # Brighter, premium silver
    
    # Shuffle TRADERS data in LeaderboardView
    if p.endswith('LeaderboardView.tsx'):
        replace_in_file(p,
            "{ rank: 2,  address: '0x3E7d...2B1a', label: 'satoshi99',    correct: 45, total: 50, earned: 20.5, arcTxCount: 41, streak: 5,   },",
            "{ rank: 2,  address: '0x3E7d...2B1a', label: 'satoshi99',    correct: 41, total: 50, earned: 18.0, arcTxCount: 41, streak: 2,   },"
        )
        replace_in_file(p,
            "{ rank: 3,  address: '0xF4c8...6D0e', label: 'dalio.arc',    correct: 38, total: 47, earned: 19.0, arcTxCount: 38, streak: 4,   },",
            "{ rank: 3,  address: '0xF4c8...6D0e', label: 'dalio.arc',    correct: 38, total: 47, earned: 21.0, arcTxCount: 38, streak: 6,   },"
        )
        replace_in_file(p,
            "{ rank: 4,  address: '0x8B2f...1C7d',                         correct: 44, total: 44, earned: 17.0, arcTxCount: 34, streak: 12  },",
            "{ rank: 4,  address: '0x8B2f...1C7d',                         correct: 44, total: 44, earned: 15.0, arcTxCount: 34, streak: 12  },"
        )

    # Shuffle AGENT_LEADERBOARD data in DashboardView
    if p.endswith('DashboardView.tsx'):
        replace_in_file(p,
            "{ rank: 2, agent: 'Nexus-AI',     region: 'United States',   accuracy: 87, theses: 198, streak: 8 },",
            "{ rank: 2, agent: 'Nexus-AI',     region: 'United States',   accuracy: 87, theses: 210, streak: 3 },"
        )
        replace_in_file(p,
            "{ rank: 3, agent: 'Dragon-9',     region: 'China',           accuracy: 84, theses: 256, streak: 5 },",
            "{ rank: 3, agent: 'Dragon-9',     region: 'China',           accuracy: 84, theses: 150, streak: 9 },"
        )

# 5. PricingPage: Intro Effect Parity
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''<div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">''',
    '''<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48">'''
)
replace_in_file('frontend/src/app/pricing/page.tsx',
    '''        {/* x402 Callout */}''',
    '''      </motion.div>
        {/* x402 Callout */}'''
)

# 6. CircleInfraPanel: One liner
replace_in_file('frontend/src/components/CircleInfraPanel.tsx',
    '''<p className="text-[9px] text-text-tertiary uppercase tracking-widest leading-relaxed whitespace-nowrap overflow-visible">
                  Subscribed Events: <span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>
                </p>''',
    '''<div className="flex items-center gap-2 whitespace-nowrap overflow-visible">
                  <span className="text-[9px] text-text-tertiary uppercase tracking-widest">Subscribed Events:</span>
                  <span className="text-[9px] text-blue-400/70 uppercase tracking-widest">Automated Deposits / Institutional Verification / On-chain Minting</span>
                </div>'''
)

# 7. LiveFeedView: True flex full-card hover
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    
    # We will entirely rewrite the wrapper to use flex row
    old_wrapper_start = '''              <div
                key={key}
                className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                <div className="w-full flex flex-col relative h-full pl-[3px]">
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''
                  
    new_wrapper_start = '''              <div
                key={key}
                className={`flex w-full border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div className="w-[3px] shrink-0" style={{ backgroundColor: meta.color }} />
                <div className="flex-1 min-w-0 flex flex-col relative py-4 sm:py-5">
                  <div className="px-4 sm:px-5 flex items-start gap-3 sm:gap-4 pb-2 text-left min-h-[44px]">'''
    
    lf_content = lf_content.replace(old_wrapper_start, new_wrapper_start)
    
    # And fix the bottom padding of the feed item
    old_wrapper_end = '''                <div className="px-4 sm:px-5 pb-4 flex justify-end relative z-10">'''
    new_wrapper_end = '''                <div className="px-4 sm:px-5 flex justify-end relative z-10 mt-2">'''
    lf_content = lf_content.replace(old_wrapper_end, new_wrapper_end)
    
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)
    print("Updated LiveFeedView hover.")

