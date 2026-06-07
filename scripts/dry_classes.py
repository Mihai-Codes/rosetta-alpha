import os
import re

# Mapping of hardcoded hex colors to their semantic Tailwind classes
CLASS_MAPPINGS = {
    # Backgrounds
    r'bg-\[#000000\]': 'bg-bg-primary',
    r'bg-\[#0A0A0A\]': 'bg-bg-secondary',
    r'bg-\[#D82B2B\]': 'bg-brand-red',
    r'bg-\[#00FF00\]': 'bg-positive',
    r'bg-\[#FFD700\]': 'bg-warning',
    r'bg-\[#FFFFFF\]': 'bg-white',
    
    # Text
    r'text-\[#000000\]': 'text-bg-primary',
    r'text-\[#0A0A0A\]': 'text-bg-secondary',
    r'text-\[#D82B2B\]': 'text-brand-red',
    r'text-\[#00FF00\]': 'text-positive',
    r'text-\[#FFD700\]': 'text-warning',
    r'text-\[#FFFFFF\]': 'text-text-primary',
    r'text-\[#888888\]': 'text-text-secondary',
    
    # Borders
    r'border-\[#000000\]': 'border-bg-primary',
    r'border-\[#0A0A0A\]': 'border-border',
    r'border-\[#D82B2B\]': 'border-brand-red',
    r'border-\[#00FF00\]': 'border-positive',
    r'border-\[#FFD700\]': 'border-warning',
    r'border-\[#FFFFFF\]': 'border-white',
    r'border-\[#888888\]': 'border-text-secondary',
}

def apply_dry_principles(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                for pattern, replacement in CLASS_MAPPINGS.items():
                    # We use regex to ensure case-insensitivity on the hex codes
                    content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
                
                if content != original:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"DRY applied to {path}")

if __name__ == '__main__':
    apply_dry_principles('frontend/src/components')
