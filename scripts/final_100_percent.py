import os

def replace_in_file(path, replacements):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f: f.write(content)
        print(f"Updated {path}")

# 1. SignInModal: Ensure the red line is extremely visible and buttons don't blend
replace_in_file('frontend/src/components/SignInModal.tsx', [
    ('className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-border border-l-[3px] border-l-brand-red bg-bg-secondary hover:bg-white/[0.04] text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 shadow-md"',
     'className="group relative w-full flex items-center justify-center gap-4 px-5 py-4 border border-white/10 border-l-[4px] border-l-brand-red bg-[#111111] hover:bg-[#1a1a1a] hover:border-white/30 text-text-primary text-[11px] font-mono uppercase tracking-[0.15em] transition-all duration-300 disabled:opacity-50 shadow-lg"')
])

# 2. Leaderboard: Make numbering less bold and fit better
replace_in_file('frontend/src/components/LeaderboardView.tsx', [
    ('font-display text-3xl font-bold text-text-tertiary', 'font-mono text-xl font-medium text-text-tertiary'),
    ('font-mono text-sm font-semibold text-text-tertiary', 'font-mono text-sm font-medium text-text-tertiary'),
    ('font-display text-xl font-bold', 'font-mono text-base font-semibold'),
    ('font-display text-lg font-bold', 'font-mono text-sm font-semibold')
])

# 3. EarnQuiz: Single line text
replace_in_file('frontend/src/components/EarnQuiz.tsx', [
    ('<p className="text-text-secondary text-xs leading-relaxed truncate w-full max-w-[400px] mx-auto">\\n            All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.\\n          </p>',
     '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap w-full text-center">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>')
])

# 4. Pricing: Entrance animation and one-line text
replace_in_file('frontend/src/app/pricing/page.tsx', [
    ('className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-4 duration-700"',
     'className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-16 pt-28 sm:pt-36 lg:pt-48 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"'),
    ('<p className="mt-4 w-full text-center truncate text-text-secondary text-sm">\\n            Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.\\n          </p>',
     '<p className="mt-4 w-full text-center whitespace-nowrap text-text-secondary text-sm">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>')
])

