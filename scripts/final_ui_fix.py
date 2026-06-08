import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. LiveFeedView: True full top-to-bottom hover including border
lf_path = 'frontend/src/components/LiveFeedView.tsx'
with open(lf_path, 'r', encoding='utf-8') as f: lf_content = f.read()

old_feed_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-bg-tertiary cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div 
                  className="w-full flex flex-col relative h-full transition-colors duration-200 group-hover:bg-bg-tertiary"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''

new_feed_item = '''              <div
                key={key}
                className={`relative border-b border-border last:border-b-0 transition-colors duration-200 group hover:bg-white/[0.03] cursor-pointer ${i === 0 ? 'bg-white/[0.01]' : ''}`}
                onClick={() => toggleExpand(key, e.desk, e.ticker)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: meta.color }} />
                <div className="w-full flex flex-col relative h-full pl-[3px]">
                  <div className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-2 text-left min-h-[44px]">'''

lf_content = lf_content.replace(old_feed_item, new_feed_item)

old_feed_btn = '''className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"'''
new_feed_btn = '''className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return
                      setSelectedProvenance(e)
                    }}'''
# Clean up duplicate onClicks if they exist
lf_content = re.sub(r'onClick=\{\(ev\) => \{[\s\S]*?\}\}', '', lf_content)
lf_content = lf_content.replace(
    'className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"',
    '''onClick={(ev) => {
                      ev.stopPropagation();
                      if (!e.ipfs_thesis_cid) return
                      setSelectedProvenance(e)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[10px] uppercase tracking-[0.2em]"'''
)

with open(lf_path, 'w', encoding='utf-8') as f: f.write(lf_content)
print("Updated LiveFeedView hover.")


# 2. MobMeter & DivergenceGauge styling enhancements
# Ensure they look like highly polished institutional quantitative panels
replace_in_file('frontend/src/components/MobMeter.tsx',
    '''<div className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden flex flex-col justify-between h-full w-full ${compact ? 'p-4' : 'p-6'}`}>''',
    '''<div className={`solid-panel border border-border bg-bg-secondary relative overflow-hidden flex flex-col justify-between h-full w-full max-w-md mx-auto ${compact ? 'p-4' : 'p-6'}`}>'''
)
replace_in_file('frontend/src/components/DivergenceGauge.tsx',
    '''className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full w-full max-w-md mx-auto"''',
    '''className="solid-panel border border-border bg-bg-secondary p-6 relative flex flex-col justify-between h-full w-full max-w-md mx-auto"''' # Ensure it's correct
)

# 3. Fix the circle/matrix button active states in DesksView
replace_in_file('frontend/src/components/DesksView.tsx',
    '''<button onClick={() => setChartView('matrix')} className={`px-3 py-1 text-[10px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Matrix View</button>
            <button onClick={() => setChartView('ellipse')} className={`px-3 py-1 text-[10px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>''',
    '''<button onClick={() => setChartView('matrix')} className={`px-4 py-1.5 text-[10px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Matrix View</button>
            <button onClick={() => setChartView('ellipse')} className={`px-4 py-1.5 text-[10px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>'''
)
replace_in_file('frontend/src/components/DesksView.tsx',
    '''<button onClick={() => setChartView('matrix')} className={`flex-1 px-2 py-1.5 text-[9px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Matrix View</button>
            <button onClick={() => setChartView('ellipse')} className={`flex-1 px-2 py-1.5 text-[9px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>''',
    '''<button onClick={() => setChartView('matrix')} className={`flex-1 px-3 py-1.5 text-[10px] uppercase tracking-wider border ${chartView === 'matrix' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Matrix View</button>
            <button onClick={() => setChartView('ellipse')} className={`flex-1 px-3 py-1.5 text-[10px] uppercase tracking-wider border ${chartView === 'ellipse' ? 'border-brand-red text-brand-red bg-brand-red/10' : 'border-border text-text-tertiary hover:text-text-primary'}`}>Ellipse View</button>'''
)

