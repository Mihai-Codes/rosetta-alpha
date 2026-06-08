import os
import re

def replace_in_file(path, old, new):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    if old in content:
        with open(path, 'w', encoding='utf-8') as f: f.write(content.replace(old, new))
        print(f"Updated {path}")

# Fix sorting logic in Leaderboard to be more dynamic (handling ties by earned amount)
lb_path = 'frontend/src/components/LeaderboardView.tsx'
if os.path.exists(lb_path):
    with open(lb_path, 'r', encoding='utf-8') as f: content = f.read()
    
    old_sort = '''  const sorted = [...TRADERS].sort((a, b) => {
    if (sort === 'accuracy') return accuracy(b) - accuracy(a)
    if (sort === 'earned')   return b.earned - a.earned
    if (sort === 'streak')   return b.streak - a.streak
    return a.rank - b.rank
  })'''
  
    new_sort = '''  const sorted = [...TRADERS].sort((a, b) => {
    if (sort === 'accuracy') return accuracy(b) !== accuracy(a) ? accuracy(b) - accuracy(a) : b.earned - a.earned
    if (sort === 'earned')   return b.earned !== a.earned ? b.earned - a.earned : accuracy(b) - accuracy(a)
    if (sort === 'streak')   return b.streak !== a.streak ? b.streak - a.streak : b.earned - a.earned
    return a.rank - b.rank
  })'''
  
    content = content.replace(old_sort, new_sort)
    # Ensure Rank 2 is clearly silver (#C0C0C0)
    content = content.replace("text-[#E2E8F0]", "text-[#C0C0C0]")
    
    with open(lb_path, 'w', encoding='utf-8') as f: f.write(content)
    print("Updated Leaderboard sorting and silver color")

# Do the same for DashboardView
db_path = 'frontend/src/components/DashboardView.tsx'
if os.path.exists(db_path):
    with open(db_path, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace(old_sort, new_sort)
    content = content.replace("text-[#E2E8F0]", "text-[#C0C0C0]")
    with open(db_path, 'w', encoding='utf-8') as f: f.write(content)
    print("Updated DashboardView sorting and silver color")

# Ensure telemetry is fully removed for unauthenticated in DesksView
desks_path = 'frontend/src/components/DesksView.tsx'
if os.path.exists(desks_path):
    with open(desks_path, 'r', encoding='utf-8') as f: content = f.read()
    
    # Check if the blurred lock screen exists
    if "backdrop-blur-md" in content and "Sign in to Decrypt" in content:
        # Strip out the lock screen
        content = re.sub(r'\{\!isAuthed && \(\s*<div className="absolute inset-0 z-20 backdrop-blur-md.*?<\/div>\s*\)\}', '', content, flags=re.DOTALL)
        content = content.replace('${!isAuthed ? \'opacity-20 pointer-events-none select-none blur-sm\' : \'\'}', '')
    
    with open(desks_path, 'w', encoding='utf-8') as f: f.write(content)
    print("Verified DesksView telemetry gating")

