import os
import re

def update_file(path, old, new):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
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
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, 'r') as f:
        content = f.read()
    new_content = re.sub(pattern, repl, content)
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Regex updated {path}")
    else:
        print(f"Regex NOT FOUND in {path}")

# 1. AllWeatherChart Circles -> Terminal Indicators
update_regex("src/components/AllWeatherChart.tsx", r'className="w-2 h-2 rounded-full shrink-0"', 'className="w-1.5 h-3 rounded-none shrink-0 shadow-glow-red"')

# 2. DesksView Circles -> Terminal Indicators
update_regex("src/components/DesksView.tsx", r'rounded-full h-2 w-2', 'rounded-none h-3 w-1.5 shadow-glow-red')
update_regex("src/components/DesksView.tsx", r'rounded-full opacity-75', 'rounded-none opacity-75')

# 3. DeskCard Footer Symmetry
desk_card = "src/components/DeskCard.tsx"
update_regex(desk_card, 
    r'<div className="px-6 py-3 border-t border-border/50 bg-\[#0A0A0A\] flex items-center justify-between w-full">',
    '<div className="px-6 py-3 border-t border-border/50 bg-[#0A0A0A] flex items-center justify-between w-full">')
# Force flex-between spacing by ensuring empty divs are full React elements
update_regex(desk_card, r'<div \/>', '<div></div>')

# 4. Survey Text Wrapping
survey = "src/components/FeedbackSurvey.tsx"
update_regex(survey, r'w-\[460px\]', 'w-[420px]')
update_regex(survey, r'<h3 className="font-mono text-\[.*?\] sm:text-\[.*?\] uppercase tracking-.*? text-text-primary.*?">', '<h3 className="font-mono text-[9.5px] sm:text-[10.5px] uppercase tracking-normal text-text-primary whitespace-normal leading-relaxed w-full">')
update_regex(survey, r'feedback_survey_v\d+', 'feedback_survey_v12')

# 5. Hero Quiz Animation Sync
update_regex("src/components/HeroSection.tsx", 
    r'<motion\.div \n\s*initial=\{\{ opacity: 0, y: 16 \}\}\n\s*animate=\{visible\.actions \? \{\s*opacity: 1, y: 0\s*\} : \{\s*opacity: 0, y: 16\s*\}\}\n\s*transition=\{\{ duration: 1, delay: 0\.6 \}\}',
    '<motion.div initial={{ opacity: 0, y: 16 }} animate={visible.headline ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 1, delay: 0.8 }}')

# 6. Force Dynamic on Dashboard and Leaderboard
for p in ["src/app/dashboard/page.tsx", "src/app/leaderboard/page.tsx"]:
    with open(p, 'r') as f:
        content = f.read()
    if "export const revalidate = 0" not in content:
        content = content.replace("export const dynamic = 'force-dynamic'", "export const dynamic = 'force-dynamic'\nexport const revalidate = 0")
        with open(p, 'w') as f:
            f.write(content)
        print(f"Forced revalidate=0 on {p}")

