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
rituals = extract('{/* DAILY RITUALS */}', '{/* GOALS & VISION */}')
goals = extract('{/* GOALS & VISION */}', '{/* CRUCIAL DEADLINES WIDGET */}')
crucial = extract('{/* CRUCIAL DEADLINES WIDGET */}', '{/* AUDIO SANCTUARY */}')

audio_raw = extract('{/* AUDIO SANCTUARY */}', '{/* REKOMENDASI BIMBEL */}')
# audio_raw ends with closing divs. We strip the last </div>
audio = re.sub(r'</div>\s*$', '', audio_raw.strip()).strip()

bimbel = extract('{/* REKOMENDASI BIMBEL */}', '{/* Footer Banner */}')
banner = extract('{/* Footer Banner */}', '{/* QUICK ADD TASK MODAL */}')
modals_str = extract('{/* QUICK ADD TASK MODAL */}')

pre_return = content[:content.find('return (')]

new_render = '''return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      ''' + toasts + '''

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* KOLOM KIRI / UTAMA (8 Kolom) */}
        <div className="xl:col-span-8 space-y-8 w-full">
          ''' + hero + '''
          ''' + stats + '''
          ''' + tasks + '''
          ''' + projects + '''
          ''' + comps + '''
          ''' + bimbel + '''
          ''' + banner + '''
        </div>

        {/* KOLOM KANAN / SIDEBAR WIDGETS (4 Kolom) */}
        <div className="xl:col-span-4 space-y-6 w-full">
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
