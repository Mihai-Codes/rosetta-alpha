import re

# 1. Earn Quiz Score Display
with open('src/components/EarnQuiz.tsx', 'r') as f:
    quiz = f.read()
quiz = re.sub(
    r'<p className="font-display text-6xl sm:text-7xl font-light text-text-primary leading-none">\s*\{score\}\s*<span className="text-3xl text-text-tertiary">/\{total\}</span>\s*</p>',
    '<p className="font-display text-5xl sm:text-6xl font-normal text-text-primary leading-none">\n          {score}<span className="text-text-tertiary">/{total}</span>\n        </p>',
    quiz
)
with open('src/components/EarnQuiz.tsx', 'w') as f:
    f.write(quiz)

# 2. Dashboard Ring Chart Fix
with open('src/components/DashboardView.tsx', 'r') as f:
    dash = f.read()

# Fix the SVG and text inside RingChart
ring_chart_old = r'''<svg width="200" height="200" viewBox={`0 0 160 160`} className="transform -rotate-90">
          {/\* Track \*/}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#1A1A24"
            strokeWidth="18"
          />
          {/\* Segments \*/}
          {QUADRANTS\.map\(\(q, i\) => \{
            const len = \(q\.pct / total\) \* circumference
            const seg = \(
              <circle
                key=\{i\}
                cx=\{cx\}
                cy=\{cy\}
                r=\{radius\}
                fill="none"
                stroke=\{q\.color\}
                strokeWidth="18"
                strokeDasharray=\{`\$\{len\} \$\{circumference\}`}
                strokeDashoffset=\{-offset\}
                strokeLinecap="butt"
                style=\{\{ transition: 'stroke-dashoffset 1\.2s ease-out' \}\}
              />
            \)
            offset \+= len
            return seg
          \}\)}
        </svg>
        {/\* Center label sits inside the donut — must be absolute \*/}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-display text-3xl text-text-primary leading-none">\{total\}%</p>
          <p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mt-1">Diversified</p>
        </div>'''

ring_chart_new = r'''<svg width="220" height="220" viewBox={`0 0 220 220`} className="transform -rotate-90">
          {/* Track */}
          <circle cx="110" cy="110" r="86" fill="none" stroke="#1A1A24" strokeWidth="18" />
          {/* Segments */}
          {QUADRANTS.map((q, i) => {
            const len = (q.pct / total) * (2 * Math.PI * 86)
            const seg = (
              <circle
                key={i} cx="110" cy="110" r="86" fill="none" stroke={q.color} strokeWidth="18"
                strokeDasharray={`${len} ${2 * Math.PI * 86}`} strokeDashoffset={-offset} strokeLinecap="butt"
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
            )
            offset += len
            return seg
          })}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-sm text-text-primary font-bold tracking-[0.2em] uppercase text-center leading-tight">
            All<br/>Weather
          </p>
          <p className="text-[8px] uppercase tracking-[0.25em] text-text-tertiary mt-1.5">
            Risk Parity
          </p>
        </div>'''

dash = re.sub(ring_chart_old, ring_chart_new, dash)

# Also remove the old variables since we inlined them
dash = dash.replace("const radius = 72\n  const cx = 80\n  const cy = 80\n  const circumference = 2 * Math.PI * radius", "")

# 3. Dashboard Locked Target Allocation Box
locked_box_old = r'''{/\* Locked Analytics Preview \*/}
        <div className="bg-\[#050505\] p-6 sm:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <p className="text-\[10px\] font-medium uppercase tracking-\[0\.3em\] text-text-tertiary">
              Target Allocation
            </p>
            <span className="flex items-center gap-1\.5 px-2 py-1 bg-brand-red/10 border border-brand-red/20 text-brand-red text-\[9px\] uppercase tracking-\[0\.2em\]">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
          
          <div className="opacity-40 grayscale pointer-events-none transition-all duration-700 hover:grayscale-0 hover:opacity-100">
            <RingChart />
          </div>
          
          <div className="mt-12 space-y-4">
            <div className="h-px w-full bg-border/50" />
            <div className="flex justify-between items-center">
              <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-\[11px\] text-text-tertiary">-- USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-\[9px\] uppercase tracking-\[0\.2em\] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-\[11px\] text-text-tertiary">-- %</span>
            </div>
          </div>
        </div>'''

