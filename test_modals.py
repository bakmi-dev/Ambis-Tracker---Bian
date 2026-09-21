import glob, re
for file in glob.glob('src/pages/*.tsx'):
    with open(file, 'r', encoding='utf-8') as f:
        text = f.read()
    print(f"\n--- {file} ---")
    for m in re.finditer(r'<button[^>]*onClick=\{([^}]+)\}[^>]*>(.*?)</button>', text, re.DOTALL):
        btn_text = m.group(2).strip()
        if 'Simpan' in btn_text or 'Tambah' in btn_text or 'OK' in btn_text or 'Log' in btn_text:
            print(m.group(1), btn_text)
