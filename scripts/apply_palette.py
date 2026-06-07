import os
import re

COLOR_MAP = {
    # Greens -> Success
    '#4A9F6F': '#00FF00',
    '#52B788': '#00FF00',
    '#2D6A4F': '#00FF00',
    '#34A853': '#00FF00',
    # Reds -> Accent
    '#9F4A4A': '#D82B2B',
    '#C0392B': '#D82B2B',
    '#7B2424': '#D82B2B',
    '#DC143C': '#D82B2B',
    '#EA4335': '#D82B2B',
    '#BF4A4A': '#D82B2B',
    # Golds/Yellows -> Warning/Amber
    '#C9A84C': '#FFD700',
    '#E8A020': '#FFD700',
    '#F59E0B': '#FFD700',
    '#D9822B': '#FFD700',
    '#B8860B': '#FFD700',
    '#FBBC05': '#FFD700',
    '#E8C96A': '#FFD700',
    '#CD7F32': '#FFD700', # Bronze
    '#8F6F4A': '#FFD700', # JP
    # Grays/Neutrals -> Secondary
    '#7B8FA6': '#888888',
    '#666666': '#888888',
    '#A3A3A3': '#888888',
    '#333333': '#888888',
    # Darks -> Cards / BG
    '#222222': '#0A0A0A',
    '#111111': '#0A0A0A',
    '#111118': '#0A0A0A',
    '#141414': '#0A0A0A',
    '#1A1A1A': '#0A0A0A',
    '#1A1A22': '#0A0A0A',
    '#1A1A24': '#0A0A0A',
    '#2A2A2A': '#0A0A0A',
    '#2A2A38': '#0A0A0A',
    '#050505': '#000000', # Off-blacks closer to black
    '#0A0A0F': '#0A0A0A',
    '#130A05': '#0A0A0A',
    # Lights -> Text Primary
    '#C0C0C0': '#FFFFFF', 
    '#F0EDE8': '#FFFFFF',
    '#fff': '#FFFFFF',
    '#FFF': '#FFFFFF',
    # Blues/Purples -> Map to standard
    '#4A7FBF': '#FFFFFF',
    '#3B82F6': '#FFFFFF',
    '#4285F4': '#FFFFFF',
    '#A855F7': '#00FF00',
    '#7A4ABF': '#00FF00',
    '#1D9BF0': '#FFFFFF',
    '#4A8F6F': '#888888', # EU region green-blue -> secondary
}

def replace_colors(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.cjs', '.html')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                for old_hex, new_hex in COLOR_MAP.items():
                    # Case insensitive replace for hex colors
                    pattern = re.compile(re.escape(old_hex), re.IGNORECASE)
                    content = pattern.sub(new_hex, content)
                
                if content != original:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated {path}")

if __name__ == '__main__':
    replace_colors('frontend/')
