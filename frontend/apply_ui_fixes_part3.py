import os
import re

def replace_in_file(filepath, old, new):
    with open(filepath, 'r') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Could not find exact string in {filepath}")

def regex_replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Regex updated {filepath}")
    else:
        print(f"No regex match in {filepath}")

# 1. Nav Bar Red Line
replace_in_file("src/components/Layout.tsx",
    "bg-bg-primary/85 backdrop-blur-md border-b border-white/[0.05] shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
    "bg-bg-primary/90 backdrop-blur-md border-b border-brand-red/30 shadow-[0_4px_30px_rgba(216,43,43,0.15)]"
)

# 2. Footer Spacing
replace_in_file("src/app/page.tsx",
    "pb-2 pt-12 sm:pt-16",
    "pb-12 pt-12 sm:pt-16"
)

# 3. Smooth Scroll Arrow & Enter Terminal button
regex_replace_in_file("src/components/HeroSection.tsx",
    r'<a href="#desks-section" onClick=\{onScrollDown\} className="(.*?)"(.*?)>(.*?)<\/a>',
    r'<button type="button" onClick={onScrollDown} className="\1"$2>\3</button>'
)

# 4. Reasoning Trace Corners
regex_replace_in_file("src/components/ReasoningExplorer.tsx", r'rounded-[a-z]+', 'rounded-none')
regex_replace_in_file("src/components/ReasoningExplorer.tsx", r'\brounded\b', 'rounded-none')

# 5. Survey Text Fit
replace_in_file("src/components/FeedbackSurvey.tsx", "w-[400px]", "w-[460px]")
replace_in_file("src/components/FeedbackSurvey.tsx", "feedback_survey_v7", "feedback_survey_v8")
regex_replace_in_file("src/components/FeedbackSurvey.tsx", 
    r'text-\[7px\] sm:text-\[8\.5px\] uppercase tracking-normal text-text-primary whitespace-nowrap',
    r'text-[8.5px] sm:text-[10px] uppercase tracking-normal text-text-primary whitespace-nowrap'
)

# 6. Wallet Copy State
wallet_path = "src/components/WalletButton.tsx"
with open(wallet_path, 'r') as f:
    wallet = f.read()

if "copiedAddress" not in wallet:
    wallet = wallet.replace(
        "const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)",
        "const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)\n  const [copiedAddress, setCopiedAddress] = React.useState(false)"
    )
    wallet = wallet.replace(
        "navigator.clipboard.writeText(address)\n      setDropdownOpen(false)",
        "navigator.clipboard.writeText(address)\n      setCopiedAddress(true)\n      setTimeout(() => { setCopiedAddress(false); setDropdownOpen(false); }, 1500)"
    )
    wallet = re.sub(
        r'<button\s*onClick=\{copyAddress\}\s*className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors"\s*>\s*Copy Address\s*<\/button>',
        r'<button onClick={copyAddress} className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors flex justify-between items-center"><span>{copiedAddress ? "Copied!" : "Copy Address"}</span>{copiedAddress && <span className="text-positive text-[10px]">✓</span>}</button>',
        wallet
    )
    with open(wallet_path, 'w') as f:
        f.write(wallet)
    print("WalletButton updated")

