import re

# 1. Upgrade SignInModal Redirect Logic
modal_path = "src/components/SignInModal.tsx"
with open(modal_path, "r") as f:
    modal = f.read()

modal = re.sub(
    r'callbackUrl: window\.location\.pathname',
    r'callbackUrl: ["/", "/quiz"].includes(window.location.pathname) ? window.location.pathname : "/dashboard"',
    modal
)

with open(modal_path, "w") as f:
    f.write(modal)
print("SignInModal redirect logic upgraded!")

# 2. Expand Authenticated Nav Bar
layout_path = "src/components/Layout.tsx"
with open(layout_path, "r") as f:
    layout = f.read()

auth_old = r"const AUTH_TABS: \{ id: Tab; label: string; href: string \}\[\] = \[\n\s*\{ id: 'desks', label: 'Desks', href: '/' \},\n\s*\{ id: 'feed', label: 'Live Feed', href: '/feed' \},\n\s*\{ id: 'registry', label: 'Registry', href: '/registry' \},\n\s*\{ id: 'dashboard', label: 'Dashboard', href: '/dashboard' \},\n\s*\{ id: 'quiz', label: 'Quiz', href: '/quiz' \},\n\]"
auth_new = r"""const AUTH_TABS: { id: Tab; label: string; href: string }[] = [
  { id: 'desks', label: 'Desks', href: '/' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'leaderboard', label: 'Rankings', href: '/leaderboard' },
  { id: 'feed', label: 'Live Feed', href: '/feed' },
  { id: 'registry', label: 'Registry', href: '/registry' },
  { id: 'quiz', label: 'Quiz', href: '/quiz' },
]"""

layout = re.sub(auth_old, auth_new, layout)

with open(layout_path, "w") as f:
    f.write(layout)
print("Auth Tabs expanded!")
