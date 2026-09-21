import re
import sys

filepath = r'd:/Study Bian/bian-os/src/pages/Dashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

def get_block(start_marker, end_marker=None):
    s = text.find(start_marker)
    if end_marker:
        e = text.find(end_marker, s)
        return text[s:e]
    return text[s:]

toasts = get_block('{/* Toast */}', '{/* TOP HERO')
hero = get_block('{/* TOP HERO', '{/* QUICK STATS')
stats = get_block('{/* QUICK STATS', '{/* CORE TWO-COLUMN')
tasks = get_block('{/* TASKS */}', '{/* ACTIVE PROJECTS */}')
projects = get_block('{/* ACTIVE PROJECTS */}', '{/* ACTIVE COMPETITIONS */}')
comps = get_block('{/* ACTIVE COMPETITIONS */}', '</div>\n\n        {/* RIGHT COLUMN */}')
crucial = get_block('{/* CRUCIAL DEADLINES WIDGET */}', '{/* DAILY RITUALS */}')
rituals = get_block('{/* DAILY RITUALS */}', '{/* AUDIO SANCTUARY */}')
audio = get_block('{/* AUDIO SANCTUARY */}', '{/* GOALS & VISION */}')
goals = get_block('{/* GOALS & VISION */}', '</div>\n      </div>\n\n      {/* REKOMENDASI BIMBEL */}')
bimbel = get_block('{/* REKOMENDASI BIMBEL */}', '{/* Footer Banner */}')
banner = get_block('{/* Footer Banner */}', '{/* QUICK ADD TASK MODAL */}')
modals = get_block('{/* QUICK ADD TASK MODAL */}', '  );\n};\n\nexport default Dashboard;')

rituals = rituals.replace('className=\"space-y-1.5\"', 'className=\"space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent\"')

new_render = f'''  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
{toasts}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {{/* KOLOM KIRI / UTAMA (8 Kolom) */}}
        <div className="xl:col-span-8 space-y-8">
{hero}{stats}{tasks}{projects}{comps}{bimbel}{banner}        </div>

        {{/* KOLOM KANAN / SIDEBAR WIDGETS (4 Kolom) */}}
        <div className="xl:col-span-4 space-y-6">
{rituals}{goals}{crucial}{audio}        </div>
      </div>

{modals}    </div>
  );
}};

export default Dashboard;
'''

idx_toast = text.find('{/* Toast */}')
idx_main_return = text.rfind('  return (', 0, idx_toast)
if idx_main_return == -1:
    print('Failed to find main return')
    sys.exit(1)

pre_return = text[:idx_main_return]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(pre_return + new_render)

print("Dashboard built perfectly.")
