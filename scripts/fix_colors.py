import os

def fix_hex_colors(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.cjs', '.html')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                content = content.replace('#FFFFFFFFFFFF', '#FFFFFF')
                content = content.replace('#FFFFFFFFF', '#FFFFFF')
                
                if content != original:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Fixed {path}")

if __name__ == '__main__':
    fix_hex_colors('frontend/')
