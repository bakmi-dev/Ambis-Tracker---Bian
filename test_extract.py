import os
import re

filepath = r'd:/Study Bian/bian-os/src/pages/Dashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

def extract(start, end=None):
    s = content.find(start)
    if s == -1: return ''
    if end:
        e = content.find(end, s)
        if e == -1: return content[s:]
        return content[s:e].strip()
    return content[s:].strip()

toasts = extract('{/* Toast */}', '{/* TOP HERO')
hero = extract('{/* TOP HERO', '{/* QUICK STATS')
stats = extract('{/* QUICK STATS', '{/* CORE TWO-COLUMN')
tasks = extract('{/* TASKS */}', '{/* ACTIVE PROJECTS */}')
projects = extract('{/* ACTIVE PROJECTS */}', '{/* ACTIVE COMPETITIONS */}')
comps = extract('{/* ACTIVE COMPETITIONS */}', '{/* RIGHT COLUMN */}')
crucial = extract('{/* CRUCIAL DEADLINES WIDGET */}', '{/* DAILY RITUALS */}')
rituals = extract('{/* DAILY RITUALS */}', '{/* AUDIO SANCTUARY */}')
audio = extract('{/* AUDIO SANCTUARY */}', '{/* GOALS & VISION */}')
goals = extract('{/* GOALS & VISION */}', '{/* REKOMENDASI BIMBEL */}')
bimbel = extract('{/* REKOMENDASI BIMBEL */}', '{/* Footer Banner */}')
banner = extract('{/* Footer Banner */}', '{/* QUICK ADD TASK MODAL */}')
modals_str = extract('{/* QUICK ADD TASK MODAL */}')

# Clean trailing divs accurately
# Comps ends with </div> (for comps widget) and </div> (for LEFT COLUMN).
comps = re.sub(r'</div>\s*</div>\s*$', '</div>', comps.strip()).strip()

# Goals ends with </div> (for goals widget), </div> (for RIGHT COLUMN), and </div> (for grid).
goals = re.sub(r'</div>\s*</div>\s*</div>\s*$', '</div>', goals.strip()).strip()

print('Comps tail:', repr(comps[-20:]))
print('Goals tail:', repr(goals[-20:]))
print('Audio tail:', repr(audio[-20:]))
print('Banner tail:', repr(banner[-20:]))
