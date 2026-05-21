import os
import re

def update_file(path, old, new):
    with open(path, 'r') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"NOT FOUND in {path}")

def update_regex(path, pattern, repl):
    with open(path, 'r') as f:
        content = f.read()
    new_content = re.sub(pattern, repl, content)
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Regex updated {path}")
    else:
        print(f"Regex NOT FOUND in {path}")

# 1. Thesis Card Footer Symmetry (IPFS left, Arc L1 right)
thesis_card_path = "src/components/ThesisCard.tsx"
with open(thesis_card_path, 'r') as f:
    tc = f.read()
tc = re.sub(r'<div className="flex items-center justify-between w-full gap-2">', 
            '<div className="flex flex-row items-center justify-between w-full">', tc)
tc = re.sub(r'<div className="flex items-center gap-1.5">',
            '<div className="flex items-center gap-1.5 shrink-0">', tc)
with open(thesis_card_path, 'w') as f:
    f.write(tc)

# 2. Desks to Footer spacing (closer, but not touching)
update_regex("src/app/page.tsx", r'pb-0 pt-10 sm:pt-12', 'pb-8 pt-10 sm:pt-12')
update_regex("src/app/page.tsx", r'pb-2 pt-12 sm:pt-16', 'pb-8 pt-10 sm:pt-12')

# 3. Nav Bar Red Line
update_regex("src/components/Layout.tsx", 
             r'bg-transparent border-b border-transparent', 
             'bg-transparent border-b border-brand-red/20 shadow-[0_4px_30px_rgba(216,43,43,0.05)]')
update_regex("src/components/Layout.tsx", 
             r'bg-bg-primary/85 backdrop-blur-md border-b border-white/\[0\.05\] shadow-\[0_4px_30px_rgba\(0,0,0,0\.5\)\]', 
             'bg-bg-primary/90 backdrop-blur-md border-b border-brand-red/50 shadow-[0_4px_30px_rgba(216,43,43,0.3)]')

# 4. Remove Hero Arrow completely
update_regex("src/components/HeroSection.tsx", r'<button[^>]*><ArrowDown className="w-5 h-5" /></button>', '')
update_regex("src/components/HeroSection.tsx", r'<a[^>]*><ArrowDown className="w-5 h-5" /></a>', '')
update_regex("src/components/HeroSection.tsx", r'<div className="mt-12 sm:mt-16 flex justify-center">\s*</div>', '')
update_regex("src/components/HeroSection.tsx", r'<div className="mt-6 sm:mt-8 flex justify-center">\s*</div>', '')

# 5. Reasoning Explorer Corners (ensure top is squared)
update_regex("src/components/ReasoningExplorer.tsx", r'rounded-lg', 'rounded-none')
update_regex("src/components/ReasoningExplorer.tsx", r'rounded-md', 'rounded-none')
update_regex("src/components/ReasoningExplorer.tsx", r'rounded-xl', 'rounded-none')
update_regex("src/components/ReasoningExplorer.tsx", r'rounded-sm', 'rounded-none')
update_regex("src/components/ReasoningExplorer.tsx", r'\brounded\b', 'rounded-none')

# 6. Survey text truncation
survey_path = "src/components/FeedbackSurvey.tsx"
with open(survey_path, 'r') as f:
    survey = f.read()
survey = re.sub(r'text-\[9px\] sm:text-\[9\.5px\] uppercase tracking-normal text-text-primary whitespace-nowrap overflow-hidden text-ellipsis',
                r'text-[8px] sm:text-[9px] uppercase tracking-normal text-text-primary whitespace-normal leading-tight', survey)
survey = re.sub(r'text-\[9px\] sm:text-\[10px\] uppercase tracking-normal text-text-primary',
                r'text-[8px] sm:text-[9px] uppercase tracking-normal text-text-primary whitespace-normal leading-tight', survey)
survey = re.sub(r'text-\[8\.5px\] sm:text-\[9\.5px\] uppercase tracking-normal text-text-primary',
                r'text-[8px] sm:text-[9px] uppercase tracking-normal text-text-primary whitespace-normal leading-tight', survey)
with open(survey_path, 'w') as f:
    f.write(survey)

# 7. Wallet Copied Message
wallet_path = "src/components/WalletButton.tsx"
with open(wallet_path, 'r') as f:
    wallet = f.read()
if "copiedAddress" not in wallet:
    wallet = wallet.replace("const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)", "const [wrongNetworkBanner, setWrongNetworkBanner] = React.useState(false)\n  const [copiedAddress, setCopiedAddress] = React.useState(false)")
    wallet = wallet.replace("navigator.clipboard.writeText(address)\n      setDropdownOpen(false)", "navigator.clipboard.writeText(address)\n      setCopiedAddress(true)\n      setTimeout(() => { setCopiedAddress(false); setDropdownOpen(false); }, 1500)")
    wallet = re.sub(r'<button\s*onClick=\{copyAddress\}\s*className="w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors"\s*>\s*Copy Address\s*</button>', r'<button onClick={copyAddress} className="relative w-full px-4 py-3 text-left text-xs text-text-primary hover:bg-bg-tertiary transition-colors flex justify-between items-center"><span>{copiedAddress ? "Copied!" : "Copy Address"}</span>{copiedAddress && <span className="absolute right-4 px-2 py-0.5 bg-positive/20 text-positive text-[9px] uppercase tracking-widest border border-positive/50 rounded-none animate-in fade-in zoom-in duration-200">Copied!</span>}</button>', wallet)
    with open(wallet_path, 'w') as f:
        f.write(wallet)

