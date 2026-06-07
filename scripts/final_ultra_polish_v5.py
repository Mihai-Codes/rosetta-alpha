import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")
    else:
        print(f"String not found in {path}: {old[:50]}...")

def replace_regex_in_file(path, pattern, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    new_content = re.sub(pattern, new, content)
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f: f.write(new_content)
        print(f"Updated (Regex) {path}")

# 3. AllWeatherChart: Fix truncating issue and text width
# Fixing the python string interpolation issue
replace_in_file('frontend/src/components/AllWeatherChart.tsx', 
    '<p className="text-[8px] sm:text-[9px] text-text-secondary font-mono opacity-80 truncate">{q.assets.join(\', \')}</p>',
    '<p className="text-[9px] sm:text-[10px] text-text-secondary font-mono opacity-80">{q.assets.join(\', \')}</p>'
)
replace_in_file('frontend/src/components/AllWeatherChart.tsx',
    '<p className="text-[9px] text-text-tertiary leading-relaxed mx-auto text-center">',
    '<p className="text-[10px] text-text-tertiary whitespace-nowrap w-full text-center">'
)

# 4. DashboardView: Agent Leaderboard sizing & Historical Signal text
replace_in_file('frontend/src/components/DashboardView.tsx',
    'font-display text-lg font-bold',
    'font-mono text-sm font-semibold'
)
replace_in_file('frontend/src/components/DashboardView.tsx',
    'font-display text-xl font-bold',
    'font-mono text-sm font-semibold'
)
replace_in_file('frontend/src/components/DashboardView.tsx',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <p className="font-display text-2xl text-text-primary leading-tight">
            Extreme agreement is treated as a reversal-risk warning, not confirmation.
          </p>
          <p className="text-[11px] text-text-tertiary leading-relaxed mt-4">
            Backtest hooks are ready for rosetta_dataset.jsonl; live calibration updates after Arc settlements.
          </p>
        </div>''',
    '''        <div className="bg-bg-primary p-6 sm:p-8 flex flex-col justify-center text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary mb-4">
            Historical Signal
          </p>
          <div className="p-5 border border-warning/20 bg-warning/5 rounded mb-5">
             <p className="font-mono text-sm font-bold text-warning leading-tight uppercase tracking-wider">
               Extreme agreement is treated as a reversal-risk warning, not confirmation.
             </p>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed border-l-[3px] border-border pl-4">
            Backtest hooks are ready for rosetta_dataset.jsonl. Live calibration updates after Arc settlements.
          </p>
        </div>'''
)

# 5. LiveFeedView: Fix hover structure (top-to-bottom hover including 'View Chain')
lf_path = 'frontend/src/components/LiveFeedView.tsx'
with open(lf_path, 'r', encoding='utf-8') as f:
    lf_content = f.read()

# Make the entire block a hoverable group so 'View Chain' inherits the hover background
old_feed_item = '''              <div
                key={key}
                className={`border-b border-border last:border-b-0 transition-all duration-300 group ${i === 0 ? 'animate-[pulse_2s_ease-in-out_infinite] bg-white/[0.02]' : ''}`}
              >
                <div 
                  className="w-full flex flex-col hover:bg-white/[0.03] transition-colors relative"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <button
                    onClick={() => toggleExpand(key, e.desk, e.ticker)}
                    className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 text-left min-h-[44px]"
                  >'''

new_feed_item = '''              <div
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

lf_content = lf_content.replace(old_feed_item, new_feed_item)

with open(lf_path, 'w', encoding='utf-8') as f:
    f.write(lf_content)
print("Updated LiveFeedView.tsx hover states")

# 6. PricingPage: Add Stripe Crypto button
pricing_path = 'frontend/src/app/pricing/page.tsx'
with open(pricing_path, 'r', encoding='utf-8') as f: p_content = f.read()

stripe_btn = '''      </button>
      {price > 0 && (
        <button
          onClick={() => {}}
          className="mt-3 w-full rounded-md py-3 text-sm font-semibold transition-colors border border-border text-text-primary hover:bg-bg-primary"
        >
          Pay with Card (Stripe Crypto)
        </button>
      )}
    </div>
  )
}'''
p_content = p_content.replace('      </button>\n    </div>\n  )\n}', stripe_btn)
with open(pricing_path, 'w', encoding='utf-8') as f: f.write(p_content)
print("Updated PricingPage.tsx with Stripe button")

# 7. REMOVE EMOJIS! (Roasting the platform)
def remove_emojis():
    # DeskCard & ThesisCard
    replace_in_file('frontend/src/components/DeskCard.tsx', '⚔️ Debated', 'DEBATED')
    replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debated', 'DEBATED')
    replace_in_file('frontend/src/components/ThesisCard.tsx', '⚔️ Debate Summary', 'DEBATE SUMMARY')
    
    # LeaderboardView
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🏆'", '')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🥈'", '')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', "badge: '🥉'", '')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'\{trader\.badge \?\? `#\$\{trader\.rank\}`\}', '#{trader.rank}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'\{t\.badge \?\? `#\$\{t\.rank\}`\}', '#{t.rank}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'🔥 \{t\.streak\}', 'STREAK: {t.streak}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'🔥 \{row\.streak\} streak', 'STREAK: {row.streak}')
    replace_regex_in_file('frontend/src/components/LeaderboardView.tsx', r'🔥 \{row\.streak\}', 'STREAK: {row.streak}')
    replace_in_file('frontend/src/components/LeaderboardView.tsx', '<p className="text-2xl">{trader.badge}</p>', '')
    
    # DashboardView
    replace_regex_in_file('frontend/src/components/DashboardView.tsx', r'🔥 \{row\.streak\}', 'STREAK: {row.streak}')
    replace_regex_in_file('frontend/src/components/DashboardView.tsx', r'🔥 \{row\.streak\} streak', 'STREAK: {row.streak}')
    
    # LiveFeedView
    replace_in_file('frontend/src/components/LiveFeedView.tsx', '⚠️ High Divergence (≥40)', 'HIGH DIVERGENCE (≥40)')
    
    # ShareButton
    replace_regex_in_file('frontend/src/components/ShareButton.tsx', r'🤖 Rosetta Alpha just flagged this:', '[SYSTEM ALERT] Rosetta Alpha flagged:')
    replace_regex_in_file('frontend/src/components/ShareButton.tsx', r'📊 Verified on Arc Testnet', '[VERIFIED ON ARC L1]')
    replace_regex_in_file('frontend/src/components/ShareButton.tsx', r'🔗 https', 'URL: https')
    
    # OnboardingModal
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🌐'", "icon: '1'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '🔗'", "icon: '2'")
    replace_in_file('frontend/src/components/OnboardingModal.tsx', "icon: '💰'", "icon: '3'")

remove_emojis()

