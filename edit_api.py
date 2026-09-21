import re

filepath = r'd:/Study Bian/bian-os/src/api.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

start_req = text.find('async function request<T>')
end_req = text.find('// ==================== TASKS ====================')

new_request = '''async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('ambis_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': Bearer \ } : {}),
    ...options?.headers,
  };

  try {
    const res = await fetch(\\, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('ambis:unauthorized'));
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      let errorMsg = Request failed with status \;
      try {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed.message) errorMsg = parsed.message;
      } catch (e) {
        // ignore parse error
      }
      throw new Error(errorMsg);
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : { success: true, data: [] };
    
    // Toast if backend actually worked
    if (options?.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
      if (options.method === 'DELETE') showToast('Data berhasil dihapus (Cloud)!');
      else if (options.body && Object.keys(JSON.parse(options.body as string)).length > 2) showToast('Data berhasil disimpan (Cloud)!');
      else showToast('Data berhasil diperbarui (Cloud)!');
    }

    return data;
  } catch (error: any) {
    console.error([API Error] \ \:, error.message);
    throw error;
  }
}
'''

text = text[:start_req] + new_request + '\n' + text[end_req:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