# 8. Force Dynamic on Dashboard & Leaderboard
for page_path in ["src/app/dashboard/page.tsx", "src/app/leaderboard/page.tsx"]:
    with open(page_path, 'r') as f:
        content = f.read()
    if "export const dynamic = 'force-dynamic'" not in content:
        content = content.replace("export default function", "export const dynamic = 'force-dynamic'\nexport default function")
        with open(page_path, 'w') as f:
            f.write(content)

# 9. Dashboard UI Overhaul (if not already applied)
dash_path = "src/components/DashboardView.tsx"
with open(dash_path, 'r') as f:
    dash = f.read()
if "Terminal Lock Screen" in dash and "Encrypted Portfolio" not in dash:
    dash_locked_old = r'<div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-none animate-rain">[\s\S]*?\{/\* Locked Analytics Preview \*/\}'
    dash_locked_new = r'''<div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-none animate-rain">
        {/* Terminal Lock Screen */}
        <div className="lg:col-span-2 bg-[#050505] p-8 sm:p-16 flex flex-col items-center justify-center min-h-[450px] text-center relative overflow-hidden border-r border-border/60">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-red/10 via-transparent to-transparent opacity-40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center w-full max-w-md border border-brand-red/20 bg-bg-primary/80 p-8 sm:p-10 shadow-glow-red">
            <div className="w-16 h-16 border border-brand-red/50 bg-brand-red/10 flex items-center justify-center box-glow-pulse mb-6 rounded-none relative">
              <Lock className="w-6 h-6 text-brand-red" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-red/10 border border-brand-red/30 text-brand-red text-[9px] font-mono uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 bg-brand-red animate-pulse rounded-none" />
              Access Restricted
            </div>
            <h2 className="font-display text-text-primary text-2xl sm:text-3xl mb-4 tracking-tight uppercase">
              Encrypted Portfolio
            </h2>
            <div className="w-full h-px bg-brand-red/20 mb-6" />
            <p className="text-text-secondary text-[11px] leading-relaxed mb-8 font-mono text-left w-full border-l-2 border-brand-red/50 pl-4 bg-[#111111] py-3">
              {">"} Connect Web3 Wallet to establish secure channel.<br/>
              {">"} Access proprietary allocation, verify trace accuracy, and sync USDC settlements on Arc Testnet.
            </p>
            <button
              onClick={handleConnectClick}
              className="group relative overflow-hidden inline-flex items-center gap-3 px-8 py-3.5 bg-brand-red/10 border border-brand-red/50 text-brand-red text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:bg-brand-red hover:text-black w-full justify-center"
            >
              <span className="relative z-10">Initialize Handshake</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1 relative z-10">→</span>
            </button>
          </div>
        </div>

        {/* Locked Analytics Preview */}'''
    dash = re.sub(dash_locked_old, dash_locked_new, dash)
    
    dash_stats_old = r'<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none">[\s\S]*?\{/\* ── Portfolio Overview'
    dash_stats_new = r'''<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-6">
        {[
          { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'Arc Testnet', accent: 'text-accent-gold' },
          { label: 'Total Earned', value: `${totalEarned.toFixed(2)} USDC`, sub: 'From predictions', accent: 'text-positive' },
          { label: 'Accuracy', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} correct`, accent: '' },
          { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'Open positions', accent: '' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-[#050505] px-6 py-8 flex flex-col gap-3 hover:bg-[#0A0A0F] border-b-2 border-transparent hover:border-brand-red/50 transition-colors relative group"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-border group-hover:bg-brand-red/30 transition-colors" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">{s.label}</p>
            <p className={`font-display text-3xl font-bold tracking-tight ${s.accent || 'text-text-primary'}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-wide">{s.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* ── Portfolio Overview'''
    dash = re.sub(dash_stats_old, dash_stats_new, dash)
    with open(dash_path, 'w') as f:
        f.write(dash)

# 10. Leaderboard UI Overhaul (if not already applied)
lead_path = "src/components/LeaderboardView.tsx"
with open(lead_path, 'r') as f:
    lead = f.read()
if "rounded-2xl" in lead or "rounded-t-xl" in lead:
    lead = lead.replace('className="solid-panel rounded-2xl px-5 py-5"', 'className="bg-[#050505] border border-border/60 rounded-none px-5 py-5 hover:border-brand-red/30 transition-colors"')
    lead = lead.replace("rounded-2xl", "rounded-none")
    lead = lead.replace("rounded-t-xl", "rounded-none")
    lead = lead.replace("rounded-xl", "rounded-none")
    lead = re.sub(r'className=\{`flex flex-col items-center gap-3 \$\{trader\.rank === 1 \? \'order-2\' : trader\.rank === 2 \? \'order-1\' : \'order-3\'\}`\}',
                  r'className={`flex flex-col items-center gap-3 w-full ${trader.rank === 1 ? "order-2" : trader.rank === 2 ? "order-1" : "order-3"}`}', lead)
    lead = re.sub(r'className=\{`w-full \$\{h\} rounded-none flex items-center justify-center \$\{[\s\S]*?\}`\}',
                  r'className={`w-full ${h} rounded-none flex items-center justify-center ${trader.rank === 1 ? "bg-accent-gold/20 border border-accent-gold/40 shadow-glow-gold" : "bg-[#111111] border border-border"}`}', lead)
    with open(lead_path, 'w') as f:
        f.write(lead)