locked_box_new = r'''{/* Locked Analytics Preview */}
        <div className="bg-[#050505] p-6 sm:p-10 flex flex-col relative overflow-hidden border-l border-border/60">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red/80 to-transparent opacity-60" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red/50" />
              Target Allocation
            </p>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#111111] border border-border text-text-secondary text-[9px] uppercase tracking-[0.2em] shadow-glow-red">
              <Lock className="w-3 h-3 text-brand-red" /> Encrypted
            </span>
          </div>
          
          <div className="relative z-10 opacity-10 grayscale pointer-events-none transition-all duration-700 blur-[4px]">
            <RingChart />
          </div>
          
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex flex-col items-center gap-3">
               <div className="w-12 h-12 border border-brand-red/30 bg-brand-red/10 flex items-center justify-center rounded-full backdrop-blur-md">
                 <Lock className="w-5 h-5 text-brand-red" />
               </div>
               <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand-red bg-bg-primary/90 px-4 py-2 border border-brand-red/20 backdrop-blur-sm shadow-glow-red">
                 Auth Required
               </span>
            </div>
          </div>
          
          <div className="mt-10 space-y-4 relative z-10">
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Live PnL</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-[1px]">████ USDC</span>
            </div>
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[9px] uppercase tracking-[0.2em] text-text-tertiary">Win Rate</span>
              <span className="font-mono text-[11px] text-brand-red bg-brand-red/10 px-2 border border-brand-red/20 blur-[1px]">██.█%</span>
            </div>
          </div>
        </div>'''

dash = re.sub(locked_box_old, locked_box_new, dash)

# 4. Dashboard Upper Stats
stats_old = r'''\{/\* ── Stat tiles row ── \*/\}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-none mb-6">
        \{\[
          \{ label: 'USDC Balance', value: balance \? `\$\{parseFloat\(balance\.formatted\)\.toFixed\(2\)\}` : '—', sub: 'Arc Testnet', accent: 'text-accent-gold' \},
          \{ label: 'Total Earned', value: `\$\{totalEarned\.toFixed\(2\)\} USDC`, sub: 'From predictions', accent: 'text-positive' \},
          \{ label: 'Accuracy', value: `\$\{accuracy\}%`, sub: `\$\{PREDICTIONS\.filter\(p => p\.status === 'RESOLVED_WIN'\)\.length\}/\$\{PREDICTIONS\.length\} correct`, accent: '' \},
          \{ label: 'Active Stakes', value: String\(PREDICTIONS\.filter\(p => p\.status === 'OPEN'\)\.length\), sub: 'Open positions', accent: '' \},
        \]\.map\(\(s, i\) => \(
          <motion\.div
            key=\{s\.label\}
            initial=\{\{ opacity: 0, y: 12 \}\}
            animate=\{\{ opacity: 1, y: 0 \}\}
            transition=\{\{ delay: i \* 0\.07 \}\}
            className="bg-\[#050505\] px-6 py-8 flex flex-col gap-3 hover:bg-\[#0A0A0F\] border-b-2 border-transparent hover:border-brand-red/50 transition-colors relative group"
          >
            <div className="absolute top-0 left-0 w-full h-\[1px\] bg-border group-hover:bg-brand-red/30 transition-colors" />
            <p className="text-\[10px\] font-mono uppercase tracking-\[0\.2em\] text-text-tertiary">\{s\.label\}</p>
            <p className=\{`font-display text-3xl font-bold tracking-tight \$\{s\.accent \|\| 'text-text-primary'\}`\}>
              \{s\.value\}
            </p>
            \{s\.sub && <p className="text-\[9px\] text-text-tertiary font-mono tracking-wide">\{s\.sub\}</p>\}
          </motion\.div>
        \)\)\}
      </div>'''

