import os

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# 1. EarnQuiz: Guarantee single line for the success text
replace_in_file('frontend/src/components/EarnQuiz.tsx',
    '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-visible w-full text-center">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>',
    '<p className="text-text-secondary text-xs leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis w-full text-center block max-w-full">All {total}/{total} correct. Your USDC has been sent to the Arc Testnet pool.</p>'
)

# 2. Pricing: Ensure entrance animation and one-line text
replace_in_file('frontend/src/app/pricing/page.tsx',
    '<p className="mt-4 w-full text-center whitespace-nowrap overflow-visible text-text-secondary text-sm">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>',
    '<p className="mt-4 w-full text-center whitespace-nowrap overflow-hidden text-ellipsis text-text-secondary text-sm block max-w-full">Five AI agents. Five regional desks. All reasoning hashed on-chain. Choose how deep you want to go.</p>'
)

# 3. Leaderboard: Make numbering smaller
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'font-display text-3xl font-bold text-text-tertiary',
    'font-mono text-base font-semibold text-text-tertiary'
)
replace_in_file('frontend/src/components/LeaderboardView.tsx',
    'font-mono text-xl font-medium text-text-tertiary',
    'font-mono text-base font-semibold text-text-tertiary'
)

