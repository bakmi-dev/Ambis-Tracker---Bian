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

# Let's fix Rituals which now needs the internal scrollbar
rituals = rituals.replace('className=\"space-y-1.5\"', 'className=\"space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent\"')

# Find main return
pre_return_match = re.search(r'^\s*return \($', content, re.MULTILINE)
pre_return = content[:pre_return_match.end()]

new_render = '''
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      ''' + toasts + '''

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* KOLOM KIRI / UTAMA (8 Kolom) */}
        <div className="xl:col-span-8 space-y-8">
          ''' + hero + '''
          ''' + stats + '''
          ''' + tasks + '''
          ''' + projects + '''
          ''' + comps + '''
          ''' + bimbel + '''
          ''' + banner + '''
        </div>

        {/* KOLOM KANAN / SIDEBAR WIDGETS (4 Kolom) */}
        <div className="xl:col-span-4 space-y-6">
          ''' + rituals + '''
          ''' + goals + '''
          ''' + crucial + '''
          ''' + audio + '''
        </div>
      </div>

      ''' + modals_str + '''
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(pre_return + new_render)

print("Dashboard rewritten.")