stats_new = r'''{/* ── High-End Terminal Stats Banner ── */}
      <div className="border border-border/80 bg-[#0A0A0A] rounded-none mb-10 relative overflow-hidden shadow-2xl">
        <div className="h-[2px] w-full bg-gradient-to-r from-brand-red/80 via-brand-red/20 to-transparent" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-[#050505]">
           <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-red animate-pulse" /> Live Telemetry
           </span>
           <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-text-tertiary">Session Active</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/40">
          {[
            { label: 'USDC Balance', value: balance ? `${parseFloat(balance.formatted).toFixed(2)}` : '—', sub: 'Arc Testnet', accent: 'text-text-primary' },
            { label: 'Total Earned', value: `+${totalEarned.toFixed(2)}`, sub: 'USDC Generated', accent: 'text-positive' },
            { label: 'Accuracy', value: `${accuracy}%`, sub: `${PREDICTIONS.filter(p => p.status === 'RESOLVED_WIN').length}/${PREDICTIONS.length} Correct`, accent: 'text-accent-gold' },
            { label: 'Active Stakes', value: String(PREDICTIONS.filter(p => p.status === 'OPEN').length), sub: 'Open positions', accent: 'text-brand-red' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#050505] px-6 py-8 flex flex-col justify-between hover:bg-[#111111] transition-colors group relative"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-transparent group-hover:bg-brand-red/50 transition-colors" />
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-5 group-hover:text-text-secondary transition-colors">{s.label}</p>
              <div>
                <p className={`font-mono text-3xl font-bold tracking-tight ${s.accent || 'text-text-primary'}`}>
                  {s.value}
                </p>
                {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-widest mt-2">{s.sub}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>'''

dash = re.sub(stats_old, stats_new, dash)

# 5. Terminal Access
terminal_access_old = r'''<motion.div
          initial=\{\{ opacity: 0, y: 16 \}\}
          animate=\{\{ opacity: 1, y: 0 \}\}
          transition=\{\{ delay: 0\.3 \}\}
          className="bg-\[#050505\] p-6 sm:p-10 flex flex-col gap-6"
        >
          <p className="text-\[10px\] font-medium uppercase tracking-\[0\.3em\] text-text-tertiary">
            Terminal Access
          </p>'''

terminal_access_new = r'''<motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#050505] p-6 sm:p-10 flex flex-col gap-6 border-l border-border/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-positive/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-tertiary relative z-10">
            Terminal Access
          </p>'''
dash = re.sub(terminal_access_old, terminal_access_new, dash)

with open('src/components/DashboardView.tsx', 'w') as f:
    f.write(dash)
print("Dashboard applied")

# 6. Leaderboard Stats Banner
with open('src/components/LeaderboardView.tsx', 'r') as f:
    lead = f.read()

lead_stats_old = r'''<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        \{\[
          \{ label: 'Active Traders',  value: String\(TRADERS\.length\) \},
          \{ label: 'USDC Distributed', value: `\$\{TRADERS\.reduce\(\(s, t\) => s \+ t\.earned, 0\)\} USDC` \},
          \{ label: 'Correct Calls',   value: String\(TRADERS\.reduce\(\(s, t\) => s \+ t\.correct, 0\)\) \},
          \{ label: 'Arc Settlements', value: String\(TRADERS\.reduce\(\(s, t\) => s \+ t\.arcTxCount, 0\)\) \},
        \]\.map\(\(s, i\) => \(
          <motion\.div
            key=\{s\.label\}
            initial=\{\{ opacity: 0, y: 12 \}\}
            animate=\{\{ opacity: 1, y: 0 \}\}
            transition=\{\{ delay: i \* 0\.07 \}\}
            className="bg-\[#050505\] border border-border/60 rounded-none px-5 py-5 hover:border-brand-red/30 transition-colors"
          >
            <p className="text-\[9px\] uppercase tracking-\[0\.25em\] text-text-tertiary mb-1">\{s\.label\}</p>
            <p className="font-display text-xl sm:text-2xl text-text-primary font-light">\{s\.value\}</p>
          </motion\.div>
        \)\)\}
      </div>'''

