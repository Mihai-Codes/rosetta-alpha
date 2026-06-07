import os

def replace_in_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Ultra-DRY applied to {path}")

# DivergenceGauge.tsx
replace_in_file('frontend/src/components/DivergenceGauge.tsx', [
    ('stroke="#00FF00"', 'stroke="var(--color-positive)"'),
    ('stroke="#FFD700"', 'stroke="var(--color-warning)"'),
    ('stroke="#D82B2B"', 'stroke="var(--color-negative)"')
])

# EllipseView.tsx
replace_in_file('frontend/src/components/EllipseView.tsx', [
    ('stroke="#FFFFFF"', 'stroke="var(--color-text-primary)"'),
    ('stroke="#D82B2B"', 'stroke="var(--color-brand-red)"'),
    ('fill="#D82B2B"', 'fill="var(--color-brand-red)"'),
    ('fill="#FFFFFF"', 'fill="var(--color-text-primary)"')
])

# DashboardView.tsx
replace_in_file('frontend/src/components/DashboardView.tsx', [
    ('stroke="#0A0A0A"', 'stroke="var(--color-border)"')
])

# NarrativeCloud.tsx
replace_in_file('frontend/src/components/NarrativeCloud.tsx', [
    ('stroke="#FFD700"', 'stroke="var(--color-warning)"')
])

# RegionSidebar.tsx
replace_in_file('frontend/src/components/RegionSidebar.tsx', [
    ('stroke="#0A0A0A"', 'stroke="var(--color-border)"')
])

# SignInModal.tsx (Make Google Logo monochrome)
replace_in_file('frontend/src/components/SignInModal.tsx', [
    ('fill="#FFFFFF"', 'fill="currentColor"'),
    ('fill="#00FF00"', 'fill="currentColor"'),
    ('fill="#FFD700"', 'fill="currentColor"'),
    ('fill="#D82B2B"', 'fill="currentColor"')
])

