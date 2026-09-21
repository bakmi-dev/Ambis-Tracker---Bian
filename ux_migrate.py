import os
import glob
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Global Escape Key Handler
    # Find the main component function: e.g. const Dashboard = () => {
    # and insert the useEffect right after it.
    if 'useEffect(() => {' not in text or 'keydown' not in text:
        # Let's find all setXYZModal(false) or setIsOpen(false) to close them.
        # It's easier to just close everything that starts with 'set' and ends with 'Open' or 'Modal'.
        setters = set(re.findall(r'(set[A-Z][a-zA-Z]*(?:Modal|Open))\(', text))
        if setters:
            closes = '\n'.join([f"        {setter}(false);" for setter in setters])
            escape_effect = f'''
  useEffect(() => {{
    const handleKeyDown = (e: KeyboardEvent) => {{
      if (e.key === 'Escape') {{
{closes}
      }}
    }};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }}, []);
'''
            # insert after main component declaration
            # search for const ComponentName = ... => {
            m = re.search(r'const [A-Z][a-zA-Z0-9_]*\s*=\s*(?:<[^>]+>\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*{', text)
            if m:
                # also ensure useEffect is imported
                if 'useEffect' not in text:
                    text = text.replace('import React, {', 'import React, { useEffect,')
                    if 'useEffect' not in text:
                        text = text.replace('import {', 'import { useEffect,')
                
                insert_pos = m.end()
                text = text[:insert_pos] + '\n' + escape_effect + text[insert_pos:]
                
    # 2. Modals to Forms
    # Find modals by looking for g-black/60 or ixed inset-0
    # This is tricky because we need to find the wrapper inside it and the submit button.
    # Let's use a simpler approach: 
    # For every <button ...>Simpan</button> or <button ...>Tambah</button> or <button ...>OK</button>, 
    # if it's inside a modal (has an onClick handler), we find its parent container that has space-y-4 and change it to <form>.
    
    # We will do this manually or via a smart regex in the next script.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

for file in glob.glob('src/pages/*.tsx'):
    process_file(file)
print('Escape key handlers added.')