lead_stats_new = r'''{/* ── High-End Stats Banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/80 border border-border/80 rounded-none mb-10">
        {[
          { label: 'Active Traders',  value: String(TRADERS.length), accent: 'text-text-primary' },
          { label: 'USDC Distributed', value: `${TRADERS.reduce((s, t) => s + t.earned, 0)}`, sub: 'USDC', accent: 'text-positive' },
          { label: 'Correct Calls',   value: String(TRADERS.reduce((s, t) => s + t.correct, 0)), accent: 'text-accent-gold' },
          { label: 'Arc Settlements', value: String(TRADERS.reduce((s, t) => s + t.arcTxCount, 0)), accent: 'text-brand-red' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0A0A0A] px-6 py-8 flex flex-col gap-3 hover:bg-[#111111] transition-colors relative group border-t-2 border-transparent hover:border-brand-red"
          >
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-border group-hover:bg-brand-red transition-colors" />
               <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary group-hover:text-text-primary transition-colors">{s.label}</p>
            </div>
            <p className={`font-mono text-3xl font-bold tracking-tight ${s.accent}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-[9px] text-text-tertiary font-mono tracking-widest">{s.sub}</p>}
          </motion.div>
        ))}
      </div>'''

lead = re.sub(lead_stats_old, lead_stats_new, lead)
with open('src/components/LeaderboardView.tsx', 'w') as f:
    f.write(lead)
print("Leaderboard applied")

# 7. Wallet Copied Logic for Dashboard
wallet_path = "src/components/WalletButton.tsx"
with open(wallet_path, 'r') as f:
    wallet = f.read()

if "const [copiedDash, setCopiedDash]" not in wallet:
    wallet = wallet.replace("const [copiedAddress, setCopiedAddress] = React.useState(false)", "const [copiedAddress, setCopiedAddress] = React.useState(false)\n  const [copiedDash, setCopiedDash] = React.useState(false)")

    with open(wallet_path, 'w') as f:
        f.write(wallet)

# 8. Feedback Survey Text truncation
survey_path = "src/components/FeedbackSurvey.tsx"
with open(survey_path, 'r') as f:
    survey = f.read()

survey = re.sub(r'<h3 className="font-mono text-\[9px\] sm:text-\[10px\] uppercase tracking-normal text-text-primary whitespace-normal leading-relaxed w-full">', '<h3 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-normal text-text-primary whitespace-normal leading-relaxed w-full pr-4">', survey)
with open(survey_path, 'w') as f:
    f.write(survey)

# 9. Ensure ThesisCard has IPFS and Arc separated left/right correctly
tc_path = "src/components/ThesisCard.tsx"
with open(tc_path, 'r') as f:
    tc = f.read()
tc = re.sub(r'<div className="flex items-center justify-between w-full flex-wrap gap-4">', '<div className="flex flex-row items-center justify-between w-full">', tc)
tc = re.sub(r'<div className="flex items-center gap-1.5">', '<div className="flex items-center gap-1.5 shrink-0">', tc)
with open(tc_path, 'w') as f:
    f.write(tc)

# 10. Arrow Removed from HeroSection completely
hero_path = "src/components/HeroSection.tsx"
with open(hero_path, 'r') as f:
    hero = f.read()
hero = re.sub(r'<a href="#desks-section"[^>]*><ArrowDown className="w-5 h-5" /></a>', '', hero)
hero = re.sub(r'<button[^>]*><ArrowDown className="w-5 h-5" /></button>', '', hero)
hero = re.sub(r'<div className="mt-[^"]+"[^>]*>\s*</div>', '', hero)
with open(hero_path, 'w') as f:
    f.write(hero)
