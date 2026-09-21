import glob
import re

for filepath in glob.glob('src/pages/*.tsx'):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Find the modal containers
    # usually: <div className="bg-surface-container-low p-6 ... rounded-2xl ...
    # We will search for fixed inset-0, then the inner div.
    for m_inset in re.finditer(r'<div[^>]*fixed inset-0[^>]*>', text):
        # find the immediate inner div
        inner_m = re.search(r'<div[^>]*bg-surface-container-low[^>]*>', text[m_inset.end():m_inset.end()+200])
        if inner_m:
            modal_start = m_inset.end() + inner_m.start()
            
            # find the save button handler
            # search up to 3000 chars
            modal_content = text[modal_start:modal_start+3000]
            
            # Button might be <button onClick={handleSave} ...>Simpan</button>
            # Or <button onClick={() => save()} ...>Simpan</button>
            btn_m = re.search(r'<button[^>]*onClick=\{([^}]+)\}[^>]*>\s*(?:Simpan|Tambah|OK)\s*</button>', modal_content, re.IGNORECASE)
            if not btn_m:
                btn_m = re.search(r'onClick=\{([^}]+)\}[^>]*>\s*(?:Simpan|Tambah|OK)\s*</button>', modal_content, re.IGNORECASE)
                
            handler = btn_m.group(1) if btn_m else "UNKNOWN"
            
            print(f"{filepath}: Found modal at {modal_start}. Handler: {handler}")
