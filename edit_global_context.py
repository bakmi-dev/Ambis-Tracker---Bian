import re

filepath = r'd:/Study Bian/bian-os/src/context/GlobalContext.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Insert the unauthorized handler inside useEffect
unauth_handler = '''
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('ambis:unauthorized', handleUnauthorized);
'''
unauth_cleanup = '''
    window.removeEventListener('ambis:unauthorized', handleUnauthorized);
'''

# Find the existing useEffect for global keyboard shortcuts
use_effect_idx = text.find('// Global Keyboard Shortcuts')
if use_effect_idx != -1:
    end_bracket = text.find('}, []);', use_effect_idx)
    # inject just before the return () =>
    ret_idx = text.rfind('return () =>', use_effect_idx, end_bracket)
    if ret_idx != -1:
        text = text[:ret_idx] + unauth_handler + '    ' + text[ret_idx:end_bracket] + unauth_cleanup + text[end_bracket:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print("GlobalContext updated!")
