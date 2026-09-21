import glob
import re

handlers_map = {
    'Competitions.tsx': 'handleSaveSubmit',
    'Goals.tsx': 'handleSaveGoal',
    'Progress.tsx': 'handleSaveProfile',
    'Projects.tsx': 'handleSave',
    'Tasks.tsx': 'handleSaveTask',
    'Today.tsx': {'Tambah Task Hari Ini': 'handleCreateTask', 'Tambah Daily Ritual': 'handleCreateRitual', 'Log Study Session': 'handleLogStudy'}
}

def process_file(filepath):
    filename = filepath.split('\\')[-1]
    if filename not in handlers_map:
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
        
    # We will find ixed inset-0
    # Then find the next g-surface-container-low (the modal box)
    # Then balance its tags to find the end </div>
    # Change <div className="bg-surface-container-low... to <form onSubmit={...}
    # Change end </div> to </form>
    # Find onClick={handler} inside it and remove it, add 	ype="submit"
    
    new_text = text
    offset = 0
    
    while True:
        idx_inset = new_text.find('fixed inset-0', offset)
        if idx_inset == -1: break
        
        idx_box = new_text.find('bg-surface-container-low', idx_inset)
        if idx_box == -1 or idx_box - idx_inset > 500: 
            offset = idx_inset + 13
            continue
            
        # find the <div before bg-surface-container-low
        idx_div_start = new_text.rfind('<div', idx_inset, idx_box)
        if idx_div_start == -1:
            offset = idx_box + 24
            continue
            
        # balance it to find end
        opens = 0
        closes = 0
        idx_end = -1
        
        for m in re.finditer(r'<div(?![^>]*/>)|</div', new_text[idx_div_start:]):
            if m.group(0).startswith('<div'): opens += 1
            else: closes += 1
            
            if opens > 0 and opens == closes:
                idx_end = idx_div_start + m.end()
                break
                
        if idx_end == -1:
            offset = idx_box + 24
            continue
            
        modal_content = new_text[idx_div_start:idx_end]
        
        # Determine handler
        handler = ''
        if isinstance(handlers_map[filename], dict):
            for title, h in handlers_map[filename].items():
                if title in modal_content:
                    handler = h
                    break
        else:
            handler = handlers_map[filename]
            
        if not handler:
            offset = idx_end
            continue
            
        # Refactor modal_content
        # 1. Change <div className="bg-surface... to <form onSubmit...
        new_modal = modal_content.replace('<div className="bg-surface-container-low', f'<form onSubmit={{(e) => {{ e.preventDefault(); {handler}(); }}}} className="bg-surface-container-low', 1)
        # Change end </div> to </form>
        if new_modal.endswith('</div>'):
            new_modal = new_modal[:-6] + '</form>'
            
        # 2. Change button
        # Find onClick={handler}
        new_modal = re.sub(rf'onClick={{\s*{handler}\s*}}', 'type="submit"', new_modal)
        
        # 3. autoFocus
        # If no autoFocus, add to first input
        if 'autoFocus' not in new_modal:
            new_modal = new_modal.replace('<input', '<input autoFocus', 1)
            
        # 4. Textarea Ctrl+Enter
        # Replace <textarea with <textarea onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
        new_modal = new_modal.replace('<textarea', '<textarea onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === \'Enter\') { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}')
        
        new_text = new_text[:idx_div_start] + new_modal + new_text[idx_end:]
        offset = idx_div_start + len(new_modal)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_text)
        
process_file('src/pages/Competitions.tsx')
process_file('src/pages/Goals.tsx')
process_file('src/pages/Progress.tsx')
process_file('src/pages/Projects.tsx')
process_file('src/pages/Tasks.tsx')
process_file('src/pages/Today.tsx')
print('Forms updated!')
