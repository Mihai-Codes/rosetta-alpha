import os
import re

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Rewrote {path}")

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

# 1. DesksView: Remove blurry overlays and completely hide telemetry for unsigned users
desks_path = 'frontend/src/components/DesksView.tsx'
if os.path.exists(desks_path):
    with open(desks_path, 'r', encoding='utf-8') as f:
        d_content = f.read()
    
    # We want to find the section rendering telemetry and only render if isAuthed.
    # Let's cleanly replace the entire telemetry section if we can, or just use regex to strip out the overlays.
    d_content = re.sub(r'\{\!isAuthed && <div className="absolute inset-0 z-20 backdrop-blur-md.*?</div>\}', '', d_content, flags=re.DOTALL)
    
    # Remove the opacity-20 pointer-events-none classes
    d_content = d_content.replace('${!isAuthed ? \'opacity-20 pointer-events-none select-none blur-sm\' : \'\'}', '')
    d_content = d_content.replace('${!isAuthed ? \'opacity-20 pointer-events-none\' : \'\'}', '')
    
    # Hide the whole block if not isAuthed
    d_content = d_content.replace('{active && (', '{active && isAuthed && (')
    # If we accidentally created {active && isAuthed && isAuthed && ( ...
    d_content = d_content.replace('{active && isAuthed && isAuthed && (', '{active && isAuthed && (')
    
    with open(desks_path, 'w', encoding='utf-8') as f:
        f.write(d_content)

# 2. format.ts: US color to #4A90E2
replace_in_file('frontend/src/lib/format.ts', "color: 'var(--color-region-us)'", "color: '#4A90E2'")
replace_in_file('frontend/src/lib/format.ts', "color: '#FFFFFF'", "color: '#4A90E2'")

# 3. AllWeatherChart: Center text
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<div className="mb-4 shrink-0 w-full text-left border-b border-border/50 pb-4">',
    '<div className="mb-4 shrink-0 w-full text-center border-b border-border/50 pb-4">'
)

# 4. EllipseView: Center text
replace_in_file('frontend/src/components/EllipseView.tsx',
    '''<div className="flex items-start justify-between mb-4 px-4 pt-4 sm:px-6 shrink-0">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
          <p className="font-display text-lg text-text-primary">The Ellipse View</p>
        </div>
      </div>''',
    '''<div className="flex flex-col items-center justify-center text-center mb-4 px-4 pt-4 sm:px-6 shrink-0 border-b border-border/50 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-tertiary mb-2">Orbit Framework</p>
        <p className="font-display text-lg text-text-primary">The Ellipse View</p>
      </div>'''
)

# 5. Leaderboard sorting and Rank #2 color (bright silver: #E2E8F0)
for p in ['frontend/src/components/LeaderboardView.tsx', 'frontend/src/components/DashboardView.tsx']:
    replace_in_file(p, "t.rank === 2 ? 'text-text-secondary' :", "t.rank === 2 ? 'text-[#E2E8F0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-text-secondary' :", "row.rank === 2 ? 'text-[#E2E8F0]' :")
    replace_in_file(p, "t.rank === 2 ? 'text-[#C0C0C0]' :", "t.rank === 2 ? 'text-[#E2E8F0]' :")
    replace_in_file(p, "row.rank === 2 ? 'text-[#C0C0C0]' :", "row.rank === 2 ? 'text-[#E2E8F0]' :")
    # Fix the sorting map issue
    replace_in_file(p, "{TRADERS.slice(0, 3).map(t => (", "{sorted.slice(0, 3).map(t => (")
    # Tone down big font sizes for rank numbering
    replace_regex(p, r'font-display text-3xl font-bold text-text-tertiary', 'font-mono text-base font-semibold text-text-tertiary')
    replace_regex(p, r'font-display text-xl font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-lg font-bold', 'font-mono text-sm font-semibold')
    replace_regex(p, r'font-display text-[0-9xl]* font-bold', 'font-mono text-sm font-semibold')
    
# 6. Technical Text in CircleInfraPanel
ci_path = 'frontend/src/components/CircleInfraPanel.tsx'
replace_in_file(ci_path, 
    '''<span className="text-blue-400/70">gateway.deposit.finalized</span> / <span className="text-blue-400/70">mint.finalized</span> / <span className="text-blue-400/70">mint.forwarded</span>''',
    '''<span className="text-blue-400/70">Automated Deposits</span> / <span className="text-blue-400/70">Institutional Verification</span> / <span className="text-blue-400/70">On-chain Minting</span>'''
)
replace_in_file(ci_path,
    '''<span className="text-emerald-400/70 font-mono text-[10px] normal-case tracking-normal">/api/x402/agent-insight</span>''',
    '''<span className="text-emerald-400/70 font-mono text-[10px] uppercase tracking-widest">Secure Agent Intelligence API (x402-Protected)</span>'''
)

# 7. LiveFeedView Hover Area
lf_path = 'frontend/src/components/LiveFeedView.tsx'
if os.path.exists(lf_path):
    with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()
    
    # We want to make sure the entire item is hoverable
    old_feed_item = '''className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}'''
    new_feed_item = '''className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}'''
    lf_content = lf_content.replace(old_feed_item, new_feed_item)
    
    old_inner_div = '''<div 
                  className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >'''
    new_inner_div = '''<div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                <div className="w-full flex flex-col relative h-full pl-[3px]">'''
    lf_content = lf_content.replace(old_inner_div, new_inner_div)
    
    # Stop propagation on View Chain
    lf_content = lf_content.replace(
        'onClick={() => {\n                      if (!e.ipfs_thesis_cid) return',
        'onClick={(ev) => {\n                      ev.stopPropagation();\n                      if (!e.ipfs_thesis_cid) return'
    )
    with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)


